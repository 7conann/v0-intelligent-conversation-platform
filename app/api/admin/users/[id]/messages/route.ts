import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"
import { isAdminUser } from "@/lib/utils/trial"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { searchParams } = new URL(request.url)
    const conversationId = searchParams.get("conversationId")

    if (!conversationId) {
      return NextResponse.json({ error: "Conversation ID required" }, { status: 400 })
    }

    const cookieStore = await cookies()

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          },
        },
      },
    )

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session || !isAdminUser(session.user.email || "")) {
      console.log("[v0] [API] Unauthorized access attempt to messages")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[v0] [API] Fetching messages for conversation:", conversationId)

    const adminClient = createAdminClient()

    const { data: messagesData, error } = await adminClient
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })

    if (error) {
      console.error("[v0] [API] Error fetching messages:", error)
      return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 })
    }

    const agentIds = messagesData?.filter((m) => m.agent_id).map((m) => m.agent_id) || []
    const uniqueAgentIds = [...new Set(agentIds)]

    let agentsMap: Record<string, { id: string; name: string; color: string }> = {}

    if (uniqueAgentIds.length > 0) {
      const { data: agentsData } = await adminClient.from("agents").select("id, name, color").in("id", uniqueAgentIds)

      if (agentsData) {
        agentsMap = Object.fromEntries(agentsData.map((agent) => [agent.id, agent]))
      }
    }

    const messagesWithAgents = messagesData?.map((msg) => ({
      ...msg,
      agents: msg.agent_id ? agentsMap[msg.agent_id] : null,
    }))

    console.log("[v0] [API] Messages found:", messagesWithAgents?.length || 0)

    return NextResponse.json({ messages: messagesWithAgents || [] })
  } catch (error) {
    console.error("[v0] [API] Error in messages:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
