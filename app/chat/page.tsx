"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ChatSidebar } from "@/components/chat-sidebar"
import { ChatArea } from "@/components/chat-area"
import type { Agent, Message, Chat } from "@/types/chat"

export default function ChatPage() {
  const router = useRouter()
  const [selectedAgents, setSelectedAgents] = useState<string[]>([])
  const [usedAgentsPerChat, setUsedAgentsPerChat] = useState<Record<string, string[]>>({ "1": [] })
  const [currentChatId, setCurrentChatId] = useState("1")
  const [chats, setChats] = useState<Chat[]>([
    { id: "1", name: "Conversa 1", contextMessages: undefined, usedAgentIds: [] },
  ])
  const [chatMessages, setChatMessages] = useState<Record<string, Message[]>>({ "1": [] })

  useEffect(() => {
    const isAuthenticated = localStorage.getItem("authenticated")
    if (!isAuthenticated) {
      router.push("/")
    }

    const savedTheme = localStorage.getItem("theme") || "dark"
    document.documentElement.classList.toggle("light", savedTheme === "light")
  }, [router])

  const agents: Agent[] = [
    { id: "1", name: "Estratégia", icon: "🎯", color: "#a78bfa" },
    { id: "2", name: "Dados", icon: "📊", color: "#60a5fa" },
    { id: "3", name: "RH", icon: "👥", color: "#34d399" },
    { id: "4", name: "Finanças", icon: "💰", color: "#fbbf24" },
    { id: "5", name: "Marketing", icon: "📱", color: "#f472b6" },
    { id: "6", name: "Vendas", icon: "🎁", color: "#fb923c" },
  ]

  const toggleAgent = (agentId: string) => {
    setSelectedAgents((prev) => (prev.includes(agentId) ? prev.filter((id) => id !== agentId) : [...prev, agentId]))
  }

  const markAgentAsUsed = (chatId: string, agentId: string) => {
    setUsedAgentsPerChat((prev) => {
      const currentUsed = prev[chatId] || []
      if (currentUsed.includes(agentId)) return prev
      return { ...prev, [chatId]: [...currentUsed, agentId] }
    })

    // Also update the chat object
    setChats((prev) =>
      prev.map((chat) => {
        if (chat.id === chatId) {
          const currentUsed = chat.usedAgentIds || []
          if (!currentUsed.includes(agentId)) {
            return { ...chat, usedAgentIds: [...currentUsed, agentId] }
          }
        }
        return chat
      }),
    )
  }

  const createNewChat = () => {
    const newChatId = String(chats.length + 1)
    const newChat: Chat = {
      id: newChatId,
      name: `Conversa ${newChatId}`,
      contextMessages: undefined,
      usedAgentIds: [],
    }
    setChats((prev) => [...prev, newChat])
    setCurrentChatId(newChatId)
    setChatMessages((prev) => ({ ...prev, [newChatId]: [] }))
    setUsedAgentsPerChat((prev) => ({ ...prev, [newChatId]: [] }))
  }

  const createChatWithMessages = (messages: Message[]) => {
    const newChatId = String(chats.length + 1)

    // Extract all unique agent IDs from the selected messages
    const usedAgentIds = Array.from(
      new Set(messages.filter((m) => m.usedAgentIds && m.usedAgentIds.length > 0).flatMap((m) => m.usedAgentIds || [])),
    )

    console.log("[v0] Creating new chat with messages. Extracted agent IDs:", usedAgentIds)

    const newChat: Chat = {
      id: newChatId,
      name: `Conversa ${newChatId}`,
      contextMessages: messages,
      usedAgentIds: usedAgentIds,
    }

    setChats((prev) => [...prev, newChat])
    setChatMessages((prev) => ({ ...prev, [newChatId]: [] }))
    setCurrentChatId(newChatId)
    setUsedAgentsPerChat((prev) => ({ ...prev, [newChatId]: usedAgentIds }))
  }

  const currentUsedAgents = usedAgentsPerChat[currentChatId] || []

  return (
    <div className="flex h-screen bg-[var(--app-bg)] overflow-hidden">
      <ChatSidebar
        agents={agents}
        selectedAgents={selectedAgents}
        usedAgents={currentUsedAgents}
        onToggleAgent={toggleAgent}
      />
      <ChatArea
        agents={agents}
        selectedAgents={selectedAgents}
        currentChatId={currentChatId}
        chats={chats}
        onCreateNewChat={createNewChat}
        onSwitchChat={setCurrentChatId}
        onMarkAgentAsUsed={(agentId) => markAgentAsUsed(currentChatId, agentId)}
        onCreateChatWithMessages={createChatWithMessages}
      />
    </div>
  )
}
