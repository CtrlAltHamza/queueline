import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/^["']|["']$/g, "").trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/^["']|["']$/g, "").trim();

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variable");
  }

  return createSupabaseClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
