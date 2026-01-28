import { NextResponse } from "next/server"

export async function POST() {
  try {
    // POST no webhook para buscar dados dos graficos
    const response = await fetch("https://n8n.grupobeely.com.br/webhook/workspace-grafico", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "getGraphData" }),
    })

    const responseText = await response.text()

    // Parse response
    let result = { assuntos: [], topicos: [] }
    try {
      const json = JSON.parse(responseText)
      result = json.data || json.result || json
    } catch {
      // Se falhar parse, retorna vazio
    }

    return NextResponse.json({ 
      success: true,
      data: result
    })

  } catch (error) {
    return NextResponse.json({ 
      error: "Erro interno",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
