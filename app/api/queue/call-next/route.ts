import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createServerSupabase } from "@/lib/supabase/server";

// Ticket T9 & T10: Staff Call Next Live Queue Endpoint - Persists to Supabase Realtime
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { ticket_id, business_id } = body;

    const admin: any = createAdminClient();

    let targetTicketId = ticket_id;

    // If ticket_id not passed, find the next waiting ticket for the business
    if (!targetTicketId && business_id) {
      const { data: nextWaiting } = await admin
        .from("queue_entries")
        .select("id, ticket_no, customer_name")
        .eq("business_id", business_id)
        .eq("status", "waiting")
        .order("created_at", { ascending: true })
        .limit(1)
        .single();

      if (nextWaiting) {
        targetTicketId = nextWaiting.id;
      } else {
        return NextResponse.json(
          { message: "No customers currently waiting in the live queue" },
          { status: 200 }
        );
      }
    }

    if (!targetTicketId) {
      return NextResponse.json({ error: "ticket_id or business_id is required" }, { status: 400 });
    }

    // Update ticket status to 'called' in Supabase
    const { data: updatedEntry, error: updateError } = await admin
      .from("queue_entries")
      .update({
        status: "called",
        called_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", targetTicketId)
      .select()
      .single();

    if (updateError) {
      console.error("[Queue Call Next DB Error]", updateError);
      return NextResponse.json({ error: "Failed to update queue ticket" }, { status: 500 });
    }

    console.log(`[Queue Call Next] Ticket ${updatedEntry.ticket_no} (${updatedEntry.id}) summoned.`);

    return NextResponse.json({
      success: true,
      entry: updatedEntry,
      ticket_id: updatedEntry.id,
      ticket_no: updatedEntry.ticket_no,
      status: "called",
      called_at: updatedEntry.called_at,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
