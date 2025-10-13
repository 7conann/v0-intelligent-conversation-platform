import { createClient } from "./client"

export async function getAgents() {
  const supabase = createClient()

  const { data, error } = await supabase.from("agents").select("*").eq("is_system", true).order("created_at")

  if (error) throw error
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

  const { data, error } = await supabase
    .from("custom_agents")
    .select("*")
    .eq("user_id", userId)
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })

  if (error) throw error
  return data
}

export async function createCustomAgent(
  userId: string,
  workspaceId: string,
  name: string,
  description: string,
  icon: string,
  color: string,
  agentIds: string[],
) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("custom_agents")
    .insert({
      user_id: userId,
      workspace_id: workspaceId,
      name,
      description,
      icon,
      color,
      agent_ids: agentIds,
      is_favorite: false,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function toggleCustomAgentFavorite(customAgentId: string, isFavorite: boolean) {
  const supabase = createClient()

  const { error } = await supabase.from("custom_agents").update({ is_favorite: isFavorite }).eq("id", customAgentId)

  if (error) throw error
}

export async function deleteCustomAgent(customAgentId: string) {
  const supabase = createClient()

  const { error } = await supabase.from("custom_agents").delete().eq("id", customAgentId)

  if (error) throw error
}
