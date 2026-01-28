import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { workspaceId, workspaceName, type } = body

    if (!workspaceId) {
      return NextResponse.json({ error: "workspaceId é obrigatório" }, { status: 400 })
    }

    // URL do webhook baseado no tipo
    const webhookUrl = type === 'trending' 
      ? "https://n8n.grupobeely.com.br/webhook/workspace-topico"
      : "https://n8n.grupobeely.com.br/webhook/workspace-assunto"

    // POST no webhook apenas com o workspaceId - n8n busca as conversas e mensagens
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        workspaceId,
        workspaceName: workspaceName || "Workspace",
        type
      }),
    })

    const adminClient = createAdminClient()

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
