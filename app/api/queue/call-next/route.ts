import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createServerSupabase } from "@/lib/supabase/server";

// Ticket T9 & T10: Staff Call Next Live Queue Endpoint - STRICTLY AUTHORIZED
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { ticket_id, business_id } = body;

    // 1. Enforce Authentication Check
    const serverSupabase: any = await createServerSupabase();
    const { data: authData, error: authError } = await serverSupabase.auth.getUser();

    if (authError || !authData?.user) {
      return NextResponse.json(
        { error: "Authentication required. Please sign in as staff or owner to manage queue." },
        { status: 401 }
      );
    }

    const userId = authData.user.id;
    const admin: any = createAdminClient();

    let targetTicketId = ticket_id;
    let targetBusinessId = business_id;

    // If ticket_id provided, look up its business_id
    if (targetTicketId) {
      const { data: ticket, error: ticketErr } = await admin
        .from("queue_entries")
        .select("id, business_id, ticket_no")
        .eq("id", targetTicketId)
        .single();

      if (ticketErr || !ticket) {
        return NextResponse.json({ error: "Queue ticket not found" }, { status: 404 });
      }
      targetBusinessId = ticket.business_id;
    }

    if (!targetBusinessId) {
      return NextResponse.json({ error: "ticket_id or business_id is required" }, { status: 400 });
    }

    // 2. Strict Role Authorization Check:
    // Caller must have role 'owner' or 'staff' for THIS specific business
    const { data: membership } = await admin
      .from("memberships")
      .select("role")
      .eq("business_id", targetBusinessId)
      .eq("user_id", userId)
      .in("role", ["owner", "staff"])
      .maybeSingle();

    if (!membership) {
      return NextResponse.json(
        { error: "Forbidden: You are not authorized to manage the queue for this business." },
        { status: 403 }
      );
    }

    // 3. If ticket_id was not passed, find the next waiting ticket in order
    if (!targetTicketId) {
      const { data: nextWaiting } = await admin
        .from("queue_entries")
        .select("id, ticket_no, customer_name")
        .eq("business_id", targetBusinessId)
        .eq("status", "waiting")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (nextWaiting) {
        targetTicketId = nextWaiting.id;
      } else {
        return NextResponse.json(
          { message: "No customers currently waiting in the live queue" },
          { status: 200 }
        );
      }
    }

    // 4. Update ticket status to 'called' in Supabase
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

    console.log(`[Queue Call Next] Ticket ${updatedEntry.ticket_no} summoned by staff ${userId}.`);

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
