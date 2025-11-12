import { type NextRequest, NextResponse } from "next/server"
import * as XLSX from "xlsx"

export async function POST(request: NextRequest) {
  try {
    const { messages, includeAgents } = await request.json()

    // Create workbook
    const wb = XLSX.utils.book_new()

    // Prepare data
    const data = messages.map((msg: any) => {
      const row: any = {
        Conteúdo: msg.content,
      }

      if (includeAgents && msg.agents && msg.agents.length > 0) {
        row["Agentes"] = msg.agents.join(", ")
      }

      return row
    })

    // Create worksheet
    const ws = XLSX.utils.json_to_sheet(data)
    XLSX.utils.book_append_sheet(wb, ws, "Mensagens")

    // Generate buffer
    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" })

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": "attachment; filename=mensagens.xlsx",
      },
    })
  } catch (error) {
    console.error("[API] Error generating Excel:", error)
    return NextResponse.json({ error: "Failed to generate Excel file" }, { status: 500 })
  }
}
