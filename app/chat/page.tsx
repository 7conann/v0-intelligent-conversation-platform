"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { ChatSidebar } from "@/components/chat-sidebar"
import { ChatArea } from "@/components/chat-area"
import type { Agent, Message, Chat } from "@/types/chat"
import { useToast } from "@/components/ui/toast"
import { createClient } from "@/lib/supabase/client"
import {
  saveConversation,
  saveMessage,
  getConversations,
  getMessages,
  toggleConversationFavorite,
  deleteConversation as deleteConversationDB,
} from "@/lib/supabase/conversations"

export default function ChatPage() {
  const router = useRouter()
  const { addToast } = useToast()
  const [selectedAgentsByChat, setSelectedAgentsByChat] = useState<Record<string, string[]>>({})
  const [usedAgentsPerChat, setUsedAgentsPerChat] = useState<Record<string, string[]>>({})
  const [currentChatId, setCurrentChatId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [workspaceId, setWorkspaceId] = useState<string | null>(null)
  const [isLoadingConversations, setIsLoadingConversations] = useState(true)
  const [agents, setAgents] = useState<Agent[]>([])
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)

  const [chats, setChats] = useState<Chat[]>([])
  const [chatMessages, setChatMessages] = useState<Record<string, Message[]>>({})

  useEffect(() => {
    const loadUserAndConversations = async () => {
      const supabase = createClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (session) {
        setUserId(session.user.id)

        try {
          const { data: agentsData, error: agentsError } = await supabase
            .from("agents")
            .select("*")
            .eq("is_system", true)
            .order("created_at", { ascending: true })

          if (agentsError) throw agentsError

          if (agentsData) {
            const loadedAgents: Agent[] = agentsData.map((agent) => ({
              id: agent.id,
              name: agent.name,
              icon: agent.icon,
              color: agent.color,
              trigger_word: agent.trigger_word,
            }))
            console.log(
              "[v0] 📥 Agentes carregados inicialmente:",
              loadedAgents.map((a) => ({
                name: a.name,
                trigger_word: a.trigger_word,
              })),
            )
            setAgents(loadedAgents)
          }
        } catch (error) {
          console.error("[v0] Error loading agents:", error)
          addToast({
            title: "Erro ao carregar agentes",
            description: "Não foi possível carregar os agentes do banco de dados",
            variant: "error",
          })
        }

        const { data: workspaces } = await supabase
          .from("workspaces")
          .select("*")
          .eq("user_id", session.user.id)
          .limit(1)

        let workspace = workspaces?.[0]

        if (!workspace) {
          const { data: newWorkspace } = await supabase
            .from("workspaces")
            .insert({
              user_id: session.user.id,
              name: "Workspace Padrão",
            })
            .select()
            .single()

          workspace = newWorkspace
        }

        if (workspace) {
          setWorkspaceId(workspace.id)

          try {
            const conversations = await getConversations(session.user.id, workspace.id)

            if (!conversations || conversations.length === 0) {
              const defaultConversation = await saveConversation(session.user.id, workspace.id, "Conversa 1", [], false)

              const newChat: Chat = {
                id: defaultConversation.id,
                name: defaultConversation.title,
                contextMessages: undefined,
                usedAgentIds: [],
                agentHistories: {},
                isFavorite: false,
              }

              setChats([newChat])
              setCurrentChatId(defaultConversation.id)
              setChatMessages({ [defaultConversation.id]: [] })
              setUsedAgentsPerChat({ [defaultConversation.id]: [] })
              setSelectedAgentsByChat({ [defaultConversation.id]: [] })
            } else {
              const loadedChats: Chat[] = await Promise.all(
                conversations.map(async (conv) => {
                  const messages = await getMessages(conv.id)

                  const agentHistories: Record<string, Message[]> = {}
                  const usedAgentIds: string[] = []

                  messages.forEach((msg) => {
                    if (msg.agent_ids && msg.agent_ids.length > 0) {
                      msg.agent_ids.forEach((agentId: string) => {
                        if (!agentHistories[agentId]) {
                          agentHistories[agentId] = []
                          usedAgentIds.push(agentId)
                        }
                        agentHistories[agentId].push({
                          id: msg.id,
                          content: msg.content,
                          sender: msg.role,
                          timestamp: new Date(msg.created_at),
                          usedAgentIds: msg.agent_ids,
                        })
                      })
                    }
                  })

                  return {
                    id: conv.id,
                    name: conv.title,
                    contextMessages: undefined,
                    usedAgentIds: Array.from(new Set(usedAgentIds)),
                    agentHistories,
                    isFavorite: conv.is_favorite,
                  }
                }),
              )

              setChats(loadedChats)

              const loadedMessages: Record<string, Message[]> = {}
              const loadedUsedAgents: Record<string, string[]> = {}
              const loadedSelectedAgents: Record<string, string[]> = {}

              await Promise.all(
                conversations.map(async (conv) => {
                  const messages = await getMessages(conv.id)
                  loadedMessages[conv.id] = messages.map((msg) => ({
                    id: msg.id,
                    content: msg.content,
                    sender: msg.role,
                    timestamp: new Date(msg.created_at),
                    usedAgentIds: msg.agent_ids || [],
                  }))

                  const usedAgents =
                    conv.conversation_agents?.filter((ca: any) => ca.is_used).map((ca: any) => ca.agent_id) || []
                  loadedUsedAgents[conv.id] = usedAgents

                  const selectedAgents =
                    conv.conversation_agents?.filter((ca: any) => ca.is_selected).map((ca: any) => ca.agent_id) || []
                  loadedSelectedAgents[conv.id] = selectedAgents
                }),
              )

              setChatMessages(loadedMessages)
              setUsedAgentsPerChat(loadedUsedAgents)
              setSelectedAgentsByChat(loadedSelectedAgents)
              setCurrentChatId(loadedChats[0].id)
            }
          } catch (error) {
            console.error("[v0] Error loading conversations:", error)
            addToast({
              title: "Erro ao carregar conversas",
              description: "Não foi possível carregar suas conversas do banco de dados",
              variant: "error",
            })
          }
        }
      }

      setIsLoadingConversations(false)
    }

    loadUserAndConversations()
  }, [addToast])

  useEffect(() => {
    const reloadAgents = async () => {
      console.log("[v0] 🔄 Página ficou visível, recarregando agentes do banco...")
      const supabase = createClient()

      try {
        const { data: agentsData, error: agentsError } = await supabase
          .from("agents")
          .select("*")
          .eq("is_system", true)
          .order("created_at", { ascending: true })

        if (agentsError) throw agentsError

        if (agentsData) {
          const loadedAgents: Agent[] = agentsData.map((agent) => ({
            id: agent.id,
            name: agent.name,
            icon: agent.icon,
            color: agent.color,
            trigger_word: agent.trigger_word,
          }))
          console.log(
            "[v0] ✅ Agentes recarregados do banco:",
            loadedAgents.map((a) => ({
              name: a.name,
              trigger_word: a.trigger_word,
            })),
          )
          setAgents(loadedAgents)
        }
      } catch (error) {
        console.error("[v0] ❌ Erro ao recarregar agentes:", error)
      }
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        console.log("[v0] 👁️ Página ficou visível, iniciando reload de agentes...")
        reloadAgents()
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [])

  const toggleAgent = useCallback(
    (agentId: string) => {
      if (!currentChatId) return

      setSelectedAgentsByChat((prev) => {
        const currentSelected = prev[currentChatId] || []
        const isCurrentlySelected = currentSelected.includes(agentId)

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

  const addMessage = useCallback(
    async (chatId: string, message: Message) => {
      setChatMessages((prev) => ({
        ...prev,
        [chatId]: [...(prev[chatId] || []), message],
      }))

      if (userId && workspaceId) {
        try {
          await saveMessage(userId, chatId, message.content, message.sender, message.usedAgentIds || [], [])
        } catch (error: any) {
          console.error("[v0] Error saving message:", error?.message || error)
          addToast({
            title: "Erro ao salvar mensagem",
            description: "A mensagem foi enviada mas não foi salva no banco de dados",
            variant: "error",
          })
        }
      }
    },
    [userId, workspaceId, addToast],
  )

  const createNewChat = useCallback(async () => {
    if (!userId || !workspaceId) return

    try {
      const newConversation = await saveConversation(userId, workspaceId, `Conversa ${chats.length + 1}`, [], false)

      const newChat: Chat = {
        id: newConversation.id,
        name: newConversation.title,
        contextMessages: undefined,
        usedAgentIds: [],
        agentHistories: {},
        isFavorite: false,
      }

      setChats((prev) => [...prev, newChat])
      setCurrentChatId(newConversation.id)
      setChatMessages((prevMessages) => ({ ...prevMessages, [newConversation.id]: [] }))
      setUsedAgentsPerChat((prevUsed) => ({ ...prevUsed, [newConversation.id]: [] }))
      setSelectedAgentsByChat((prevSelected) => ({ ...prevSelected, [newConversation.id]: [] }))
    } catch (error) {
      console.error("[v0] Error creating conversation:", error)
      addToast({
        title: "Erro ao criar conversa",
        description: "Não foi possível criar uma nova conversa",
        variant: "error",
      })
    }
  }, [userId, workspaceId, chats, addToast])

  const createChatWithMessages = useCallback(
    async (messages: Message[]) => {
      if (!userId || !workspaceId) return

      try {
        const usedAgentIds = Array.from(
          new Set(
            messages.filter((m) => m.usedAgentIds && m.usedAgentIds.length > 0).flatMap((m) => m.usedAgentIds || []),
          ),
        )

        const newConversation = await saveConversation(
          userId,
          workspaceId,
          `Conversa ${chats.length + 1}`,
          usedAgentIds,
          false,
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
          id: newConversation.id,
          name: newConversation.title,
          contextMessages: messages,
          usedAgentIds: usedAgentIds,
          agentHistories: agentHistories,
          isFavorite: false,
        }

        setChats((prev) => [...prev, newChat])
        setChatMessages((prev) => ({ ...prev, [newConversation.id]: [] }))
        setCurrentChatId(newConversation.id)
        setUsedAgentsPerChat((prev) => ({ ...prev, [newConversation.id]: usedAgentIds }))
        setSelectedAgentsByChat((prev) => ({ ...prev, [newConversation.id]: [] }))

        for (const message of messages) {
          await saveMessage(userId, newConversation.id, message.content, message.sender, message.usedAgentIds || [], [])
        }
      } catch (error) {
        console.error("[v0] Error creating chat with messages:", error)
        addToast({
          title: "Erro ao criar conversa",
          description: "Não foi possível criar a conversa com as mensagens",
          variant: "error",
        })
      }
    },
    [userId, workspaceId, chats, addToast],
  )

  const deleteChat = useCallback(
    async (chatId: string) => {
      if (chats.length === 1) {
        addToast({
          title: "Ação não permitida",
          description: "Você não pode deletar a última conversa!",
          variant: "error",
        })
        return
      }

      try {
        await deleteConversationDB(chatId)

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
      } catch (error) {
        console.error("[v0] Error deleting conversation:", error)
        addToast({
          title: "Erro ao deletar conversa",
          description: "Não foi possível deletar a conversa",
          variant: "error",
        })
      }
    },
    [chats, currentChatId, addToast],
  )

  const toggleFavorite = useCallback(
    async (chatId: string) => {
      const chat = chats.find((c) => c.id === chatId)
      if (!chat) return

      const newFavoriteStatus = !chat.isFavorite

      try {
        await toggleConversationFavorite(chatId, newFavoriteStatus)

        setChats((prev) => prev.map((c) => (c.id === chatId ? { ...c, isFavorite: newFavoriteStatus } : c)))

        addToast({
          title: newFavoriteStatus ? "Adicionado aos favoritos" : "Removido dos favoritos",
          description: `"${chat.name}" foi ${newFavoriteStatus ? "adicionado aos" : "removido dos"} favoritos`,
          variant: "success",
        })
      } catch (error) {
        console.error("[v0] Error toggling favorite:", error)
        addToast({
          title: "Erro",
          description: "Não foi possível atualizar o status de favorito",
          variant: "error",
        })
      }
    },
    [chats, addToast],
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
      }

      setChats((prev) => [...prev, newChat])
      setChatMessages((prev) => ({ ...prev, [newChatId]: sortedMessages }))
      setUsedAgentsPerChat((prev) => ({ ...prev, [newChatId]: usedAgentIds }))
      setSelectedAgentsByChat((prev) => ({ ...prev, [newChatId]: [] }))

      setCurrentChatId(newChatId)
    },
    [chats],
  )

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

  if (isLoadingConversations || !currentChatId) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--app-bg)]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[var(--settings-text)]">Carregando conversas...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-dvh md:h-screen bg-[var(--app-bg)] overflow-hidden">
      <ChatSidebar
        agents={agents}
        selectedAgents={currentSelectedAgents}
        usedAgents={currentUsedAgents}
        onToggleAgent={toggleAgent}
        agentHistories={currentAgentHistories}
        isMobileOpen={isMobileSidebarOpen}
        onMobileClose={() => setIsMobileSidebarOpen(false)}
      />
      <ChatArea
        agents={agents}
        selectedAgents={currentSelectedAgents}
        currentChatId={currentChatId}
        chats={chats}
        onCreateNewChat={createNewChat}
        onSwitchChat={setCurrentChatId}
        onMarkAgentAsUsed={(agentId) => markAgentAsUsed(currentChatId, agentId)}
        onCreateChatWithMessages={createChatWithMessages}
        onDeleteChat={deleteChat}
        onReorderChat={reorderChatByDrop}
        onImportChat={importChat}
        onToggleFavorite={toggleFavorite}
        messages={chatMessages}
        onAddMessage={addMessage}
        onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
        className="flex-1 w-full"
      />
    </div>
  )
}
