import { createBrowserClient } from "@supabase/ssr"

export function createClient(url?: string, anonKey?: string) {
  const supabaseUrl = url || process.env.NEXT_PUBLIC_SUPABASE_URL || ""
  const supabaseAnonKey = anonKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("[v0] Supabase credentials missing:", {
      hasUrl: !!supabaseUrl,
      hasAnonKey: !!supabaseAnonKey,
      urlValue: supabaseUrl || "missing",
      anonKeyValue: supabaseAnonKey ? "present" : "missing",
    })
    throw new Error(
      "Supabase is not configured. Please ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set.",
    )
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}
