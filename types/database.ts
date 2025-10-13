export interface Profile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface Workspace {
  id: string
  name: string
  description: string | null
  user_id: string
  created_at: string
  updated_at: string
}

export interface Agent {
  id: string
  name: string
  icon: string
  color: string
  api_key: string | null
  password: string | null
  workspace_id: string | null
  created_at: string
}

export interface CustomAgent {
  id: string
  name: string
  icon: string
  user_id: string
  agent_ids: string[]
  created_at: string
}

export interface AgentFavorite {
  id: string
  user_id: string
  agent_id: string
  created_at: string
}

export interface Conversation {
  id: string
  title: string
  user_id: string
  workspace_id: string | null
  is_favorite: boolean
  is_archived: boolean
  created_at: string
  updated_at: string
}
