import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { workspaceId, workspaceName, type } = body

    if (!workspaceId) {
      return NextResponse.json({ error: "workspaceId é obrigatório" }, { status: 400 })
    }

    // Buscar conversas e mensagens do workspace
    const adminClient = createAdminClient()
    
    // Buscar todas as conversas do workspace
    const { data: conversations, error: convError } = await adminClient
      .from("conversations")
      .select("id, title, created_at")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })

    if (convError) {
      console.error("[v0] Erro ao buscar conversas:", convError)
    }

    // Buscar todas as mensagens das conversas
    let allMessages: any[] = []
    if (conversations && conversations.length > 0) {
      const conversationIds = conversations.map(c => c.id)
      
      const { data: messages, error: msgError } = await adminClient
        .from("messages")
        .select("id, content, role, conversation_id, created_at, agent_name")
        .in("conversation_id", conversationIds)
        .order("created_at", { ascending: true })

      if (msgError) {
        console.error("[v0] Erro ao buscar mensagens:", msgError)
      } else {
        allMessages = messages || []
      }
    }

    // Organizar conversas com suas mensagens
    const conversationsWithMessages = (conversations || []).map(conv => ({
      ...conv,
      messages: allMessages.filter(m => m.conversation_id === conv.id)
    }))

    // URLs dos webhooks
    const webhookUrl = type === 'trending' 
      ? "https://n8n.grupobeely.com.br/webhook/workspace-topico"
      : "https://n8n.grupobeely.com.br/webhook/workspace-assunto"

    // Payload com todas as conversas e mensagens
    const payload = {
      workspaceId,
      workspaceName: workspaceName || "Workspace",
      type,
      totalConversations: conversations?.length || 0,
      totalMessages: allMessages.length,
      conversations: conversationsWithMessages
    }

    // POST no webhook
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    const text = await response.text()

    // Parse response
    try {
      const json = JSON.parse(text)
      
      // Estrutura do n8n: json.message.content
      if (json.message?.content) {
        return NextResponse.json({ 
          success: true,
          result: json.message.content
        })
      }
      
      if (json.error) {
        return NextResponse.json({ 
          error: json.error.message || "Erro do webhook",
          details: JSON.stringify(json.error)
        }, { status: 500 })
      }
      
      return NextResponse.json({ 
        success: true,
        result: json.result || json.data || json
      })
    } catch {
      return NextResponse.json({ 
        success: true,
        result: text
      })
    }

  } catch (error) {
    console.error("[v0] Erro na API:", error)
    return NextResponse.json({ 
      error: "Erro interno",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
