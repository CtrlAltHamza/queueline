import { NextRequest, NextResponse } from "next/server";

// Ticket T9 & T10: Staff Call Next Live Queue Endpoint
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { ticket_id, ticket_no } = body;

    console.log(`[Queue Call Next] Ticket ${ticket_no} (${ticket_id}) summoned to service counter.`);

    return NextResponse.json({
      success: true,
      ticket_id,
      ticket_no,
      status: "called",
      called_at: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
