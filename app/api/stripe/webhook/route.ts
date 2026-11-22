import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { sendBookingConfirmationEmail } from "@/lib/resend";
import { createAdminClient } from "@/lib/supabase/admin";

// Ticket T6 & T7: Fully Integrated Idempotent Stripe Webhook Handler
export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event: any;

  try {
    if (webhookSecret && sig) {
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    } else if (process.env.NODE_ENV !== "production" && !webhookSecret) {
      // Allow development / simulated test event only when secret is not configured
      event = JSON.parse(body);
    } else {
      return NextResponse.json(
        { error: "Stripe signature or webhook secret is missing" },
        { status: 400 }
      );
    }
  } catch (err: any) {
    console.error(`[Stripe Webhook] Signature verification failed:`, err.message);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  const admin: any = createAdminClient();

  // 1. Idempotency Check via public.stripe_events table
  if (event.id) {
    const { data: existingEvent } = await admin
      .from("stripe_events")
      .select("id")
      .eq("id", event.id)
      .single();

    if (existingEvent) {
      console.log(`[Stripe Webhook] Event ${event.id} already processed. Skipping.`);
      return NextResponse.json({ received: true, duplicate: true });
    }

    // Record event to guarantee at-most-once execution
    await admin.from("stripe_events").insert({
      id: event.id,
      type: event.type,
    });
  }

  // 2. Handle checkout.session.completed -> Confirm booking & persist to DB
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const bookingId = session.metadata?.booking_id;

    if (!bookingId) {
      console.warn("[Stripe Webhook] Received checkout.session.completed without booking_id in metadata");
      return NextResponse.json({ received: true });
    }

    console.log(`[Stripe Webhook] Confirming booking ${bookingId} for session ${session.id}`);

    // Update booking status from 'pending_payment' to 'confirmed'
    const { data: updatedBooking, error: updateError } = await admin
      .from("bookings")
      .update({
        status: "confirmed",
        stripe_session_id: session.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", bookingId)
      .select("*, businesses(name, currency), services(name)")
      .single();

    if (updateError) {
      console.error(`[Stripe Webhook] Failed to confirm booking ${bookingId} in database:`, updateError);
    }

    // Send confirmation email with real business & service names
    const customerEmail = session.customer_details?.email || session.customer_email || updatedBooking?.customer_email;
    const customerName = session.customer_details?.name || updatedBooking?.customer_name || "Valued Client";

    if (customerEmail) {
      try {
        await sendBookingConfirmationEmail({
          to: customerEmail,
          customerName,
          businessName: updatedBooking?.businesses?.name || "Business",
          serviceName: updatedBooking?.services?.name || "Service Appointment",
          startsAt: updatedBooking?.starts_at || new Date().toISOString(),
          depositCents: session.amount_total || updatedBooking?.deposit_amount_cents || 0,
          bookingId: bookingId,
        });
      } catch (emailErr) {
        console.error("[Stripe Webhook] Confirmation email dispatch failed silently:", emailErr);
      }
    }
  }

  // 3. Handle checkout.session.expired -> Release the reserved slot to prevent ghost bookings
  if (event.type === "checkout.session.expired") {
    const session = event.data.object;
    const bookingId = session.metadata?.booking_id;

    if (bookingId) {
      console.log(`[Stripe Webhook] Checkout expired for booking ${bookingId}. Releasing held slot.`);
      await admin
        .from("bookings")
        .update({
          status: "cancelled",
          notes: "Payment checkout expired before completion. Slot released.",
          updated_at: new Date().toISOString(),
        })
        .eq("id", bookingId)
        .eq("status", "pending_payment");
    }
  }

  return NextResponse.json({ received: true });
}

// Support test redirect via GET
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const bookingId = searchParams.get("booking_id") || `mock-${Date.now()}`;
  return NextResponse.redirect(new URL(`/b/glow-clinic/success?booking_id=${bookingId}`, req.url));
}
