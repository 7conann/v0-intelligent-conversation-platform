import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"
import { isAdminUser } from "@/lib/utils/trial"

export async function GET(request: Request) {
  try {
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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const adminClient = createAdminClient()

    // Fetch messages with dates
    const { data: messages } = await adminClient
      .from("messages")
      .select("created_at, agent_ids")
      .order("created_at", { ascending: true })

    // Fetch conversations with dates
    const { data: conversations } = await adminClient
      .from("conversations")
      .select("created_at, user_id")
      .order("created_at", { ascending: true })

    // Fetch agents for mapping
    const { data: agents } = await adminClient
      .from("agents")
      .select("id, name")

    // Fetch profiles for user names
    const { data: profiles } = await adminClient
      .from("profiles")
      .select("id, display_name, email")

    // Process messages per day
    const messagesPerDay: { [key: string]: number } = {}
    messages?.forEach(msg => {
      const date = new Date(msg.created_at).toISOString().split('T')[0]
      messagesPerDay[date] = (messagesPerDay[date] || 0) + 1
    })

    const messagesPerDayArray = Object.entries(messagesPerDay)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date))

    // Process conversations per day
    const conversationsPerDay: { [key: string]: number } = {}
    conversations?.forEach(conv => {
      const date = new Date(conv.created_at).toISOString().split('T')[0]
      conversationsPerDay[date] = (conversationsPerDay[date] || 0) + 1
    })

    const conversationsPerDayArray = Object.entries(conversationsPerDay)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date))

    // Process agent usage
    const agentUsageMap: { [key: string]: number } = {}
    messages?.forEach(msg => {
      if (msg.agent_ids && Array.isArray(msg.agent_ids)) {
        msg.agent_ids.forEach((agentId: string) => {
          agentUsageMap[agentId] = (agentUsageMap[agentId] || 0) + 1
        })
      }
    })

    const agentUsage = Object.entries(agentUsageMap)
      .map(([agentId, count]) => {
        const agent = agents?.find(a => a.id === agentId)
        return {
          agent_name: agent?.name || agentId,
          count
        }
      })
      .sort((a, b) => b.count - a.count)

    // Process user activity
    const userActivityMap: { [key: string]: { messages: number, conversations: Set<string> } } = {}
    
    messages?.forEach(msg => {
      if (!userActivityMap[msg.user_id]) {
        userActivityMap[msg.user_id] = { messages: 0, conversations: new Set() }
      }
      userActivityMap[msg.user_id].messages++
    })

    conversations?.forEach(conv => {
      if (!userActivityMap[conv.user_id]) {
        userActivityMap[conv.user_id] = { messages: 0, conversations: new Set() }
      }
      userActivityMap[conv.user_id].conversations.add(conv.user_id)
    })

    const userActivity = Object.entries(userActivityMap)
      .map(([userId, data]) => {
        const profile = profiles?.find(p => p.id === userId)
        return {
          user_name: profile?.display_name || profile?.email || userId,
          messages: data.messages,
          conversations: data.conversations.size
        }
      })
      .sort((a, b) => b.messages - a.messages)

    return NextResponse.json({
      messagesPerDay: messagesPerDayArray,
      conversationsPerDay: conversationsPerDayArray,
      agentUsage,
      userActivity
    })
  } catch (error) {
    console.error("[v0] [API] Error in charts endpoint:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
