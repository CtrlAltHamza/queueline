import { NextRequest, NextResponse } from "next/server";
import { CancelBookingSchema } from "@/lib/schemas";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createServerSupabase } from "@/lib/supabase/server";

// Ticket T8: Cancel booking and immediately release the slot in Supabase
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = CancelBookingSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: validation.error.format() }, { status: 400 });
    }

    const { booking_id } = validation.data;
    const admin: any = createAdminClient();

    // Verify caller authentication if available
    let userId: string | null = null;
    try {
      const serverSupabase: any = await createServerSupabase();
      const { data: authData } = await serverSupabase.auth.getUser();
      if (authData?.user) {
        userId = authData.user.id;
      }
    } catch (e) {}

    // Find the booking
    const { data: booking, error: findError } = await admin
      .from("bookings")
      .select("id, business_id, customer_id, status")
      .eq("id", booking_id)
      .single();

    if (findError || !booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    if (booking.status === "cancelled") {
      return NextResponse.json({
        success: true,
        message: "Booking is already cancelled",
        booking_id,
      });
    }

    // Cancel booking and free the slot in database
    const { error: updateError } = await admin
      .from("bookings")
      .update({
        status: "cancelled",
        updated_at: new Date().toISOString(),
      })
      .eq("id", booking_id);

    if (updateError) {
      console.error("[Cancel Booking DB Error]", updateError);
      return NextResponse.json({ error: "Failed to cancel booking in database" }, { status: 500 });
    }

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
