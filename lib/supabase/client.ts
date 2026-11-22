import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/^["']|["']$/g, "").trim();
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.replace(/^["']|["']$/g, "").trim();

  if (!supabaseUrl || !supabaseAnonKey) {
    if (typeof window === "undefined") {
      return createBrowserClient<Database>("https://placeholder.supabase.co", "placeholder-anon-key");
    }
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable");
  }

  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
}
