import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = createClient()

    // Check if user is admin
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", session.user.id).single()

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Fetch all API logs with user information
    const { data: logs, error } = await supabase
      .from("api_logs")
      .select(`
        *,
        profiles:user_id (
          display_name,
          email
        )
      `)
      .order("created_at", { ascending: false })
      .limit(500)

    if (error) throw error

    return NextResponse.json({ logs })
  } catch (error) {
    console.error("[v0] [API] Error fetching logs:", error)
    return NextResponse.json(
      { error: "Failed to fetch logs", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
