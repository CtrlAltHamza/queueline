import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createServerSupabase } from "@/lib/supabase/server";
import { createDepositCheckoutSession } from "@/lib/stripe";
import { sendBookingConfirmationEmail } from "@/lib/resend";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      business_id,
      service_id,
      starts_at,
      customer_name,
      customer_email,
      customer_phone,
      notes,
      payment_method = "venue",
    } = body;

    if (!business_id || !service_id || !starts_at || !customer_name || !customer_email) {
      return NextResponse.json(
        { error: "Missing required booking details (business, service, time, name, or email)" },
        { status: 400 }
      );
    }

    const admin: any = createAdminClient();

    // 1. Fetch business details
    const { data: business, error: bizErr } = await admin
      .from("businesses")
      .select("id, name, slug, timezone, deposit_cents, currency, is_active")
      .eq("id", business_id)
      .single();

    if (bizErr || !business) {
      return NextResponse.json({ error: "Business not found or inactive" }, { status: 404 });
    }

    // 2. Fetch service details
    const { data: service, error: svcErr } = await admin
      .from("services")
      .select("id, name, duration_min, price_cents, is_active")
      .eq("id", service_id)
      .eq("business_id", business_id)
      .single();

    if (svcErr || !service) {
      return NextResponse.json({ error: "Service not found for this business" }, { status: 404 });
    }

    // 3. Calculate ends_at based on actual service duration
    const startDate = new Date(starts_at);
    const endDate = new Date(startDate.getTime() + service.duration_min * 60000);
    const ends_at = endDate.toISOString();

    // 4. Resolve staff_id to ensure Postgres exclusion constraint triggers for double-bookings
    let staffId: string | null = null;
    const { data: memberships } = await admin
      .from("memberships")
      .select("user_id")
      .eq("business_id", business_id)
      .limit(1);

    if (memberships && memberships.length > 0) {
      staffId = memberships[0].user_id;
    } else {
      // Fallback to a deterministic business practitioner ID if no membership created yet
      staffId = business_id;
    }

    // 5. Check if caller is authenticated customer
    let customerId: string | null = null;
    try {
      const serverSupabase: any = await createServerSupabase();
      const { data: authData } = await serverSupabase.auth.getUser();
      if (authData?.user) {
        customerId = authData.user.id;
      }
    } catch (e) {
      // Guest booking
    }

    // 6. Determine booking status
    // 'venue': confirmed immediately, reserving the slot
    // 'card': pending_payment until Stripe webhook confirms
    const isCard = payment_method === "card" && business.deposit_cents > 0;
    const bookingStatus = isCard ? "pending_payment" : "confirmed";
    const depositAmount = isCard ? business.deposit_cents : 0;

    // 7. Insert booking into database
    const { data: booking, error: insertError } = await admin
      .from("bookings")
      .insert({
        business_id: business.id,
        service_id: service.id,
        staff_id: staffId,
        customer_id: customerId,
        customer_name,
        customer_email,
        customer_phone: customer_phone || null,
        starts_at,
        ends_at,
        status: bookingStatus,
        deposit_amount_cents: depositAmount,
        notes: notes || null,
      })
      .select()
      .single();

    if (insertError) {
      console.error("[Booking Insert Error]", insertError);

      // Check for Postgres Exclusion Constraint violation (Postgres error 23P01)
      if (
        insertError.code === "23P01" ||
        insertError.message?.toLowerCase().includes("exclude") ||
        insertError.message?.toLowerCase().includes("no_overlapping") ||
        insertError.message?.toLowerCase().includes("overlap")
      ) {
        return NextResponse.json(
          {
            error: "That time slot was just taken by another customer. Please select another slot.",
            code: "SLOT_CONFLICT",
          },
          { status: 409 }
        );
      }

      return NextResponse.json({ error: insertError.message || "Failed to reserve slot" }, { status: 500 });
    }

    // 8. If Online Card Deposit via Stripe
    if (isCard) {
      const origin = req.headers.get("origin") || req.nextUrl.origin || "http://localhost:3000";
      const session = await createDepositCheckoutSession({
        bookingId: booking.id,
        businessName: business.name,
        serviceName: service.name,
        depositCents: business.deposit_cents,
        currency: business.currency || "usd",
        customerEmail: customer_email,
        origin,
      });

      return NextResponse.json({
        success: true,
        booking,
        url: session.url,
      });
    }

    // 9. If Pay at Venue / Cash on Arrival
    // Asynchronously send confirmation email (failures never break the booking)
    try {
      await sendBookingConfirmationEmail({
        to: customer_email,
        customerName: customer_name,
        businessName: business.name,
        serviceName: service.name,
        startsAt: starts_at,
        depositCents: 0,
        bookingId: booking.id,
      });
    } catch (emailErr) {
      console.error("[Email Notification Error]", emailErr);
    }

    return NextResponse.json({
      success: true,
      booking,
      redirect_url: `/b/${business.slug}/success?booking_id=${booking.id}&venue=true`,
    });
  } catch (err: any) {
    console.error("[Booking Fatal Error]", err);
    return NextResponse.json({ error: err.message || "An unexpected error occurred" }, { status: 500 });
  }
}
