import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      business_name,
      slug,
      category,
      currency,
      timezone,
      deposit_cents,
      address,
      phone,
      owner_name,
      owner_email,
    } = body;

    if (!business_name || !slug) {
      return NextResponse.json({ error: "Business name and slug are required" }, { status: 400 });
    }

    const admin: any = createAdminClient();

    // 1. Insert into public.businesses
    const { data: business, error: bizError }: any = await (admin.from("businesses") as any)
      .insert({
        name: business_name,
        slug: slug.toLowerCase().trim(),
        category: category || "clinic",
        currency: currency || "PKR",
        timezone: timezone || "Asia/Karachi",
        deposit_cents: deposit_cents || 0,
        address: address || "",
        phone: phone || "",
        is_active: true,
      })
      .select()
      .single();

    if (bizError || !business) {
      console.error("[Business Registration DB Error]", bizError);
      return NextResponse.json({ error: bizError?.message || "Failed to create business" }, { status: 400 });
    }

    // 2. Initialize default Business Hours (Mon - Sat 09:00 - 18:00)
    const hoursToInsert = [
      { business_id: business.id, weekday: 0, opens: "09:00", closes: "18:00", is_closed: true },
      { business_id: business.id, weekday: 1, opens: "09:00", closes: "18:00", is_closed: false },
      { business_id: business.id, weekday: 2, opens: "09:00", closes: "18:00", is_closed: false },
      { business_id: business.id, weekday: 3, opens: "09:00", closes: "18:00", is_closed: false },
      { business_id: business.id, weekday: 4, opens: "09:00", closes: "18:00", is_closed: false },
      { business_id: business.id, weekday: 5, opens: "09:00", closes: "18:00", is_closed: false },
      { business_id: business.id, weekday: 6, opens: "10:00", closes: "17:00", is_closed: false },
    ];
    await (admin.from("business_hours") as any).insert(hoursToInsert);

    // 3. Create a starter service based on category
    const starterPriceCents = currency === "PKR" ? 200000 : 5000; // Rs. 2000 or $50
    await (admin.from("services") as any).insert({
      business_id: business.id,
      name: category === "clinic" ? "Initial Medical Consultation" : "General Appointment",
      description: "Standard initial appointment and consultation session.",
      duration_min: 30,
      price_cents: starterPriceCents,
      is_active: true,
    });

    return NextResponse.json({
      success: true,
      business_id: business.id,
      slug: business.slug,
      name: business.name,
      currency: business.currency,
    });
  } catch (err: any) {
    console.error("[Registration Fatal Error]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
