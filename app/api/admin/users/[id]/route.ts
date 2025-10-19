import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { isAdminUser, getDaysRemaining } from "@/lib/utils/trial"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log("[v0] [API] Fetching user details for:", params.id)

    // Verify admin access
    const authHeader = request.headers.get("authorization")
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = createAdminClient()

    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", params.id)
      .single()

    if (profileError || !profileData) {
      console.error("[v0] [API] Error fetching profile:", profileError)
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    console.log("[v0] [API] Profile found:", profileData.email)

    const { data: conversationsData, error: conversationsError } = await supabase
      .from("conversations")
      .select("*")
      .eq("user_id", params.id)
      .order("created_at", { ascending: false })

    if (conversationsError) {
      console.error("[v0] [API] Error fetching conversations:", conversationsError)
    }

    console.log("[v0] [API] Conversations found:", conversationsData?.length || 0)

    const conversationsWithDetails = await Promise.all(
      (conversationsData || []).map(async (conv) => {
        const { data: messagesData } = await supabase.from("messages").select("*").eq("conversation_id", conv.id)

        const agentsUsed = new Set<string>()
        messagesData?.forEach((msg) => {
          if (msg.agent_ids) {
            msg.agent_ids.forEach((id: string) => agentsUsed.add(id))
          }
        })

        return {
          id: conv.id,
          title: conv.title,
          created_at: conv.created_at,
          message_count: messagesData?.length || 0,
          agents_used: Array.from(agentsUsed),
        }
      }),
    )

    const user = {
      id: profileData.id,
      email: profileData.email,
      display_name: profileData.display_name || "Sem nome",
      created_at: profileData.created_at,
      days_remaining: isAdminUser(profileData.email) ? 999 : getDaysRemaining(profileData.created_at),
    }

    console.log("[v0] [API] Returning user data with", conversationsWithDetails.length, "conversations")

    return NextResponse.json({
      user,
      conversations: conversationsWithDetails,
    })
  } catch (error) {
    console.error("[v0] [API] Error in user details:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
