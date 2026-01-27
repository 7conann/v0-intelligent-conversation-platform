import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { workspaceId, workspaceName, type, message } = body

    // URLs dos webhooks
    const webhookUrl = type === 'trending' 
      ? "https://n8n.grupobeely.com.br/webhook/workspace-topico"
      : "https://n8n.grupobeely.com.br/webhook/workspace-assunto"

    // Payload
    const payload = {
      workspaceId: workspaceId || "unknown",
      workspaceName: workspaceName || "Workspace",
      type: type,
      message: message || "Solicitação de análise do workspace"
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
          error: json.error.message || "Erro",
          details: JSON.stringify(json.error)
        }, { status: 500 })
      }
      
      return NextResponse.json({ 
        success: true,
        result: json.result || json
      })
    } catch {
      return NextResponse.json({ 
        success: true,
        result: text
      })
    }

  } catch (error) {
    return NextResponse.json({ 
      error: "Erro interno",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
