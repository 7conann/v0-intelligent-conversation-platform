import { type NextRequest, NextResponse } from "next/server"
import PptxGenJS from "pptxgenjs"

export async function POST(request: NextRequest) {
  try {
    const { messages, includeAgents } = await request.json()

    const pptx = new PptxGenJS()

    messages.forEach((msg: any, index: number) => {
      const slide = pptx.addSlide()

      // Add message content
      slide.addText(msg.content, {
        x: 0.5,
        y: 0.5,
        w: 9,
        h: 4,
        fontSize: 18,
        color: "363636",
        wrap: true,
      })

      // Add agents if included
      if (includeAgents && msg.agents && msg.agents.length > 0) {
        slide.addText(`Agentes: ${msg.agents.join(", ")}`, {
          x: 0.5,
          y: 5,
          w: 9,
          h: 0.5,
          fontSize: 14,
          color: "666666",
          italic: true,
        })
      }
    })

    // Generate buffer
    const buffer = (await pptx.write({ outputType: "arraybuffer" })) as ArrayBuffer

    return new NextResponse(Buffer.from(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "Content-Disposition": "attachment; filename=mensagens.pptx",
      },
    })
  } catch (error) {
    console.error("[API] Error generating PowerPoint:", error)
    return NextResponse.json({ error: "Failed to generate PowerPoint file" }, { status: 500 })
  }
}
