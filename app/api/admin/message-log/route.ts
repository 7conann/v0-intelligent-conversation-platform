import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { isAdminUser } from "@/lib/utils/trial"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session || !isAdminUser(session.user.email || "")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const messageId = searchParams.get("messageId")

    if (!messageId) {
      return NextResponse.json({ error: "Message ID required" }, { status: 400 })
    }

    const { data: logs, error } = await supabase
      .from("api_logs")
      .select("*")
      .eq("message_id", messageId)
      .order("created_at", { ascending: false })
      .limit(1)

    if (error) {
      console.error("[v0] Error fetching log:", error)
      return NextResponse.json({ error: "Error fetching log" }, { status: 500 })
    }

    if (!logs || logs.length === 0) {
      return NextResponse.json({ log: null }, { status: 200 })
    }

    return NextResponse.json({ log: logs[0] })
  } catch (error) {
    console.error("[v0] Error in message log API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
