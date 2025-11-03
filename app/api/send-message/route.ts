import { type NextRequest, NextResponse } from "next/server"

const BLUBASH_API_URL = "https://api.blubash.io/api/v1/channels/cmgk20rot4vhsp90fqdwze57n/messages"
const BLUBASH_API_KEY = "sk_66eb287b-6cf3-4c11-b89d-ad09b12b076a"

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] [API ROUTE] Recebendo requisição do cliente")

    const body = await request.json()
    console.log("[v0] [API ROUTE] Payload recebido:", JSON.stringify(body, null, 2))

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

    if (!response.ok) {
      console.error("[v0] [API ROUTE] ❌ Erro na API BluBash")
      return NextResponse.json(
        { error: `BluBash API error: ${response.status}`, details: responseText },
        { status: response.status },
      )
    }

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

    console.log("[v0] [API ROUTE] Retornando resposta para o cliente")
    return NextResponse.json(data)
  } catch (error) {
    console.error("[v0] [API ROUTE] ❌ Erro geral:", error)
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
