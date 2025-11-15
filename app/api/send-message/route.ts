import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { put } from "@vercel/blob"

const BLUBASH_API_URL = "https://api.blubash.io/api/v1/channels/cmgk20rot4vhsp90fqdwze57n/messages"
const BLUBASH_API_KEY = "sk_66eb287b-6cf3-4c11-b89d-ad09b12b076a"

async function dataUrlToBlob(dataUrl: string, filename: string): Promise<string> {
  try {
    const matches = dataUrl.match(/^data:([^;]+);base64,(.+)$/)
    
    if (!matches) {
      throw new Error("Invalid data URL format")
    }
    
    const mimeType = matches[1]
    const base64Data = matches[2]
    
    // Convert base64 to binary using browser-compatible method
    const binaryString = atob(base64Data)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }
    
    // Create a File object from the bytes
    const file = new File([bytes], filename, { type: mimeType })
    
    // Upload to Vercel Blob
    const blob = await put(filename, file, {
      access: "public",
    })
    
    console.log(`[v0] [API ROUTE] File uploaded to Blob: ${blob.url}`)
    return blob.url
  } catch (error) {
    console.error("[v0] [API ROUTE] Error uploading to Blob:", error)
    throw error
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  let logId: string | null = null
  let savedMessageId: string | null = null

  try {
    console.log("[v0] [API ROUTE] Recebendo requisição do cliente")

    const body = await request.json()
    console.log("[v0] [API ROUTE] Payload recebido:", JSON.stringify(body, null, 2))

    if (body.type === "IMAGE" && body.content?.image?.url?.startsWith("data:")) {
      console.log("[v0] [API ROUTE] Converting image data URL to Blob URL...")
      const timestamp = Date.now()
      const extension = body.content.image.url.match(/^data:image\/([^;]+)/)?.[1] || "png"
      const filename = `image-${timestamp}.${extension}`
      body.content.image.url = await dataUrlToBlob(body.content.image.url, filename)
    }

    if (body.type === "VIDEO" && body.content?.video?.url?.startsWith("data:")) {
      console.log("[v0] [API ROUTE] Converting video data URL to Blob URL...")
      const timestamp = Date.now()
      const extension = body.content.video.url.match(/^data:video\/([^;]+)/)?.[1] || "mp4"
      const filename = `video-${timestamp}.${extension}`
      body.content.video.url = await dataUrlToBlob(body.content.video.url, filename)
    }

    if (body.type === "DOCUMENT" && body.content?.document?.url?.startsWith("data:")) {
      console.log("[v0] [API ROUTE] Converting document data URL to Blob URL...")
      const filename = body.content.document.filename || `document-${Date.now()}`
      body.content.document.url = await dataUrlToBlob(body.content.document.url, filename)
    }

    if (body.type === "AUDIO" && body.content?.audio?.url?.startsWith("data:")) {
      console.log("[v0] [API ROUTE] Converting audio data URL to Blob URL...")
      const timestamp = Date.now()
      const extension = body.content.audio.url.match(/^data:audio\/([^;]+)/)?.[1] || "mp3"
      const filename = `audio-${timestamp}.${extension}`
      body.content.audio.url = await dataUrlToBlob(body.content.audio.url, filename)
    }

    const {
      data: { session },
    } = await supabase.auth.getSession()
    const userId = session?.user?.id

    const conversationId = body.metadata?.conversationId
    const agentIds = body.metadata?.agentIds
    
    let userMessage = ""
    if (body.type === "TEXT") {
      userMessage = body.content?.text?.body || ""
    } else if (body.type === "IMAGE") {
      userMessage = body.content?.image?.caption || ""
    } else if (body.type === "AUDIO") {
      userMessage = "Áudio enviado"
    } else if (body.type === "VIDEO") {
      userMessage = body.content?.video?.caption || "Vídeo enviado"
    } else if (body.type === "DOCUMENT") {
      userMessage = body.content?.document?.caption || body.content?.document?.filename || "Documento enviado"
    }

    const isValidUUID = (uuid: any): boolean => {
      if (!uuid || typeof uuid !== 'string') return false
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      return uuidRegex.test(uuid)
    }

    if (userId && isValidUUID(conversationId)) {
      const messageData: any = {
        conversation_id: conversationId,
        role: "user",
        content: userMessage,
        agent_ids: agentIds || [],
        user_id: userId,
      }

      const { data: savedMessage, error: messageError } = await supabase
        .from("messages")
        .insert(messageData)
        .select()
        .single()

      if (!messageError && savedMessage) {
        savedMessageId = savedMessage.id
        console.log("[v0] [API ROUTE] User message saved with ID:", savedMessageId)
      } else {
        console.error("[v0] [API ROUTE] Error saving user message:", messageError)
      }
    }

    const requestHeaders = {
      "Content-Type": "application/json",
      "X-API-Key": BLUBASH_API_KEY, // Include the API key in logs
    }

    const fullRequestDetails = {
      url: BLUBASH_API_URL,
      method: "POST",
      headers: requestHeaders,
      body: body,
    }

    if (userId) {
      const logEntry: any = {
        user_id: userId,
        request_payload: fullRequestDetails, // Save complete request details instead of just body
        agent_ids: agentIds || [],
        user_message: userMessage,
        request_timestamp: new Date().toISOString(),
      }

      if (isValidUUID(conversationId)) {
        logEntry.conversation_id = conversationId
      }
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
      headers: requestHeaders,
      body: JSON.stringify(body),
    })

    console.log("[v0] [API ROUTE] Resposta recebida da BluBash")
    console.log("[v0] [API ROUTE] Status:", response.status, response.statusText)

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
          response_body: data, // Full response payload saved here
          response_status: response.status,
          response_timestamp: new Date().toISOString(),
          assistant_response: assistantResponse,
          error_message: response.ok ? null : (data.error || responseText || "API error"),
        })
        .eq("id", logId)

      if (updateError) {
        console.error("[v0] [API ROUTE] Error updating log:", updateError)
      } else {
        console.log("[v0] [API ROUTE] Log updated successfully with full response")
      }
    }

    if (!response.ok) {
      console.error("[v0] [API ROUTE] ❌ Erro na API BluBash")
      
      if (userId && logId) {
        await supabase
          .from("api_logs")
          .update({
            error_message: `BluBash API error: ${response.status} - ${responseText}`,
            response_status: response.status,
            response_timestamp: new Date().toISOString(),
          })
          .eq("id", logId)
      }
      
      return NextResponse.json(
        { error: `BluBash API error: ${response.status}`, details: responseText },
        { status: response.status },
      )
    }

    console.log("[v0] [API ROUTE] Retornando resposta para o cliente")
    return NextResponse.json(data)
  } catch (error) {
    console.error("[v0] [API ROUTE] ❌ Erro geral:", error)

    if (userId && logId) {
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
