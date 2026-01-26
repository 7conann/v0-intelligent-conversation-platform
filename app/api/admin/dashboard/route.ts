import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"
import { isAdminUser, getDaysRemaining } from "@/lib/utils/trial"

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

    console.log("[v0] [API] Session check:", {
      hasSession: !!session,
      email: session?.user?.email,
      isAdmin: session?.user?.email ? isAdminUser(session.user.email) : false,
    })

    if (!session || !isAdminUser(session.user.email || "")) {
      console.log("[v0] [API] Unauthorized access attempt")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const adminClient = createAdminClient()

    console.log("[v0] [API] Fetching all profiles...")

    let profilesData = null
    let profilesError = null
    let retries = 3

    while (retries > 0) {
      const result = await adminClient.from("profiles").select("*")
      profilesData = result.data
      profilesError = result.error

      if (!profilesError) break

      // If rate limited, wait and retry
      if (profilesError.message?.includes("Too Many") || profilesError.code === "429") {
        console.log(`[v0] [API] Rate limited, retrying... (${retries} attempts left)`)
        await new Promise((resolve) => setTimeout(resolve, 1000))
        retries--
      } else {
        break
      }
    }

    if (profilesError) {
      console.error("[v0] [API] Error fetching profiles:", profilesError)
      throw profilesError
    }

    console.log("[v0] [API] Profiles fetched:", profilesData?.length)

    // Get counts without limit
    const { count: conversationsCount } = await adminClient
      .from("conversations")
      .select("*", { count: "exact", head: true })
    
    const { count: messagesCount } = await adminClient
      .from("messages")
      .select("*", { count: "exact", head: true })
    
    const { count: agentsCount } = await adminClient
      .from("agents")
      .select("*", { count: "exact", head: true })

    // Fetch agents data
    let agentsData = null
    let agentsError = null
    retries = 3

    while (retries > 0) {
      const result = await adminClient.from("agents").select("*")
      agentsData = result.data
      agentsError = result.error

      if (!agentsError) break

      // If rate limited, wait and retry
      if (agentsError.message?.includes("Too Many") || agentsError.code === "429") {
        console.log(`[v0] [API] Rate limited, retrying... (${retries} attempts left)`)
        await new Promise((resolve) => setTimeout(resolve, 1000))
        retries--
      } else {
        break
      }
    }

    if (agentsError) {
      console.error("[v0] [API] Error fetching agents:", agentsError)
      throw agentsError
    }

    console.log("[v0] [API] Agents fetched:", agentsData?.length)

    // Get data for per-user metrics (with pagination if needed)
    const { data: conversationsData } = await adminClient
      .from("conversations")
      .select("id, user_id")
      .limit(10000)
    
    const { data: messagesData } = await adminClient
      .from("messages")
      .select("id, user_id")
      .limit(10000)

    const systemMetrics = {
      total_users: profilesData?.length || 0,
      total_conversations: conversationsCount || 0,
      total_messages: messagesCount || 0,
      total_agents: agentsCount || 0,
    }

    console.log("[v0] [API] System metrics:", systemMetrics)

    if (profilesData) {
      const usersWithMetrics = profilesData.map((profile) => {
        const userConversations = conversationsData?.filter((c) => c.user_id === profile.id) || []
        const userMessages = messagesData?.filter((m) => m.user_id === profile.id) || []

        return {
          id: profile.id,
          email: profile.email,
          display_name: profile.display_name || "Sem nome",
          phone: profile.phone || null,
          created_at: profile.created_at,
          last_access: profile.last_access || null,
          account_expiration_date: profile.account_expiration_date || null,
          total_conversations: userConversations.length,
          total_messages: userMessages.length,
          days_remaining: getDaysRemaining(profile.email, profile.created_at, profile.account_expiration_date || null),
        }
      })

      console.log("[v0] [API] Users with metrics:", usersWithMetrics.length)

      return NextResponse.json({
        systemMetrics,
        users: usersWithMetrics,
      })
    }

    return NextResponse.json({
      systemMetrics,
      users: [],
    })
  } catch (error) {
    console.error("[v0] [API] Error in admin dashboard:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
