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
      
      console.log("[v0] Buscando mensagens para conversationIds:", conversationIds)
      
      const { data: messages, error: msgError } = await adminClient
        .from("messages")
        .select("content, role, conversation_id, created_at, agent_name")
        .in("conversation_id", conversationIds)
        .order("created_at", { ascending: true })

      console.log("[v0] Mensagens encontradas:", messages?.length || 0, "Erro:", msgError)
      
      if (messages && messages.length > 0) {
        allMessages = messages
        console.log("[v0] Primeira mensagem:", messages[0])
      }
    }

    // Montar texto bruto com todas as conversas e mensagens
    let rawText = `Workspace: ${workspaceName || "Workspace"}\nTipo: ${type}\n\n`
    
    for (const conv of (conversations || [])) {
      rawText += `=== CONVERSA: ${conv.title} ===\n`
      rawText += `Data: ${conv.created_at}\n\n`
      
      const convMessages = allMessages.filter(m => m.conversation_id === conv.id)
      
      for (const msg of convMessages) {
        const sender = msg.role === 'user' ? 'USUÁRIO' : (msg.agent_name || 'ASSISTENTE')
        rawText += `[${sender}]: ${msg.content}\n`
      }
      
      rawText += `\n---\n\n`
    }

    // URL do webhook baseado no tipo
    const webhookUrl = type === 'trending' 
      ? "https://n8n.grupobeely.com.br/webhook/workspace-topico"
      : "https://n8n.grupobeely.com.br/webhook/workspace-assunto"

    // POST no webhook com texto bruto
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        workspaceId,
        workspaceName: workspaceName || "Workspace",
        type,
        content: rawText 
      }),
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
