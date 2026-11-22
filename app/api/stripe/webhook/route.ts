import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { sendBookingConfirmationEmail } from "@/lib/resend";
import { createAdminClient } from "@/lib/supabase/admin";

// Ticket T6 & T7: Hardened Idempotent Stripe Webhook Handler
export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event: any;

  try {
    if (webhookSecret && sig) {
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    } else if (process.env.NODE_ENV !== "production" && !webhookSecret) {
      // Local dev / test payloads without secret
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

  // 1. Process Event
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
      console.error(`[Stripe Webhook] DB update failed for booking ${bookingId}:`, updateError);
      // Return 500 so Stripe automatically retries delivery
      return NextResponse.json({ error: "Failed to persist booking confirmation to database" }, { status: 500 });
    }

    // Send confirmation email asynchronously (failure does not reject webhook)
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
  } else if (event.type === "checkout.session.expired") {
    const session = event.data.object;
    const bookingId = session.metadata?.booking_id;

    if (bookingId) {
      console.log(`[Stripe Webhook] Checkout expired for booking ${bookingId}. Releasing held slot.`);
      const { error: expireError } = await admin
        .from("bookings")
        .update({
          status: "cancelled",
          notes: "Payment checkout expired before completion. Slot released.",
          updated_at: new Date().toISOString(),
        })
        .eq("id", bookingId)
        .eq("status", "pending_payment");

      if (expireError) {
        console.error(`[Stripe Webhook] Failed to release slot for expired session ${bookingId}:`, expireError);
        return NextResponse.json({ error: "Failed to release held slot" }, { status: 500 });
      }
    }
  }

  // 2. Record event in stripe_events AFTER successful processing
  // Let unique-constraint conflict handle duplicate events atomically
  if (event.id) {
    const { error: insertError } = await admin.from("stripe_events").insert({
      id: event.id,
      event_type: event.type,
      data: event.data || {},
    });

    if (insertError) {
      // 23505 = Postgres unique violation (already processed concurrently)
      if (insertError.code === "23505") {
        console.log(`[Stripe Webhook] Event ${event.id} already recorded. Handled duplicate atomically.`);
        return NextResponse.json({ received: true, duplicate: true });
      }
      console.warn("[Stripe Webhook] Non-fatal error recording stripe_events row:", insertError);
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
