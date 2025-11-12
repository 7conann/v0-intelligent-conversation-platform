import { type NextRequest, NextResponse } from "next/server"
import { Document, Paragraph, TextRun, Packer } from "docx"

export async function POST(request: NextRequest) {
  try {
    const { messages, includeAgents } = await request.json()

    // Create paragraphs
    const paragraphs: Paragraph[] = []

    messages.forEach((msg: any, index: number) => {
      // Add message content
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: msg.content,
              size: 24,
            }),
          ],
          spacing: { after: 200 },
        }),
      )

      // Add agents if included
      if (includeAgents && msg.agents && msg.agents.length > 0) {
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `Agentes: ${msg.agents.join(", ")}`,
                size: 20,
                italics: true,
                color: "666666",
              }),
            ],
            spacing: { after: 400 },
          }),
        )
      }
    })

    // Create document
    const doc = new Document({
      sections: [
        {
          properties: {},
          children: paragraphs,
        },
      ],
    })

    // Generate buffer
    const buffer = await Packer.toBuffer(doc)

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": "attachment; filename=mensagens.docx",
      },
    })
  } catch (error) {
    console.error("[API] Error generating Word:", error)
    return NextResponse.json({ error: "Failed to generate Word file" }, { status: 500 })
  }
}
