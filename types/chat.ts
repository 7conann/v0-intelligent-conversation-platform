export interface Agent {
  id: string
  name: string
  icon: string
  color: string
}

export interface Message {
  id: string
  content: string
  sender: "user" | "assistant"
  timestamp: Date
}

export interface Chat {
  id: string
  name: string
  contextMessages?: Message[]
}
