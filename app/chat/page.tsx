"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ChatSidebar } from "@/components/chat-sidebar"
import { ChatArea } from "@/components/chat-area"
import type { Agent, Message } from "@/types/chat"

export default function ChatPage() {
  const router = useRouter()
  const [selectedAgents, setSelectedAgents] = useState<string[]>([])
  const [usedAgents, setUsedAgents] = useState<string[]>([])
  const [currentChatId, setCurrentChatId] = useState("1")
  const [chats, setChats] = useState([{ id: "1", name: "Conversa 1", contextMessages: undefined }])
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

  const markAgentAsUsed = (agentId: string) => {
    if (!usedAgents.includes(agentId)) {
      setUsedAgents((prev) => [...prev, agentId])
    }
  }

  const createNewChat = () => {
    const newChatId = String(chats.length + 1)
    const newChat = {
      id: newChatId,
      name: `Conversa ${newChatId}`,
      contextMessages: undefined,
    }
    setChats((prev) => [...prev, newChat])
    setCurrentChatId(newChatId)
    setChatMessages((prev) => ({ ...prev, [newChatId]: [] }))
  }

  const createChatWithMessages = (messages: Message[]) => {
    const newChatId = String(chats.length + 1)
    const newChat = {
      id: newChatId,
      name: `Conversa ${newChatId}`,
      contextMessages: messages,
    }
    setChats((prev) => [...prev, newChat])
    setChatMessages((prev) => ({ ...prev, [newChatId]: [] }))
    setCurrentChatId(newChatId)
  }

  return (
    <div className="flex h-screen bg-[var(--app-bg)] overflow-hidden">
      <ChatSidebar
        agents={agents}
        selectedAgents={selectedAgents}
        usedAgents={usedAgents}
        onToggleAgent={toggleAgent}
      />
      <ChatArea
        agents={agents}
        selectedAgents={selectedAgents}
        currentChatId={currentChatId}
        chats={chats}
        onCreateNewChat={createNewChat}
        onSwitchChat={setCurrentChatId}
        onMarkAgentAsUsed={markAgentAsUsed}
        onCreateChatWithMessages={createChatWithMessages}
      />
    </div>
  )
}
