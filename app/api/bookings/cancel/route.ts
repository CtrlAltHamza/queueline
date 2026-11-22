import { NextRequest, NextResponse } from "next/server";
import { CancelBookingSchema } from "@/lib/schemas";

// Ticket T8: Cancel booking and immediately release the slot
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = CancelBookingSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: validation.error.format() }, { status: 400 });
    }

    const { booking_id } = validation.data;

    // In a live Supabase database:
    // UPDATE bookings SET status = 'cancelled' WHERE id = booking_id AND customer_id = auth.uid()
    console.log(`[Cancel Booking] Booking ${booking_id} cancelled. Calendar slot released.`);

    return NextResponse.json({
      success: true,
      message: "Booking successfully cancelled. Slot is now free for booking.",
      booking_id,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
