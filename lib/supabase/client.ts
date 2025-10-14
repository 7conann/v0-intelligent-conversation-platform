import { createBrowserClient } from "@supabase/ssr"
import type { SupabaseClient } from "@supabase/supabase-js"

let supabaseClient: SupabaseClient | null = null

const STORAGE_KEY = "supabase_credentials"

function getStoredCredentials() {
  if (typeof window === "undefined") return null
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : null
  } catch {
    return null
  }
}

function storeCredentials(url: string, key: string) {
  if (typeof window === "undefined") return
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ url, key }))
  } catch {
    // Ignore storage errors
  }
}

export function createClient() {
  // Return cached client if it exists
  if (supabaseClient) {
    console.log("[v0] Returning cached Supabase client")
    return supabaseClient
  }

  // Only run on client side
  if (typeof window === "undefined") {
    throw new Error("Supabase client can only be created on the client side")
  }

  // Try to get environment variables from multiple sources
  let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  let supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    console.log("[v0] Environment variables not found, checking sessionStorage...")
    const stored = getStoredCredentials()
    if (stored) {
      supabaseUrl = stored.url
      supabaseAnonKey = stored.key
      console.log("[v0] Loaded credentials from sessionStorage")
    }
  } else {
    console.log("[v0] Storing credentials in sessionStorage for future use")
    storeCredentials(supabaseUrl, supabaseAnonKey)
  }

  console.log("[v0] Creating Supabase client with:", {
    url: supabaseUrl ? "✓ URL present" : "✗ URL missing",
    key: supabaseAnonKey ? "✓ Key present" : "✗ Key missing",
    source: supabaseUrl && process.env.NEXT_PUBLIC_SUPABASE_URL ? "env" : "storage",
  })

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("[v0] Missing Supabase credentials. Available env keys:", Object.keys(process.env))
    throw new Error(
      "Missing Supabase credentials. Please ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set.",
    )
  }

  // Create and cache the client
  supabaseClient = createBrowserClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: window.localStorage,
    },
  })

  console.log("[v0] Supabase client created successfully")
  return supabaseClient
}
