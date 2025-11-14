import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const BLUBASH_API_URL = "https://api.blubash.io/api/v1/channels/cmgk20rot4vhsp90fqdwze57n/messages"
const BLUBASH_API_KEY = "sk_66eb287b-6cf3-4c11-b89d-ad09b12b076a"

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  let logId: string | null = null
  let savedMessageId: string | null = null

  try {
    console.log("[v0] [API ROUTE] Recebendo requisição do cliente")

    const body = await request.json()
    console.log("[v0] [API ROUTE] Payload recebido:", JSON.stringify(body, null, 2))

    const {
      data: { session },
    } = await supabase.auth.getSession()
    const userId = session?.user?.id

    const conversationId = body.metadata?.conversationId
    const agentIds = body.metadata?.agentIds
    const userMessage = body.content?.text?.body || body.content?.image?.caption || ""

    const isValidUUID = (uuid: any): boolean => {
      if (!uuid || typeof uuid !== 'string') return false
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      return uuidRegex.test(uuid)
    }

    if (userId && isValidUUID(conversationId)) {
      const { data: savedMessage, error: messageError } = await supabase
        .from("messages")
        .insert({
          conversation_id: conversationId,
          role: "user",
          content: userMessage,
          agent_ids: agentIds || [],
          user_id: userId, // Added user_id to fix NOT NULL constraint error
        })
        .select()
        .single()

      if (!messageError && savedMessage) {
        savedMessageId = savedMessage.id
        console.log("[v0] [API ROUTE] User message saved with ID:", savedMessageId)
      } else {
        console.error("[v0] [API ROUTE] Error saving user message:", messageError)
      }
    }

    if (userId) {
      const logEntry: any = {
        user_id: userId,
        request_payload: body,
        agent_ids: agentIds || [],
        user_message: userMessage,
        request_timestamp: new Date().toISOString(),
      }

      if (isValidUUID(conversationId)) {
        logEntry.conversation_id = conversationId
      }
      // Use the real message ID from database
      if (savedMessageId) {
        logEntry.message_id = savedMessageId
      }

      const { data: logData, error: logError } = await supabase
        .from("api_logs")
        .insert(logEntry)
        .select()
        .single()

      if (logError) {
        console.error("[v0] [API ROUTE] Error creating log:", logError)
      } else {
        logId = logData?.id
        console.log("[v0] [API ROUTE] Log created with ID:", logId)
      }
    }

    console.log("[v0] [API ROUTE] Enviando para BluBash API...")
    console.log("[v0] [API ROUTE] URL:", BLUBASH_API_URL)

    const response = await fetch(BLUBASH_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": BLUBASH_API_KEY,
      },
      body: JSON.stringify(body),
    })

    console.log("[v0] [API ROUTE] Resposta recebida da BluBash")
    console.log("[v0] [API ROUTE] Status:", response.status, response.statusText)
    console.log("[v0] [API ROUTE] Headers:", Object.fromEntries(response.headers.entries()))

    const responseText = await response.text()
    console.log("[v0] [API ROUTE] Corpo da resposta:", responseText)

    let data: any = {}
    if (responseText && responseText.trim().length > 0) {
      try {
        data = JSON.parse(responseText)
        console.log("[v0] [API ROUTE] ✅ Resposta parseada com sucesso")
      } catch (parseError) {
        console.error("[v0] [API ROUTE] ❌ Erro ao fazer parse do JSON:", parseError)
        data = { success: false, error: "Invalid JSON response" }
      }
    } else {
      console.log("[v0] [API ROUTE] ⚠️ Resposta vazia da API")
      data = { success: true, aiMessages: [] }
    }

    if (userId && logId) {
      const assistantResponse =
        data.aiMessages
          ?.map((m: any) => m?.content?.text?.body)
          .filter(Boolean)
          .join("\n\n") || ""

      const { error: updateError } = await supabase
        .from("api_logs")
        .update({
          response_body: data,
          response_status: response.status,
          response_timestamp: new Date().toISOString(),
          assistant_response: assistantResponse,
          error_message: response.ok ? null : data.error || "Unknown error",
        })
        .eq("id", logId)

      if (updateError) {
        console.error("[v0] [API ROUTE] Error updating log:", updateError)
      } else {
        console.log("[v0] [API ROUTE] Log updated successfully")
      }
    }

    if (!response.ok) {
      console.error("[v0] [API ROUTE] ❌ Erro na API BluBash")
      return NextResponse.json(
        { error: `BluBash API error: ${response.status}`, details: responseText },
        { status: response.status },
      )
    }

    console.log("[v0] [API ROUTE] Retornando resposta para o cliente")
    return NextResponse.json(data)
  } catch (error) {
    console.error("[v0] [API ROUTE] ❌ Erro geral:", error)

    if (logId) {
      const supabase = await createClient()
      await supabase
        .from("api_logs")
        .update({
          error_message: error instanceof Error ? error.message : "Unknown error",
          response_status: 500,
          response_timestamp: new Date().toISOString(),
        })
        .eq("id", logId)
    }

    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
