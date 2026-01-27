import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"
import { isAdminUser } from "@/lib/utils/trial"

// Fetch conversation summary for a workspace
export async function POST(request: Request) {
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

    const body = await request.json()
    const { workspaceId, type } = body // type: 'summary' or 'trending'

    if (!workspaceId || !type) {
      return NextResponse.json({ error: "Missing workspaceId or type" }, { status: 400 })
    }

    const adminClient = createAdminClient()

    // Get workspace details
    const { data: workspace, error: workspaceError } = await adminClient
      .from("workspaces")
      .select("*")
      .eq("id", workspaceId)
      .single()

    if (workspaceError || !workspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 })
    }

    // Get all conversations from this workspace
    const { data: conversations, error: conversationsError } = await adminClient
      .from("conversations")
      .select("id, title, created_at")
      .eq("workspace_id", workspaceId)

    if (conversationsError) {
      console.error("[v0] Error fetching conversations:", conversationsError)
      return NextResponse.json({ error: "Error fetching conversations" }, { status: 500 })
    }

    // Get messages from these conversations
    const conversationIds = conversations?.map(c => c.id) || []
    
    if (conversationIds.length === 0) {
      return NextResponse.json({ 
        message: "No conversations found in this workspace",
        result: type === 'summary' ? 'Nenhuma conversa encontrada' : 'Nenhum tópico encontrado'
      })
    }

    const { data: messages, error: messagesError } = await adminClient
      .from("messages")
      .select("content, role, created_at, conversation_id")
      .in("conversation_id", conversationIds)
      .order("created_at", { ascending: false })
      .limit(500) // Limit to recent messages

    if (messagesError) {
      console.error("[v0] Error fetching messages:", messagesError)
      return NextResponse.json({ error: "Error fetching messages" }, { status: 500 })
    }

    // Prepare data for webhook
    const webhookPayload = {
      workspaceId: workspace.id,
      workspaceName: workspace.name,
      type: type,
      conversations: conversations?.map(c => ({
        id: c.id,
        title: c.title,
        created_at: c.created_at
      })),
      messages: messages?.map(m => ({
        content: m.content,
        role: m.role,
        created_at: m.created_at
      }))
    }

    // Call the n8n webhook
    const webhookUrl = "https://n8n.grupobeely.com.br/webhook/workspace"
    
    console.log("[v0] Calling webhook with payload:", {
      workspaceId,
      type,
      conversationsCount: conversations?.length,
      messagesCount: messages?.length
    })

    const webhookResponse = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(webhookPayload),
    })

    if (!webhookResponse.ok) {
      console.error("[v0] Webhook error:", await webhookResponse.text())
      return NextResponse.json({ 
        error: "Webhook call failed",
        status: webhookResponse.status 
      }, { status: 500 })
    }

    const webhookResult = await webhookResponse.json()
    console.log("[v0] Webhook response:", webhookResult)

    // Update workspace with the result
    const updateField = type === 'summary' ? 'conversation_summary' : 'trending_topics'
    const resultText = webhookResult.summary || webhookResult.trending || webhookResult.result || JSON.stringify(webhookResult)

    const { error: updateError } = await adminClient
      .from("workspaces")
      .update({ [updateField]: resultText })
      .eq("id", workspaceId)

    if (updateError) {
      console.error("[v0] Error updating workspace:", updateError)
      return NextResponse.json({ error: "Error saving result" }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      result: resultText,
      type: type
    })

  } catch (error) {
    console.error("[v0] Error in workspace insights:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
