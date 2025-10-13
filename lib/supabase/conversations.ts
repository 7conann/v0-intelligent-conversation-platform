import { createClient } from "./client"

function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}

export async function saveConversation(
  userId: string,
  workspaceId: string,
  title: string,
  agentIds: string[],
  isFavorite = false,
) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("conversations")
    .insert({
      user_id: userId,
      workspace_id: workspaceId,
      title,
      is_favorite: isFavorite,
      is_archived: false,
    })
    .select()
    .single()

  if (error) throw error

  // Save conversation agents
  if (agentIds.length > 0 && data) {
    const conversationAgents = agentIds.map((agentId) => ({
      conversation_id: data.id,
      agent_id: agentId,
      is_selected: true,
      is_used: false,
      message_count: 0,
    }))

    await supabase.from("conversation_agents").insert(conversationAgents)
  }

  return data
}

export async function saveMessage(
  userId: string,
  conversationId: string,
  content: string,
  role: "user" | "assistant",
  agentIds: string[] = [],
  attachments: any[] = [],
) {
  const supabase = createClient()

  const validAgentIds = agentIds.filter((id) => isValidUUID(id))

  console.log("[v0] Saving message with agent IDs:", { original: agentIds, valid: validAgentIds })

  const { data, error } = await supabase
    .from("messages")
    .insert({
      user_id: userId,
      conversation_id: conversationId,
      content,
      role,
      agent_ids: validAgentIds,
      attachments: attachments.length > 0 ? attachments : null,
      is_selected: false,
    })
    .select()
    .single()

  if (error) throw error

  // Update conversation agents usage
  if (validAgentIds.length > 0) {
    for (const agentId of validAgentIds) {
      await supabase.rpc("increment_agent_message_count", {
        p_conversation_id: conversationId,
        p_agent_id: agentId,
      })
    }
  }

  return data
}

export async function getConversations(userId: string, workspaceId: string) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("conversations")
    .select(
      `
      *,
      conversation_agents (
        agent_id,
        is_selected,
        is_used,
        message_count
      )
    `,
    )
    .eq("user_id", userId)
    .eq("workspace_id", workspaceId)
    .order("position", { ascending: true })
    .order("created_at", { ascending: false })

  if (error) throw error
  return data
}

export async function getMessages(conversationId: string) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })

  if (error) throw error
  return data
}

export async function toggleConversationFavorite(conversationId: string, isFavorite: boolean) {
  const supabase = createClient()

  const { error } = await supabase.from("conversations").update({ is_favorite: isFavorite }).eq("id", conversationId)

  if (error) throw error
}

export async function archiveConversation(conversationId: string) {
  const supabase = createClient()

  const { error } = await supabase.from("conversations").update({ is_archived: true }).eq("id", conversationId)

  if (error) throw error
}

export async function deleteConversation(conversationId: string) {
  const supabase = createClient()

  // Delete messages first
  await supabase.from("messages").delete().eq("conversation_id", conversationId)

  // Delete conversation agents
  await supabase.from("conversation_agents").delete().eq("conversation_id", conversationId)

  // Delete conversation
  const { error } = await supabase.from("conversations").delete().eq("id", conversationId)

  if (error) throw error
}

export async function updateConversationTitle(conversationId: string, title: string) {
  const supabase = createClient()

  const { error } = await supabase.from("conversations").update({ title }).eq("id", conversationId)

  if (error) throw error
}
