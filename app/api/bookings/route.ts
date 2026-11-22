import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createServerSupabase } from "@/lib/supabase/server";
import { createDepositCheckoutSession } from "@/lib/stripe";
import { sendBookingConfirmationEmail } from "@/lib/resend";
import { getBusinessTimeDetails } from "@/lib/utils";

const BookingRequestSchema = z.object({
  business_id: z.string().uuid("Invalid business ID"),
  service_id: z.string().uuid("Invalid service ID"),
  starts_at: z.string().datetime({ message: "Invalid ISO start time" }),
  customer_name: z.string().min(2, "Name must be at least 2 characters"),
  customer_email: z.string().email("Valid email required"),
  customer_phone: z.string().optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
  payment_method: z.enum(["venue", "card"]).default("venue"),
});

// GET /api/bookings?business_id=UUID: Publicly return busy slot intervals
// Securely bypasses RLS on public clients while returning ZERO customer PII
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const businessId = searchParams.get("business_id");
    const slug = searchParams.get("slug");

    if (!businessId && !slug) {
      return NextResponse.json({ error: "business_id or slug is required" }, { status: 400 });
    }

    const admin: any = createAdminClient();
    let targetBizId = businessId;

    if (!targetBizId && slug) {
      const { data: biz } = await admin
        .from("businesses")
        .select("id")
        .eq("slug", slug)
        .single();
      if (!biz) {
        return NextResponse.json({ error: "Business not found" }, { status: 404 });
      }
      targetBizId = biz.id;
    }

    const { data: bookings, error } = await admin
      .from("bookings")
      .select("starts_at, ends_at, status")
      .eq("business_id", targetBizId)
      .not("status", "in", "('cancelled','no_show')");

    if (error) {
      console.error("[Get Busy Bookings Error]", error);
      return NextResponse.json({ error: "Failed to fetch bookings" }, { status: 500 });
    }

    return NextResponse.json({ bookings: bookings || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/bookings: Validates, calculates interval, checks business hours & persists booking
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.json();
    const parseResult = BookingRequestSchema.safeParse(rawBody);

    if (!parseResult.success) {
      const firstIssue = parseResult.error.issues[0];
      return NextResponse.json(
        { error: `${firstIssue.path.join(".")}: ${firstIssue.message}` },
        { status: 400 }
      );
    }

    const {
      business_id,
      service_id,
      starts_at,
      customer_name,
      customer_email,
      customer_phone,
      notes,
      payment_method,
    } = parseResult.data;

    // 1. Reject appointments booked in the past
    const startDate = new Date(starts_at);
    if (isNaN(startDate.getTime())) {
      return NextResponse.json({ error: "Invalid date format for starts_at" }, { status: 400 });
    }

    // Allow 5 minutes of clock drift / network latency buffer
    if (startDate.getTime() < Date.now() - 5 * 60 * 1000) {
      return NextResponse.json({ error: "Cannot book an appointment in the past" }, { status: 400 });
    }

    const admin: any = createAdminClient();

    // 2. Fetch business and verify active status
    const { data: business, error: bizErr } = await admin
      .from("businesses")
      .select("id, name, slug, timezone, deposit_cents, currency, is_active")
      .eq("id", business_id)
      .single();

    if (bizErr || !business) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }

    if (business.is_active === false) {
      return NextResponse.json(
        { error: "This business is currently not accepting new appointments" },
        { status: 400 }
      );
    }

    // 3. Fetch service and verify active status
    const { data: service, error: svcErr } = await admin
      .from("services")
      .select("id, name, duration_min, price_cents, is_active")
      .eq("id", service_id)
      .eq("business_id", business_id)
      .single();

    if (svcErr || !service) {
      return NextResponse.json({ error: "Service not found for this business" }, { status: 404 });
    }

    if (service.is_active === false) {
      return NextResponse.json(
        { error: "This service is currently inactive and cannot be booked" },
        { status: 400 }
      );
    }

    // 4. Calculate ends_at based on actual service duration
    const endDate = new Date(startDate.getTime() + service.duration_min * 60000);
    const ends_at = endDate.toISOString();

    // 5. Verify booking falls within the business's operating hours in its local timezone
    const businessTz = business.timezone || "Asia/Karachi";
    const { weekday, timeStr: startTimeStr } = getBusinessTimeDetails(startDate, businessTz);
    const { timeStr: endTimeStr } = getBusinessTimeDetails(endDate, businessTz);

    const { data: dayHours } = await admin
      .from("business_hours")
      .select("opens, closes, is_closed")
      .eq("business_id", business_id)
      .eq("weekday", weekday)
      .single();

    if (dayHours) {
      if (dayHours.is_closed) {
        return NextResponse.json(
          { error: `The business is closed on this day (${businessTz})` },
          { status: 400 }
        );
      }

      if (startTimeStr < dayHours.opens || endTimeStr > dayHours.closes) {
        return NextResponse.json(
          { error: `The selected time (${startTimeStr} - ${endTimeStr}) is outside business operating hours (${dayHours.opens} - ${dayHours.closes})` },
          { status: 400 }
        );
      }
    }

    // 6. Resolve staff_id (use real membership user_id if present; do NOT use business_id to avoid FK violation)
    let staffId: string | null = null;
    const { data: memberships } = await admin
      .from("memberships")
      .select("user_id")
      .eq("business_id", business_id)
      .limit(1);

    if (memberships && memberships.length > 0) {
      staffId = memberships[0].user_id;
    }

    // 7. Check if caller is authenticated customer
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

    // 8. Determine booking status
    const isCard = payment_method === "card" && business.deposit_cents > 0;
    const bookingStatus = isCard ? "pending_payment" : "confirmed";
    const depositAmount = isCard ? business.deposit_cents : 0;

    // 9. Insert booking into database
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

    // 10. If Online Card Deposit via Stripe
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

    // 11. If Pay at Venue / Cash on Arrival
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
