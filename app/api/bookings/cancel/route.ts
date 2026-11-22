import { NextRequest, NextResponse } from "next/server";
import { CancelBookingSchema } from "@/lib/schemas";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createServerSupabase } from "@/lib/supabase/server";

// Ticket T8: Cancel booking and release slot - STRICTLY AUTHORIZED
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = CancelBookingSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: validation.error.format() }, { status: 400 });
    }

    const { booking_id } = validation.data;

    // 1. Enforce Authentication Check
    const serverSupabase: any = await createServerSupabase();
    const { data: authData, error: authError } = await serverSupabase.auth.getUser();

    if (authError || !authData?.user) {
      return NextResponse.json(
        { error: "Authentication required. Please sign in to cancel your booking." },
        { status: 401 }
      );
    }

    const userId = authData.user.id;
    const admin: any = createAdminClient();

    // 2. Fetch the booking
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

    // 3. Strict Authorization Check:
    // Either the caller is the customer who made the booking,
    // OR the caller is a verified owner/staff member of that business.
    const isCustomer = booking.customer_id === userId;

    if (!isCustomer) {
      const { data: membership } = await admin
        .from("memberships")
        .select("role")
        .eq("business_id", booking.business_id)
        .eq("user_id", userId)
        .in("role", ["owner", "staff"])
        .maybeSingle();

      if (!membership) {
        return NextResponse.json(
          { error: "Forbidden: You do not have permission to cancel this booking." },
          { status: 403 }
        );
      }
    }

    // 4. Update status to cancelled in database, freeing the slot
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

    console.log(`[Cancel Booking] Booking ${booking_id} cancelled by authorized user ${userId}. Slot released.`);

    return NextResponse.json({
      success: true,
      message: "Booking successfully cancelled. Slot is now free for booking.",
      booking_id,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
