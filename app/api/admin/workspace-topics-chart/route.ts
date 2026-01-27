import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"
import { isAdminUser } from "@/lib/utils/trial"

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies()

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          },
        },
      },
    )

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session || !isAdminUser(session.user.email || "")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const adminClient = createAdminClient()

    // Get all workspaces with topics
    const { data: workspaces, error } = await adminClient
      .from("workspaces")
      .select("id, name, trending_topics, conversation_summary")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[v0] Error fetching workspaces:", error)
      return NextResponse.json({ error: "Error fetching data" }, { status: 500 })
    }

    // Parse trending topics to extract keywords
    const topicsData: { [key: string]: number } = {}
    const summaryWordCount: { [key: string]: number } = {}

    workspaces?.forEach(workspace => {
      // Process trending topics
      if (workspace.trending_topics) {
        // Simple word extraction (you can improve this based on the actual format)
        const words = workspace.trending_topics
          .toLowerCase()
          .split(/[\s,;.!?]+/)
          .filter(word => word.length > 4) // Filter short words
        
        words.forEach(word => {
          topicsData[word] = (topicsData[word] || 0) + 1
        })
      }

      // Process summary words
      if (workspace.conversation_summary) {
        const words = workspace.conversation_summary
          .toLowerCase()
          .split(/[\s,;.!?]+/)
          .filter(word => word.length > 4)
        
        words.forEach(word => {
          summaryWordCount[word] = (summaryWordCount[word] || 0) + 1
        })
      }
    })

    // Get top topics
    const topTopics = Object.entries(topicsData)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([topic, count]) => ({ topic, count }))

    // Get workspaces with insights count
    const workspacesWithInsights = workspaces?.filter(w => w.trending_topics || w.conversation_summary).length || 0
    const totalWorkspaces = workspaces?.length || 0

    return NextResponse.json({
      topTopics,
      workspacesWithInsights,
      totalWorkspaces,
      topicsDistribution: Object.entries(topicsData)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)
        .map(([topic, count]) => ({ name: topic, value: count }))
    })
  } catch (error) {
    console.error("[v0] Error in topics chart endpoint:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
