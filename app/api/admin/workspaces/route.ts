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

    // Get all workspaces
    const { data: workspaces, error: workspacesError } = await adminClient
      .from("workspaces")
      .select("*")
      .order("created_at", { ascending: false })

    if (workspacesError) {
      console.error("[v0] Error fetching workspaces:", workspacesError)
      throw workspacesError
    }

    // Get conversation counts and user info for each workspace
    const workspacesWithCounts = await Promise.all(
      (workspaces || []).map(async (workspace) => {
        // Get conversation count
        const { count } = await adminClient
          .from("conversations")
          .select("*", { count: "exact", head: true })
          .eq("workspace_id", workspace.id)

        // Get user profile
        const { data: profile } = await adminClient
          .from("profiles")
          .select("email, display_name")
          .eq("id", workspace.user_id)
          .single()

        return {
          ...workspace,
          conversation_count: count || 0,
          profiles: profile
        }
      })
    )

    return NextResponse.json({ workspaces: workspacesWithCounts })

  } catch (error) {
    console.error("[v0] Error in workspaces API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
