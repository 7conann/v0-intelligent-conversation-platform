import { NextResponse } from "next/server"

// Simple webhook call - no Supabase queries needed
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { workspaceId, workspaceName, type } = body

    if (!workspaceId || !type) {
      return NextResponse.json({ error: "Missing workspaceId or type" }, { status: 400 })
    }

    // Different webhook URLs for different types
    // trending = topicos, summary = assunto
    const webhookUrl = type === 'trending' 
      ? "https://n8n.grupobeely.com.br/webhook/workspace-topico"
      : "https://n8n.grupobeely.com.br/webhook/workspace-assunto"

    // Call the webhook
    const webhookResponse = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        workspaceId,
        workspaceName: workspaceName || "Workspace",
        type
      }),
    })

    if (!webhookResponse.ok) {
      const errorText = await webhookResponse.text()
      return NextResponse.json({ 
        error: "Webhook call failed",
        details: errorText,
        status: webhookResponse.status 
      }, { status: 500 })
    }

    // Try to parse response as JSON, fallback to text
    let result
    const responseText = await webhookResponse.text()
    try {
      const jsonResult = JSON.parse(responseText)
      
      // Check if response is an error from the webhook
      if (jsonResult.error) {
        return NextResponse.json({ 
          error: "Webhook retornou erro",
          details: jsonResult.error.message || JSON.stringify(jsonResult.error),
          code: jsonResult.error.code
        }, { status: 500 })
      }
      
      result = jsonResult.result || jsonResult.summary || jsonResult.trending || jsonResult.message || jsonResult.data || responseText
    } catch {
      // If it's plain text that looks like an error, handle it
      if (responseText.includes("Too Many Requests") || responseText.includes("error")) {
        return NextResponse.json({ 
          error: "Webhook retornou erro",
          details: responseText
        }, { status: 500 })
      }
      result = responseText
    }

    return NextResponse.json({ 
      success: true,
      result: result,
      type: type
    })

  } catch (error) {
    return NextResponse.json({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
