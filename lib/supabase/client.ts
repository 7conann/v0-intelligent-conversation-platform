import { createBrowserClient } from "@supabase/ssr"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export function createClient() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error("[v0] Supabase credentials missing:", {
      hasUrl: !!SUPABASE_URL,
      hasAnonKey: !!SUPABASE_ANON_KEY,
      urlValue: SUPABASE_URL || "missing",
      anonKeyValue: SUPABASE_ANON_KEY ? "present" : "missing",
    })
    throw new Error(
      "Supabase is not configured. Please ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set.",
    )
  }

  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY)
}
