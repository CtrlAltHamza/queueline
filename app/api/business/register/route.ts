import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createServerSupabase } from "@/lib/supabase/server";

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
      owner_password,
    } = body;

    if (!business_name || !slug) {
      return NextResponse.json({ error: "Business name and slug are required" }, { status: 400 });
    }

    const admin: any = createAdminClient();

    // 1. Resolve or Create the Owner User Account
    let ownerUserId: string | null = null;

    // Check if the caller is already logged in
    try {
      const serverSupabase: any = await createServerSupabase();
      const { data: authData } = await serverSupabase.auth.getUser();
      if (authData?.user) {
        ownerUserId = authData.user.id;
      }
    } catch (e) {}

    // If caller is registering fresh with owner_email & owner_password
    if (!ownerUserId) {
      if (!owner_email || !owner_password) {
        return NextResponse.json(
          { error: "Owner email and password are required to create an owner account." },
          { status: 400 }
        );
      }

      // Try creating user in Supabase Auth
      const { data: newUser, error: createError } = await admin.auth.admin.createUser({
        email: owner_email,
        password: owner_password,
        email_confirm: true,
        user_metadata: {
          full_name: owner_name || "Business Owner",
          phone: phone || null,
        },
      });

      if (createError) {
        // If user already registered, look them up or request login
        if (createError.message?.toLowerCase().includes("already registered") || createError.message?.toLowerCase().includes("exists")) {
          // Find user by email
          const { data: listData } = await admin.auth.admin.listUsers();
          const existingUser = listData?.users?.find((u: any) => u.email === owner_email);
          if (existingUser) {
            ownerUserId = existingUser.id;
          } else {
            return NextResponse.json(
              { error: "An account with this email already exists. Please sign in first, then register your business." },
              { status: 409 }
            );
          }
        } else {
          console.error("[Create Owner Auth Error]", createError);
          return NextResponse.json({ error: createError.message }, { status: 400 });
        }
      } else if (newUser?.user) {
        ownerUserId = newUser.user.id;
      }
    }

    if (!ownerUserId) {
      return NextResponse.json({ error: "Could not establish owner identity." }, { status: 400 });
    }

    // 2. Ensure Profile exists in public.profiles
    await admin.from("profiles").upsert({
      id: ownerUserId,
      name: owner_name || "Business Owner",
      email: owner_email || null,
      phone: phone || null,
    });

    // 3. Insert Business into public.businesses
    const cleanSlug = slug.toLowerCase().trim().replace(/[^a-z0-9-]+/g, "-");
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
      return NextResponse.json({ error: bizError?.message || "Failed to create business" }, { status: 400 });
    }

    // 4. CRITICAL: Insert Owner Membership in public.memberships
    // This allows the owner to pass RLS has_role(business_id, ['owner']) checks
    const { error: memberError } = await admin.from("memberships").insert({
      business_id: business.id,
      user_id: ownerUserId,
      role: "owner",
      display_title: "Owner & Lead Director",
    });

    if (memberError) {
      console.error("[Membership Insert Error]", memberError);
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

    // 6. Create Starter Service
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
      business_id: business.id,
      slug: business.slug,
      name: business.name,
      currency: business.currency,
    });
  } catch (err: any) {
    console.error("[Registration Fatal Error]", err);
    return NextResponse.json({ error: err.message || "An unexpected error occurred" }, { status: 500 });
  }
}
