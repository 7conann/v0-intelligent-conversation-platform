export interface Agent {
  id: string
  name: string
  icon: string
  color: string
  trigger_word?: string
  group_id?: string
  group?: {
    id: string
    name: string
    icon: string
    display_order: number
  }
}

export interface Message {
  id: string
  content: string
  sender: "user" | "assistant"
  timestamp: Date
  usedAgentIds?: string[]
  originConversation?: string
}

export interface Chat {
  id: string
  name: string
  contextMessages?: Message[]
  usedAgentIds?: string[]
  agentHistories?: Record<string, Message[]>
  isFavorite?: boolean
}
