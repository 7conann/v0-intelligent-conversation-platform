import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { searchParams } = new URL(request.url)
    const conversationId = searchParams.get("conversationId")

    if (!conversationId) {
      return NextResponse.json({ error: "Conversation ID required" }, { status: 400 })
    }

    console.log("[v0] [API] Fetching messages for conversation:", conversationId)

    const supabase = createAdminClient()

    const { data: messagesData, error } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })

    if (error) {
      console.error("[v0] [API] Error fetching messages:", error)
      return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 })
    }

    console.log("[v0] [API] Messages found:", messagesData?.length || 0)

    return NextResponse.json({ messages: messagesData || [] })
  } catch (error) {
    console.error("[v0] [API] Error in messages:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
