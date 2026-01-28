import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { workspaceId, workspaceName, type } = body

    if (!workspaceId) {
      return NextResponse.json({ error: "workspaceId é obrigatório" }, { status: 400 })
    }

    const adminClient = createAdminClient()
    
    // Buscar todas as conversas do workspace
    const { data: conversations } = await adminClient
      .from("conversations")
      .select("id, title, created_at")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })

    // Buscar todas as mensagens das conversas
    let allMessages: any[] = []
    if (conversations && conversations.length > 0) {
      const conversationIds = conversations.map(c => c.id)
      
      const { data: messages } = await adminClient
        .from("messages")
        .select("content, role, conversation_id, created_at, agent_name")
        .in("conversation_id", conversationIds)
        .order("created_at", { ascending: true })

      allMessages = messages || []
    }

    // JSON bruto com tudo junto
    const rawData = {
      workspaceId,
      workspaceName: workspaceName || "Workspace",
      type,
      data: (conversations || []).map(conv => ({
        conversation_id: conv.id,
        title: conv.title,
        created_at: conv.created_at,
        messages: allMessages
          .filter(m => m.conversation_id === conv.id)
          .map(m => ({
            content: m.content,
            role: m.role,
            agent_name: m.agent_name,
            created_at: m.created_at
          }))
      }))
    }

    // URL do webhook baseado no tipo
    const webhookUrl = type === 'trending' 
      ? "https://n8n.grupobeely.com.br/webhook/workspace-topico"
      : "https://n8n.grupobeely.com.br/webhook/workspace-assunto"

    // POST no webhook
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(rawData),
    })

    const responseText = await response.text()

    // Extrair resultado do retorno
    let result = responseText
    try {
      const json = JSON.parse(responseText)
      result = json.message?.content || json.result || json.data || JSON.stringify(json)
    } catch {
      // Mantém como texto
    }

    // Salvar resultado no Supabase
    const updateField = type === 'trending' ? 'trending_topics' : 'conversation_summary'
    
    const { error: updateError } = await adminClient
      .from("workspaces")
      .update({ [updateField]: result })
      .eq("id", workspaceId)

    if (updateError) {
      return NextResponse.json({ 
        error: "Erro ao salvar no banco",
        details: updateError.message
      }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      result: result
    })

  } catch (error) {
    return NextResponse.json({ 
      error: "Erro interno",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
