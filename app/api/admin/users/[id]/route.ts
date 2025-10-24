import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"
import { isAdminUser, getDaysRemaining } from "@/lib/utils/trial"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log("[v0] [API] Fetching user details for:", params.id)

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
      console.log("[v0] [API] Unauthorized access attempt to user details")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const adminClient = createAdminClient()

    const { data: profileData, error: profileError } = await adminClient
      .from("profiles")
      .select("*")
      .eq("id", params.id)
      .single()

    if (profileError || !profileData) {
      console.error("[v0] [API] Error fetching profile:", profileError)
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    console.log("[v0] [API] Profile found:", profileData.email)

    const { data: conversationsData, error: conversationsError } = await adminClient
      .from("conversations")
      .select("*")
      .eq("user_id", params.id)
      .order("created_at", { ascending: false })

    if (conversationsError) {
      console.error("[v0] [API] Error fetching conversations:", conversationsError)
    }

    console.log("[v0] [API] Conversations found:", conversationsData?.length || 0)

    const conversationsWithDetails = await Promise.all(
      (conversationsData || []).map(async (conv) => {
        const { data: messagesData } = await adminClient.from("messages").select("*").eq("conversation_id", conv.id)

        const agentsUsed = new Set<string>()
        messagesData?.forEach((msg) => {
          if (msg.agent_ids) {
            msg.agent_ids.forEach((id: string) => agentsUsed.add(id))
          }
        })

        return {
          id: conv.id,
          title: conv.title,
          created_at: conv.created_at,
          message_count: messagesData?.length || 0,
          agents_used: Array.from(agentsUsed),
        }
      }),
    )

    const user = {
      id: profileData.id,
      email: profileData.email,
      display_name: profileData.display_name || "Sem nome",
      created_at: profileData.created_at,
      days_remaining: getDaysRemaining(profileData.email, profileData.created_at, profileData.account_expiration_date),
    }

    console.log("[v0] [API] Returning user data with", conversationsWithDetails.length, "conversations")

    return NextResponse.json({
      user,
      conversations: conversationsWithDetails,
    })
  } catch (error) {
    console.error("[v0] [API] Error in user details:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log("[v0] [API] Updating user expiration for:", params.id)

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
      console.log("[v0] [API] Unauthorized access attempt to update user")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { account_expiration_date } = body

    if (!account_expiration_date) {
      return NextResponse.json({ error: "account_expiration_date is required" }, { status: 400 })
    }

    const adminClient = createAdminClient()

    const { data, error } = await adminClient
      .from("profiles")
      .update({ account_expiration_date })
      .eq("id", params.id)
      .select()
      .single()

    if (error) {
      console.error("[v0] [API] Error updating profile:", error)
      return NextResponse.json({ error: "Failed to update user" }, { status: 500 })
    }

    console.log("[v0] [API] User expiration updated successfully")

    return NextResponse.json({
      success: true,
      user: data,
    })
  } catch (error) {
    console.error("[v0] [API] Error updating user expiration:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
