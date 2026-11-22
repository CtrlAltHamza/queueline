import { NextRequest, NextResponse } from "next/server";
import { createDepositCheckoutSession } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      business_id,
      business_name,
      service_id,
      service_name,
      deposit_cents,
      starts_at,
      customer_name,
      customer_email,
      customer_phone,
      notes,
    } = body;

    const origin = req.headers.get("origin") || req.nextUrl.origin || "http://localhost:3000";
    const bookingId = `book_${Date.now()}`;

    const session = await createDepositCheckoutSession({
      bookingId,
      businessName: business_name || "Clinic",
      serviceName: service_name || "Appointment",
      depositCents: deposit_cents || 2500,
      customerEmail: customer_email,
      origin,
    });

    return NextResponse.json({
      success: true,
      booking_id: bookingId,
      url: session.url,
      session_id: session.id,
    });
  } catch (error: any) {
    console.error("[Stripe Checkout Session API Error]", error);
    return NextResponse.json({ error: error.message || "Failed to create checkout session" }, { status: 500 });
  }
}
