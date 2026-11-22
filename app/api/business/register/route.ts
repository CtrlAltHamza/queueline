import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createServerSupabase } from "@/lib/supabase/server";

const RegisterBusinessSchema = z.object({
  business_name: z.string().min(2, "Business name must be at least 2 characters"),
  slug: z.string().min(2, "Slug must be at least 2 characters"),
  category: z.string().default("clinic"),
  currency: z.string().default("PKR"),
  timezone: z.string().default("Asia/Karachi"),
  deposit_cents: z.number().int().min(0).default(0),
  address: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
});

export async function POST(req: NextRequest) {
  try {
    // 1. Enforce Authentication Check: Caller must be a verified logged-in user
    let user: any = null;
    try {
      const serverSupabase: any = await createServerSupabase();
      const { data: authData, error: authError } = await serverSupabase.auth.getUser();
      if (!authError && authData?.user) {
        user = authData.user;
      }
    } catch (authErr) {
      console.error("[Register Business Auth Check]", authErr);
    }

    if (!user) {
      return NextResponse.json(
        {
          error: "Authentication required. Please sign in or create an account before registering your business.",
          code: "UNAUTHENTICATED",
        },
        { status: 401 }
      );
    }

    const rawBody = await req.json();
    const parseResult = RegisterBusinessSchema.safeParse(rawBody);

    if (!parseResult.success) {
      const firstIssue = parseResult.error.issues[0];
      return NextResponse.json(
        { error: `${firstIssue.path.join(".")}: ${firstIssue.message}` },
        { status: 400 }
      );
    }

    const {
      business_name,
      slug,
      category,
      currency,
      timezone,
      deposit_cents,
      address,
      phone,
    } = parseResult.data;

    const admin: any = createAdminClient();
    const cleanSlug = slug.toLowerCase().trim().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");

    // 2. Ensure Profile exists in public.profiles for the logged in user
    const userEmail = user.email || "";
    const userName = user.user_metadata?.full_name || user.user_metadata?.name || userEmail.split("@")[0] || "Business Owner";

    const { error: profileError } = await admin.from("profiles").upsert(
      {
        id: user.id,
        name: userName,
        email: userEmail,
        phone: phone || user.phone || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );

    if (profileError) {
      console.error("[Profile Upsert Error]", profileError);
    }

    // 3. Insert Business into public.businesses
    const { data: business, error: bizError } = await admin
      .from("businesses")
      .insert({
        name: business_name,
        slug: cleanSlug,
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
      if (bizError?.code === "23505" || bizError?.message?.includes("unique")) {
        return NextResponse.json(
          { error: `The URL slug '/b/${cleanSlug}' is already taken. Please choose another.` },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: bizError?.message || "Failed to create business" }, { status: 400 });
    }

    // 4. CRITICAL: Insert Owner Membership in public.memberships
    // Fail closed: If membership insert fails, delete the created business to prevent orphan tenants
    const { error: memberError } = await admin.from("memberships").insert({
      business_id: business.id,
      user_id: user.id,
      role: "owner",
      display_title: "Owner & Lead Director",
    });

    if (memberError) {
      console.error("[Membership Insert Failed - Rolling back business creation]", memberError);
      await admin.from("businesses").delete().eq("id", business.id);
      return NextResponse.json(
        { error: "Failed to establish business owner membership. Please try again." },
        { status: 500 }
      );
    }

    // 5. Initialize Default Weekly Business Hours (Mon - Sat 09:00 - 18:00, Sun closed)
    const hoursToInsert = [
      { business_id: business.id, weekday: 0, opens: "09:00", closes: "18:00", is_closed: true },
      { business_id: business.id, weekday: 1, opens: "09:00", closes: "18:00", is_closed: false },
      { business_id: business.id, weekday: 2, opens: "09:00", closes: "18:00", is_closed: false },
      { business_id: business.id, weekday: 3, opens: "09:00", closes: "18:00", is_closed: false },
      { business_id: business.id, weekday: 4, opens: "09:00", closes: "18:00", is_closed: false },
      { business_id: business.id, weekday: 5, opens: "09:00", closes: "19:00", is_closed: false },
      { business_id: business.id, weekday: 6, opens: "10:00", closes: "17:00", is_closed: false },
    ];
    await admin.from("business_hours").insert(hoursToInsert);

    // 6. Create Default Starter Service
    const starterPriceCents = currency === "PKR" ? 200000 : 5000; // Rs. 2,000 or $50
    await admin.from("services").insert({
      business_id: business.id,
      name: category === "clinic" ? "Initial Medical Consultation" : "General Appointment",
      description: "Standard initial consultation and appointment session.",
      duration_min: 30,
      price_cents: starterPriceCents,
      is_active: true,
    });

    return NextResponse.json({
      success: true,
      business,
      message: `Business ${business.name} successfully registered. Owner role granted.`,
    });
  } catch (err: any) {
    console.error("[Business Registration Fatal Error]", err);
    return NextResponse.json({ error: err.message || "An unexpected error occurred" }, { status: 500 });
  }
}
