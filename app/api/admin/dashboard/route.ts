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

    const { data: conversationsData } = await adminClient.from("conversations").select("*")
    const { data: messagesData } = await adminClient.from("messages").select("*")
    const { data: agentsData } = await adminClient.from("agents").select("*")

    const systemMetrics = {
      total_users: profilesData?.length || 0,
      total_conversations: conversationsData?.length || 0,
      total_messages: messagesData?.length || 0,
      total_agents: agentsData?.length || 0,
    }

    console.log("[v0] [API] System metrics:", systemMetrics)

    if (profilesData) {
      const usersWithMetrics = await Promise.all(
        profilesData.map(async (profile) => {
          const { data: userConversations } = await adminClient
            .from("conversations")
            .select("id")
            .eq("user_id", profile.id)

          const { data: userMessages } = await adminClient.from("messages").select("id").eq("user_id", profile.id)

          return {
            id: profile.id,
            email: profile.email,
            display_name: profile.display_name || "Sem nome",
            phone: profile.phone || null,
            created_at: profile.created_at,
            last_access: profile.last_access || null,
            account_expiration_date: profile.account_expiration_date || null,
            total_conversations: userConversations?.length || 0,
            total_messages: userMessages?.length || 0,
            days_remaining: getDaysRemaining(
              profile.email,
              profile.created_at,
              profile.account_expiration_date || null,
            ),
          }
        }),
      )

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
