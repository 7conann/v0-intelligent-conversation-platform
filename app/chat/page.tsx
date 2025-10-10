"use client"

import { useEffect, useState, useCallback } from "react"
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
    { id: "1", name: "Conversa 1", contextMessages: undefined, usedAgentIds: [], agentHistories: {} },
  ])
  const [chatMessages, setChatMessages] = useState<Record<string, Message[]>>({ "1": [] })

  useEffect(() => {
    const isAuthenticated = localStorage.getItem("authenticated")
    if (!isAuthenticated) {
      router.push("/")
      return
    }

    const savedTheme = localStorage.getItem("theme") || "dark"
    document.documentElement.classList.toggle("light", savedTheme === "light")

    const savedChats = localStorage.getItem("chats")
    const savedMessages = localStorage.getItem("chatMessages")
    const savedUsedAgents = localStorage.getItem("usedAgentsPerChat")
    const savedCurrentChatId = localStorage.getItem("currentChatId")

    if (savedChats) {
      try {
        const parsedChats = JSON.parse(savedChats)
        const chatsWithDates = parsedChats.map((chat: any) => ({
          ...chat,
          contextMessages: chat.contextMessages?.map((m: any) => ({
            ...m,
            timestamp: new Date(m.timestamp),
          })),
          agentHistories: chat.agentHistories || {},
        }))
        setChats(chatsWithDates)
      } catch (e) {
        console.error("[v0] Error loading chats:", e)
      }
    }

    if (savedMessages) {
      try {
        const parsedMessages = JSON.parse(savedMessages)
        const messagesWithDates: Record<string, Message[]> = {}
        Object.keys(parsedMessages).forEach((chatId) => {
          messagesWithDates[chatId] = parsedMessages[chatId].map((m: any) => ({
            ...m,
            timestamp: new Date(m.timestamp),
          }))
        })
        setChatMessages(messagesWithDates)
      } catch (e) {
        console.error("[v0] Error loading messages:", e)
      }
    }

    if (savedUsedAgents) {
      try {
        setUsedAgentsPerChat(JSON.parse(savedUsedAgents))
      } catch (e) {
        console.error("[v0] Error loading used agents:", e)
      }
    }

    if (savedCurrentChatId) {
      setCurrentChatId(savedCurrentChatId)
    }
  }, [router])

  useEffect(() => {
    localStorage.setItem("chats", JSON.stringify(chats))
  }, [chats])

  useEffect(() => {
    localStorage.setItem("chatMessages", JSON.stringify(chatMessages))
  }, [chatMessages])

  useEffect(() => {
    localStorage.setItem("usedAgentsPerChat", JSON.stringify(usedAgentsPerChat))
  }, [usedAgentsPerChat])

  useEffect(() => {
    localStorage.setItem("currentChatId", currentChatId)
  }, [currentChatId])

  useEffect(() => {
    setSelectedAgents([])
  }, [currentChatId])

  const agents: Agent[] = [
    { id: "1", name: "Estratégia", icon: "🎯", color: "#a78bfa" },
    { id: "2", name: "Dados", icon: "📊", color: "#60a5fa" },
    { id: "3", name: "RH", icon: "👥", color: "#34d399" },
    { id: "4", name: "Finanças", icon: "💰", color: "#fbbf24" },
    { id: "5", name: "Marketing", icon: "📱", color: "#f472b6" },
    { id: "6", name: "Vendas", icon: "🎁", color: "#fb923c" },
  ]

  const toggleAgent = useCallback((agentId: string) => {
    setSelectedAgents((prev) => (prev.includes(agentId) ? prev.filter((id) => id !== agentId) : [...prev, agentId]))
  }, [])

  const markAgentAsUsed = useCallback((chatId: string, agentId: string) => {
    setUsedAgentsPerChat((prev) => {
      const currentUsed = prev[chatId] || []
      if (currentUsed.includes(agentId)) return prev
      return { ...prev, [chatId]: [...currentUsed, agentId] }
    })

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
  }, [])

  const addMessage = useCallback((chatId: string, message: Message) => {
    setChatMessages((prev) => ({
      ...prev,
      [chatId]: [...(prev[chatId] || []), message],
    }))
  }, [])

  const createNewChat = useCallback(() => {
    setChats((prev) => {
      const newChatId = String(prev.length + 1)
      const newChat: Chat = {
        id: newChatId,
        name: `Conversa ${newChatId}`,
        contextMessages: undefined,
        usedAgentIds: [],
        agentHistories: {},
      }
      setCurrentChatId(newChatId)
      setChatMessages((prevMessages) => ({ ...prevMessages, [newChatId]: [] }))
      setUsedAgentsPerChat((prevUsed) => ({ ...prevUsed, [newChatId]: [] }))
      setSelectedAgents([]) // Clear selected agents when creating a new chat
      return [...prev, newChat]
    })
  }, [])

  const createChatWithMessages = useCallback((messages: Message[]) => {
    setChats((prev) => {
      const newChatId = String(prev.length + 1)

      const usedAgentIds = Array.from(
        new Set(
          messages.filter((m) => m.usedAgentIds && m.usedAgentIds.length > 0).flatMap((m) => m.usedAgentIds || []),
        ),
      )

      const agentHistories: Record<string, Message[]> = {}
      messages.forEach((message) => {
        if (message.usedAgentIds) {
          message.usedAgentIds.forEach((agentId) => {
            if (!agentHistories[agentId]) {
              agentHistories[agentId] = []
            }
            agentHistories[agentId].push(message)
          })
        }
      })

      const newChat: Chat = {
        id: newChatId,
        name: `Conversa ${newChatId}`,
        contextMessages: messages,
        usedAgentIds: usedAgentIds,
        agentHistories: agentHistories,
      }

      setChatMessages((prev) => ({ ...prev, [newChatId]: [] }))
      setCurrentChatId(newChatId)
      setUsedAgentsPerChat((prev) => ({ ...prev, [newChatId]: usedAgentIds }))

      return [...prev, newChat]
    })
  }, [])

  const deleteChat = useCallback(
    (chatId: string) => {
      if (chats.length === 1) {
        alert("Você não pode deletar a última conversa!")
        return
      }

      setChats((prev) => prev.filter((c) => c.id !== chatId))
      setChatMessages((prev) => {
        const newMessages = { ...prev }
        delete newMessages[chatId]
        return newMessages
      })
      setUsedAgentsPerChat((prev) => {
        const newUsed = { ...prev }
        delete newUsed[chatId]
        return newUsed
      })

      if (currentChatId === chatId) {
        const remainingChats = chats.filter((c) => c.id !== chatId)
        setCurrentChatId(remainingChats[0].id)
      }
    },
    [chats, currentChatId],
  )

  const reorderChatByDrop = useCallback(
    (draggedChatId: string, targetChatId: string) => {
      const draggedIndex = chats.findIndex((c) => c.id === draggedChatId)
      const targetIndex = chats.findIndex((c) => c.id === targetChatId)

      if (draggedIndex === -1 || targetIndex === -1 || draggedIndex === targetIndex) return

      const newChats = [...chats]
      const [draggedChat] = newChats.splice(draggedIndex, 1)
      newChats.splice(targetIndex, 0, draggedChat)
      setChats(newChats)
    },
    [chats],
  )

  const importChat = useCallback(
    (chat: Chat, messages: Message[]) => {
      // Sort messages by timestamp to ensure correct order
      const sortedMessages = [...messages].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())

      // Extract used agent IDs from messages
      const usedAgentIds = Array.from(
        new Set(
          sortedMessages
            .filter((m) => m.usedAgentIds && m.usedAgentIds.length > 0)
            .flatMap((m) => m.usedAgentIds || []),
        ),
      )

      // Build agent histories from messages
      const agentHistories: Record<string, Message[]> = {}
      sortedMessages.forEach((message) => {
        if (message.usedAgentIds) {
          message.usedAgentIds.forEach((agentId) => {
            if (!agentHistories[agentId]) {
              agentHistories[agentId] = []
            }
            agentHistories[agentId].push(message)
          })
        }
      })

      // Create new chat with imported data
      const newChatId = String(chats.length + 1)
      const newChat: Chat = {
        ...chat,
        id: newChatId,
        name: `Conversa ${newChatId} (Importada)`,
        usedAgentIds,
        agentHistories,
      }

      // Add chat and messages
      setChats((prev) => [...prev, newChat])
      setChatMessages((prev) => ({ ...prev, [newChatId]: sortedMessages }))
      setUsedAgentsPerChat((prev) => ({ ...prev, [newChatId]: usedAgentIds }))

      // Switch to the new imported chat
      setCurrentChatId(newChatId)
    },
    [chats],
  )

  const currentUsedAgents = usedAgentsPerChat[currentChatId] || []
  const currentChat = chats.find((c) => c.id === currentChatId)

  const currentAgentHistories: Record<string, Message[]> = {}
  const currentChatMessages = chatMessages[currentChatId] || []
  currentChatMessages.forEach((message) => {
    if (message.usedAgentIds) {
      message.usedAgentIds.forEach((agentId) => {
        if (!currentAgentHistories[agentId]) {
          currentAgentHistories[agentId] = []
        }
        currentAgentHistories[agentId].push(message)
      })
    }
  })

  return (
    <div className="flex h-screen bg-[var(--app-bg)] overflow-hidden">
      <ChatSidebar
        agents={agents}
        selectedAgents={selectedAgents}
        usedAgents={currentUsedAgents}
        onToggleAgent={toggleAgent}
        agentHistories={currentAgentHistories}
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
        onDeleteChat={deleteChat}
        onReorderChat={reorderChatByDrop}
        onImportChat={importChat}
        messages={chatMessages}
        onAddMessage={addMessage}
      />
    </div>
  )
}
