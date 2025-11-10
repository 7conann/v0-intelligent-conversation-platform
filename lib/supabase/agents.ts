import { createClient } from "./client"

export async function getAgents() {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("agents")
    .select(`
      *,
      group:groups(id, name, icon, display_order)
    `)
    .order("order", { ascending: true, nullsFirst: false })

  if (error) {
    console.error("[v0] Error loading agents:", error)
    throw error
  }

  console.log(`[v0] 📦 Loaded ${data?.length || 0} agents from agents table`)
  return data
}

export async function toggleAgentFavorite(userId: string, agentId: string, isFavorite: boolean) {
  const supabase = createClient()

  if (isFavorite) {
    const { error } = await supabase.from("agent_favorites").insert({
      user_id: userId,
      agent_id: agentId,
    })

    if (error) throw error
  } else {
    const { error } = await supabase.from("agent_favorites").delete().eq("user_id", userId).eq("agent_id", agentId)

    if (error) throw error
  }
}

export async function getFavoriteAgents(userId: string) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("agent_favorites")
    .select(
      `
      agent_id,
      agents (*)
    `,
    )
    .eq("user_id", userId)

  if (error) throw error
  return data
}

export async function getCustomAgents(userId: string, workspaceId: string) {
  const supabase = createClient()

  try {
    // Try querying agents table with workspace_id
    const { data, error } = await supabase
      .from("agents")
      .select(`
        *,
        group:groups(id, name, icon, display_order)
      `)
      .eq("workspace_id", workspaceId)
      .eq("is_system", false)
      .order("created_at", { ascending: false })

    if (error) throw error
    return data
  } catch (error: any) {
    // If workspace_id column doesn't exist, fall back to custom_agents table
    if (error?.message?.includes("workspace_id") || error?.code === "42703") {
      console.log("[v0] workspace_id column not found in agents table, trying custom_agents table")
      const { data, error: fallbackError } = await supabase
        .from("custom_agents")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false })

      if (fallbackError) {
        console.log("[v0] Error loading custom_agents:", fallbackError.message)
        return []
      }
      console.log(`[v0] 📦 Loaded ${data?.length || 0} custom agents from custom_agents table`)
      return data
    }
    console.log("[v0] Error loading custom agents:", error.message)
    return []
  }
}

export async function createCustomAgent(
  userId: string,
  workspaceId: string,
  name: string,
  description: string,
  icon: string,
  color: string,
  triggerWord: string,
) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("agents")
    .insert({
      user_id: userId,
      workspace_id: workspaceId,
      name,
      description,
      icon,
      color,
      trigger_word: triggerWord,
      is_system: false,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteCustomAgent(customAgentId: string) {
  const supabase = createClient()

  const { error } = await supabase.from("agents").delete().eq("id", customAgentId)

  if (error) throw error
}

export async function getAllAgentsForWorkspace(workspaceId: string) {
  const supabase = createClient()

  try {
    // Try querying with workspace_id column
    const { data, error } = await supabase
      .from("agents")
      .select(`
        *,
        group:groups(id, name, icon, display_order)
      `)
      .or(`is_system.eq.true,workspace_id.eq.${workspaceId}`)
      .order("order")

    if (error) throw error
    return data
  } catch (error: any) {
    // If workspace_id column doesn't exist, fall back to separate queries
    if (error?.message?.includes("workspace_id") || error?.code === "42703") {
      console.log("[v0] workspace_id column not found, using fallback queries")

      const { data: allAgents, error: agentsError } = await supabase
        .from("agents")
        .select(`
          *,
          group:groups(id, name, icon, display_order)
        `)
        .order("order", { ascending: true, nullsFirst: false })

      if (agentsError) throw agentsError

      // Try to get custom agents from custom_agents table
      const { data: customAgents, error: customError } = await supabase
        .from("custom_agents")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false })

      if (customError) {
        console.log("[v0] Error loading custom agents:", customError.message)
      }

      const totalAgents = [...(allAgents || []), ...(customAgents || [])]
      console.log(
        `[v0] 📦 Total agents loaded: ${totalAgents.length} (${allAgents?.length || 0} from agents + ${customAgents?.length || 0} custom)`,
      )
      return totalAgents
    }
    throw error
  }
}
