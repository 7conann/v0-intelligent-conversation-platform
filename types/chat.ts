export interface Agent {
  id: string
  name: string
  icon: string
  color: string
  isCustom?: boolean
  composedAgentIds?: string[]
}

export interface Attachment {
  id: string
  url: string
  filename: string
  size: number
  type: string
  uploadedAt: Date
}

export interface Message {
  id: string
  content: string
  sender: "user" | "assistant"
  timestamp: Date
  usedAgentIds?: string[]
  attachments?: Attachment[]
}

export interface Chat {
  id: string
  name: string
  contextMessages?: Message[]
  usedAgentIds?: string[]
  agentHistories?: Record<string, Message[]>
  isFavorite?: boolean
  isArchived?: boolean
}

export interface CustomAgent {
  id: string
  name: string
  icon: string
  color: string
  composedAgentIds: string[]
  createdAt: Date
}
