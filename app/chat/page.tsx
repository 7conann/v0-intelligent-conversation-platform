"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { ChatSidebar } from "@/components/chat-sidebar"
import { ChatArea } from "@/components/chat-area"
import { CustomAgentDialog } from "@/components/custom-agent-dialog"
import type { Agent, Message, Chat, CustomAgent } from "@/types/chat"

export default function ChatPage() {
  const router = useRouter()
  const [selectedAgentsByChat, setSelectedAgentsByChat] = useState<Record<string, string[]>>({ "1": [] })
  const [usedAgentsPerChat, setUsedAgentsPerChat] = useState<Record<string, string[]>>({ "1": [] })
  const [currentChatId, setCurrentChatId] = useState("1")
  const [favoriteAgents, setFavoriteAgents] = useState<string[]>([])
  const [showArchived, setShowArchived] = useState(false)
  const [customAgents, setCustomAgents] = useState<CustomAgent[]>([])
  const [showCustomAgentDialog, setShowCustomAgentDialog] = useState(false)

  const [chats, setChats] = useState<Chat[]>([
    {
      id: "1",
      name: "Conversa 1",
      contextMessages: undefined,
      usedAgentIds: [],
      agentHistories: {},
      isFavorite: false,
      isArchived: false,
    },
  ])
  const [chatMessages, setChatMessages] = useState<Record<string, Message[]>>({ "1": [] })

  const systemAgents: Agent[] = [
    { id: "1", name: "Estratégia", icon: "🎯", color: "#a78bfa" },
    { id: "2", name: "Dados", icon: "📊", color: "#60a5fa" },
    { id: "3", name: "RH", icon: "👥", color: "#34d399" },
    { id: "4", name: "Finanças", icon: "💰", color: "#fbbf24" },
    { id: "5", name: "Marketing", icon: "📱", color: "#f472b6" },
    { id: "6", name: "Vendas", icon: "🎁", color: "#fb923c" },
  ]

  const agents: Agent[] = [
    ...systemAgents,
    ...customAgents.map((ca) => ({
      id: ca.id,
      name: ca.name,
      icon: ca.icon,
      color: ca.color,
      isCustom: true,
      composedAgentIds: ca.composedAgentIds,
    })),
  ]

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
    const savedSelectedAgents = localStorage.getItem("selectedAgentsByChat")
    const savedFavoriteAgents = localStorage.getItem("favoriteAgents")
    const savedCustomAgents = localStorage.getItem("customAgents")

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
          isFavorite: chat.isFavorite || false,
          isArchived: chat.isArchived || false,
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

    if (savedSelectedAgents) {
      try {
        setSelectedAgentsByChat(JSON.parse(savedSelectedAgents))
      } catch (e) {
        console.error("[v0] Error loading selected agents:", e)
      }
    }

    if (savedFavoriteAgents) {
      try {
        setFavoriteAgents(JSON.parse(savedFavoriteAgents))
      } catch (e) {
        console.error("[v0] Error loading favorite agents:", e)
      }
    }

    if (savedCustomAgents) {
      try {
        const parsed = JSON.parse(savedCustomAgents)
        const customAgentsWithDates = parsed.map((agent: any) => ({
          ...agent,
          createdAt: new Date(agent.createdAt),
        }))
        setCustomAgents(customAgentsWithDates)
      } catch (e) {
        console.error("[v0] Error loading custom agents:", e)
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
    localStorage.setItem("selectedAgentsByChat", JSON.stringify(selectedAgentsByChat))
  }, [selectedAgentsByChat])

  useEffect(() => {
    localStorage.setItem("currentChatId", currentChatId)
  }, [currentChatId])

  useEffect(() => {
    localStorage.setItem("favoriteAgents", JSON.stringify(favoriteAgents))
  }, [favoriteAgents])

  useEffect(() => {
    localStorage.setItem("customAgents", JSON.stringify(customAgents))
  }, [customAgents])

  const toggleAgent = useCallback(
    (agentId: string) => {
      setSelectedAgentsByChat((prev) => {
        const currentSelected = prev[currentChatId] || []
        const isCurrentlySelected = currentSelected.includes(agentId)

        const agent = systemAgents.find((a) => a.id === agentId)
        if (agent?.isCustom && agent.composedAgentIds) {
          if (!isCurrentlySelected) {
            agent.composedAgentIds.forEach((id) => markAgentAsUsed(currentChatId, id))
            const newSelected = [...new Set([...currentSelected, agentId, ...agent.composedAgentIds])]
            return { ...prev, [currentChatId]: newSelected }
          } else {
            const filtered = currentSelected.filter((id) => id !== agentId && !agent.composedAgentIds?.includes(id))
            return { ...prev, [currentChatId]: filtered }
          }
        }

        if (!isCurrentlySelected) {
          markAgentAsUsed(currentChatId, agentId)
        }

        return {
          ...prev,
          [currentChatId]: isCurrentlySelected
            ? currentSelected.filter((id) => id !== agentId)
            : [...currentSelected, agentId],
        }
      })
    },
    [currentChatId],
  )

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
        isFavorite: false,
        isArchived: false,
      }
      setCurrentChatId(newChatId)
      setChatMessages((prevMessages) => ({ ...prevMessages, [newChatId]: [] }))
      setUsedAgentsPerChat((prevUsed) => ({ ...prevUsed, [newChatId]: [] }))
      setSelectedAgentsByChat((prevSelected) => ({ ...prevSelected, [newChatId]: [] }))
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
        isFavorite: false,
        isArchived: false,
      }

      setChatMessages((prev) => ({ ...prev, [newChatId]: [] }))
      setCurrentChatId(newChatId)
      setUsedAgentsPerChat((prev) => ({ ...prev, [newChatId]: usedAgentIds }))
      setSelectedAgentsByChat((prev) => ({ ...prev, [newChatId]: [] }))

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
      setSelectedAgentsByChat((prev) => {
        const newSelected = { ...prev }
        delete newSelected[chatId]
        return newSelected
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
      const sortedMessages = [...messages].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())

      const usedAgentIds = Array.from(
        new Set(
          sortedMessages
            .filter((m) => m.usedAgentIds && m.usedAgentIds.length > 0)
            .flatMap((m) => m.usedAgentIds || []),
        ),
      )

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

      const newChatId = String(chats.length + 1)
      const newChat: Chat = {
        ...chat,
        id: newChatId,
        name: `Conversa ${newChatId} (Importada)`,
        usedAgentIds,
        agentHistories,
        isFavorite: false,
        isArchived: false,
      }

      setChats((prev) => [...prev, newChat])
      setChatMessages((prev) => ({ ...prev, [newChatId]: sortedMessages }))
      setUsedAgentsPerChat((prev) => ({ ...prev, [newChatId]: usedAgentIds }))
      setSelectedAgentsByChat((prev) => ({ ...prev, [newChatId]: [] }))

      setCurrentChatId(newChatId)
    },
    [chats],
  )

  const toggleChatFavorite = useCallback((chatId: string) => {
    setChats((prev) =>
      prev.map((chat) => {
        if (chat.id === chatId) {
          return { ...chat, isFavorite: !chat.isFavorite }
        }
        return chat
      }),
    )
  }, [])

  const toggleChatArchive = useCallback((chatId: string) => {
    setChats((prev) =>
      prev.map((chat) => {
        if (chat.id === chatId) {
          return { ...chat, isArchived: !chat.isArchived }
        }
        return chat
      }),
    )
  }, [])

  const toggleAgentFavorite = useCallback((agentId: string) => {
    setFavoriteAgents((prev) => {
      if (prev.includes(agentId)) {
        return prev.filter((id) => id !== agentId)
      }
      return [...prev, agentId]
    })
  }, [])

  const createCustomAgent = useCallback((customAgent: Omit<CustomAgent, "id" | "createdAt">) => {
    const newAgent: CustomAgent = {
      ...customAgent,
      id: `custom-${Date.now()}`,
      createdAt: new Date(),
    }
    setCustomAgents((prev) => [...prev, newAgent])
  }, [])

  const deleteCustomAgent = useCallback((agentId: string) => {
    setCustomAgents((prev) => prev.filter((a) => a.id !== agentId))
    setFavoriteAgents((prev) => prev.filter((id) => id !== agentId))
    setSelectedAgentsByChat((prev) => {
      const updated = { ...prev }
      Object.keys(updated).forEach((chatId) => {
        updated[chatId] = updated[chatId].filter((id) => id !== agentId)
      })
      return updated
    })
  }, [])

  const currentUsedAgents = usedAgentsPerChat[currentChatId] || []
  const currentSelectedAgents = selectedAgentsByChat[currentChatId] || []
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

  const visibleChats = showArchived ? chats.filter((c) => c.isArchived) : chats.filter((c) => !c.isArchived)

  return (
    <div className="flex h-screen bg-[var(--app-bg)] overflow-hidden">
      <ChatSidebar
        agents={agents}
        selectedAgents={currentSelectedAgents}
        usedAgents={currentUsedAgents}
        onToggleAgent={toggleAgent}
        agentHistories={currentAgentHistories}
        favoriteAgents={favoriteAgents}
        onToggleAgentFavorite={toggleAgentFavorite}
        onCreateCustomAgent={() => setShowCustomAgentDialog(true)}
        onDeleteCustomAgent={deleteCustomAgent}
      />
      <ChatArea
        agents={agents}
        selectedAgents={currentSelectedAgents}
        currentChatId={currentChatId}
        chats={visibleChats}
        onCreateNewChat={createNewChat}
        onSwitchChat={setCurrentChatId}
        onMarkAgentAsUsed={(agentId) => markAgentAsUsed(currentChatId, agentId)}
        onCreateChatWithMessages={createChatWithMessages}
        onDeleteChat={deleteChat}
        onReorderChat={reorderChatByDrop}
        onImportChat={importChat}
        messages={chatMessages}
        onAddMessage={addMessage}
        onToggleChatFavorite={toggleChatFavorite}
        onToggleChatArchive={toggleChatArchive}
        showArchived={showArchived}
        onToggleShowArchived={() => setShowArchived(!showArchived)}
      />
      <CustomAgentDialog
        isOpen={showCustomAgentDialog}
        onClose={() => setShowCustomAgentDialog(false)}
        agents={systemAgents}
        onCreateCustomAgent={createCustomAgent}
      />
    </div>
  )
}
