"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { ChatSidebar } from "@/components/chat-sidebar"
import { ChatArea } from "@/components/chat-area"
import { PhoneModal } from "@/components/phone-modal"
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
import { isAdminUser, isTrialExpired } from "@/lib/utils/trial"
import { getAgentPreferences, toggleAgentVisibility } from "@/lib/supabase/agent-preferences"
import { getCustomAgents } from "@/lib/supabase/agents"
import { getAgents } from "@/lib/supabase/agents"
import { Sparkles } from "lucide-react"
import Image from "next/image"

/* =======================================================================
   TIPOS DA RESPOSTA EXTERNA (ex.: BluBash)
   ======================================================================= */
type ExternalAiText = {
  content?: { type?: string; text?: { body?: string | null } } | null
  type?: string | null
  sender_type?: string | null
  sender_name?: string | null
  channel_message_id?: string | null
}

type ExternalApiResponse = {
  success?: boolean
  contactId?: string
  conversationId?: string
  messageId?: string
  conversation?: {
    status?: string
    assignedToHuman?: boolean
    aiAgentId?: string
    aiAgentName?: string
    teamId?: string
    teamName?: string
  } | null
  aiMessages?: ExternalAiText[] | null
  usage?: { credits?: number } | null
}

/* =======================================================================
   GLOSSÁRIO: EXTRACT + MASK (para HTML)
   ======================================================================= */

/** Junta os corpos de texto de aiMessages (apenas TEXT) e normaliza listas/quebras. */
const extractTextBodies = (resp: ExternalApiResponse): string[] => {
  if (!resp?.aiMessages?.length) return []
  return resp.aiMessages
    .filter((m) => (m.type || "").toUpperCase() === "TEXT")
    .map((m) => m.content?.text?.body ?? "")
    .filter((s): s is string => Boolean(s && s.trim().length))
    .map(
      (s) =>
        s
          .replace(/\r\n/g, "\n")
          .replace(/ {2}\n/g, "\n")
          .replace(/^\s*-\s+/gm, "• ")
          .replace(/^\s*\*\s+/gm, "• ")
          .replace(/^\s*--\s*$/gm, "— — —"),
    )
}

/** Escapa HTML cru para evitar XSS. */
const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")

/** Converte "glossário" em HTML, preservando blocos/linhas e agrupando listas. */
const markdownToHtmlFromGlossary = (raw: string): string => {
  let t = escapeHtml(raw).replace(/\r\n/g, "\n").trim()
  t = t.replace(/ {2}\n/g, "\n")
  t = t.replace(/^\s*-\s+/gm, "• ")
  t = t.replace(/^\s*\*\s+/gm, "• ")
  t = t.replace(/(^|\n)[\s_–—-]{0,5}(?:—|–|-|_){3,}[\s_–—-]{0,5}(?=\n|$)/g, "$1<hr/>")

  const blocks = t.split(/\n{2,}/)
  const out: string[] = []

  for (const block of blocks) {
    const fence = block.match(/^```([\s\S]*?)```$/)
    if (fence) {
      out.push(`<pre><code>${fence[1]}</code></pre>`)
      continue
    }

    if (/^###\s+/.test(block)) {
      out.push(`<h3>${fmt(block.replace(/^###\s+/, ""))}</h3>`)
      continue
    }
    if (/^##\s+/.test(block)) {
      out.push(`<h2>${fmt(block.replace(/^##\s+/, ""))}</h2>`)
      continue
    }
    if (/^#\s+/.test(block)) {
      out.push(`<h1>${fmt(block.replace(/^#\s+/, ""))}</h1>`)
      continue
    }

    const lines = block.split("\n")

    if (lines.every((l) => /^>\s?/.test(l))) {
      const inner = lines.map((l) => fmt(l.replace(/^>\s?/, ""))).join("<br/>")
      out.push(`<blockquote>${inner}</blockquote>`)
      continue
    }

    if (lines.every((l) => /^•\s+/.test(l))) {
      const items = lines.map((l) => `<li>${fmt(l.replace(/^•\s+/, ""))}</li>`).join("")
      out.push(`<ul>${items}</ul>`)
      continue
    }

    if (lines.every((l) => /^\d+\.\s+/.test(l))) {
      const items = lines.map((l) => `<li>${fmt(l.replace(/^\d+\.\s+/, ""))}</li>`).join("")
      out.push(`<ol>${items}</ol>`)
      continue
    }

    out.push(`<p>${fmt(block).replace(/\n/g, "<br/>")}</p>`)
  }

  return out.join("\n")

  function fmt(s: string) {
    let x = s
    x = x.replace(/```([\s\S]*?)```/g, (_, code) => `<pre><code>${code}</code></pre>`)
    x = x.replace(/`([^`]+?)`/g, "<code>$1</code>")
    x = x.replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>")
    x = x.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    x = x.replace(/(^|[^*])\*(?!\*)(.+?)\*(?!\*)/g, "$1<em>$2</em>")
    x = x.replace(/(?:^|[^_])_(.+?)_(?!_)/g, (m, p1) => m.replace(`_${p1}_`, `<em>${p1}</em>`))
    x = x.replace(/~(.+?)~/g, "<del>$1</del>")
    x = x.replace(
      /\[([^\]]+)\]$$(https?:\/\/[^)]+)$$/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>',
    )
    return x
  }
}

/** Tenta mapear agente da API externa para um agente local (por id ou nome); senão, usa os selecionados. */
const resolveAgentIds = (resp: ExternalApiResponse, agents: Agent[], fallbackSelectedIds: string[]): string[] => {
  const byId = resp.conversation?.aiAgentId ?? null
  const byName = (resp.conversation?.aiAgentName || "").toLowerCase().trim()

  const match = agents.find((a) => a.id === byId) ?? agents.find((a) => a.name.toLowerCase().trim() === byName)

  if (match) return [match.id]
  return fallbackSelectedIds
}

// Whitelabel theme configuration
const WHITELABEL_THEME = {
  primary: "blue",
  secondary: "cyan",
  brandName: "SUA MARCA AI",
  tagline: "Sua marca, sua inteligencia.",
}

export default function WhitelabelChatPage() {
  const router = useRouter()
  const { addToast } = useToast()

  const [selectedAgentsByChat, setSelectedAgentsByChat] = useState<Record<string, string[]>>({})
  const [usedAgentsPerChat, setUsedAgentsPerChat] = useState<Record<string, string[]>>({})
  const [currentChatId, setCurrentChatId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [workspaceId, setWorkspaceId] = useState<string | null>(null)
  const [isLoadingConversations, setIsLoadingConversations] = useState(true)
  const [agents, setAgents] = useState<Agent[]>([])
  const [agentPreferences, setAgentPreferences] = useState<Record<string, boolean>>({})
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const [showPhoneModal, setShowPhoneModal] = useState(false)

  const [selectedMessagesGlobal, setSelectedMessagesGlobal] = useState<Array<{ chatId: string; messageIds: string[] }>>(
    [],
  )
  const [chats, setChats] = useState<Chat[]>([])
  const [chatMessages, setChatMessages] = useState<Record<string, Message[]>>({})

  useEffect(() => {
    localStorage.removeItem("selectedMessagesGlobal")
  }, [])

  useEffect(() => {
    if (selectedMessagesGlobal.length > 0) {
      localStorage.setItem("selectedMessagesGlobal", JSON.stringify(selectedMessagesGlobal))
    } else {
      localStorage.removeItem("selectedMessagesGlobal")
    }
  }, [selectedMessagesGlobal])

  useEffect(() => {
    const loadUserAndConversations = async () => {
      const supabase = createClient()

      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (session) {
        const { data: profileData } = await supabase.from("profiles").select("*").eq("id", session.user.id).single()

        if (profileData) {
          if (!profileData.phone) {
            setShowPhoneModal(true)
          }

          if (!isAdminUser(profileData.email)) {
            if (isTrialExpired(profileData.email, profileData.created_at, profileData.account_expiration_date)) {
              router.push("/trial-expired")
              return
            }
          }
        }

        await supabase.from("profiles").update({ last_access: new Date().toISOString() }).eq("id", session.user.id)
        setUserId(session.user.id)

        const preferences = getAgentPreferences(session.user.id)
        setAgentPreferences(preferences)

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
        }

        try {
          const agentsData = await getAgents()
          let customAgentsData = null

          if (workspace) {
            try {
              customAgentsData = await getCustomAgents(session.user.id, workspace.id)
            } catch (err) {
              console.error("Error loading custom agents:", err)
            }
          }

          const loadedAgents: Agent[] = []

          if (agentsData) {
            loadedAgents.push(
              ...agentsData.map((agent) => ({
                id: agent.id,
                name: agent.name,
                description: agent.description,
                icon: agent.icon,
                color: agent.color,
                trigger_word: agent.trigger_word,
                group_id: agent.group_id,
                group: agent.group,
                is_active: agent.is_active,
              })),
            )
          }

          if (customAgentsData && customAgentsData.length > 0) {
            loadedAgents.push(
              ...customAgentsData.map(
                (agent) =>
                  ({
                    id: agent.id,
                    name: agent.name,
                    description: agent.description,
                    icon: agent.icon,
                    color: agent.color,
                    trigger_word: agent.trigger_word,
                    group_id: agent.group_id,
                    group: agent.group,
                    isCustomAgent: true,
                    is_active: agent.is_active,
                  }) as any,
              ),
            )
          }

          setAgents(loadedAgents)
        } catch (error) {
          console.error("Error loading agents:", error)
          addToast({
            title: "Erro ao carregar agentes",
            description: "Não foi possível carregar os agentes do banco de dados",
            variant: "error",
          })
        }

        if (workspace) {
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
            console.error("Error loading conversations:", error)
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
  }, [addToast, router])

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
          await saveMessage(userId, chatId, message.content, message.sender, (message as any).usedAgentIds || [], [])
        } catch (error: any) {
          console.error("Error saving message:", error?.message || error)
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
      console.error("Error creating conversation:", error)
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
            messages.filter((m) => (m as any).usedAgentIds?.length).flatMap((m) => (m as any).usedAgentIds || []),
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
        messages.forEach((message: any) => {
          message.usedAgentIds?.forEach((agentId: string) => {
            if (!agentHistories[agentId]) agentHistories[agentId] = []
            agentHistories[agentId].push(message)
          })
        })

        const newChat: Chat = {
          id: newConversation.id,
          name: newConversation.title,
          contextMessages: messages,
          usedAgentIds,
          agentHistories,
          isFavorite: false,
        }

        setChats((prev) => [...prev, newChat])
        setChatMessages((prev) => ({ ...prev, [newConversation.id]: [] }))
        setCurrentChatId(newConversation.id)
        setUsedAgentsPerChat((prev) => ({ ...prev, [newConversation.id]: usedAgentIds }))
        setSelectedAgentsByChat((prev) => ({ ...prev, [newConversation.id]: [] }))

        for (const message of messages as any[]) {
          await saveMessage(userId, newConversation.id, message.content, message.sender, message.usedAgentIds || [], [])
        }
      } catch (error) {
        console.error("Error creating chat with messages:", error)
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
        console.error("Error deleting conversation:", error)
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
        console.error("Error toggling favorite:", error)
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
        new Set(sortedMessages.filter((m: any) => m.usedAgentIds?.length).flatMap((m: any) => m.usedAgentIds || [])),
      )

      const agentHistories: Record<string, Message[]> = {}
      sortedMessages.forEach((message: any) => {
        message.usedAgentIds?.forEach((agentId: string) => {
          if (!agentHistories[agentId]) agentHistories[agentId] = []
          agentHistories[agentId].push(message)
        })
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

  const updateChatName = useCallback((chatId: string, newName: string) => {
    setChats((prev) => prev.map((chat) => (chat.id === chatId ? { ...chat, name: newName } : chat)))
  }, [])

  const handlePhoneSubmit = async (phone: string) => {
    if (!userId) return

    const supabase = createClient()

    try {
      await supabase.from("profiles").update({ phone }).eq("id", userId)

      addToast({
        title: "Telefone atualizado!",
        description: "Seu número de telefone foi cadastrado com sucesso.",
        variant: "success",
      })
    } catch (error) {
      console.error("Error updating phone:", error)
      addToast({
        title: "Erro ao atualizar telefone",
        description: "Não foi possível salvar seu número de telefone.",
        variant: "error",
      })
    }
  }

  const handleExternalApiResponse = useCallback(
    async (apiPayload: ExternalApiResponse, opts?: { decorate?: boolean }) => {
      const decorate = opts?.decorate ?? true

      if (!currentChatId) {
        console.warn("Sem currentChatId no momento de inserir a resposta.")
        return
      }

      try {
        const parts = extractTextBodies(apiPayload)
        if (parts.length === 0) return

        const header = decorate ? `### ${apiPayload.conversation?.aiAgentName || "Assistente"}\n` : ""
        const footer = ""

        const agentIds = resolveAgentIds(apiPayload, agents, selectedAgentsByChat[currentChatId] || [])

        for (let pIndex = 0; pIndex < parts.length; pIndex++) {
          const isFirstPart = pIndex === 0
          const isLastPart = pIndex === parts.length - 1

          const raw = `${isFirstPart ? header : ""}${parts[pIndex]}${isLastPart ? footer : ""}`
          const html = markdownToHtmlFromGlossary(raw)
          const chunks = html
            .split(/<hr\s*\/?>/i)
            .map((s) => s.trim())
            .filter(Boolean)

          for (let i = 0; i < chunks.length; i++) {
            await addMessage(currentChatId, {
              id: `ext-${apiPayload.messageId ?? Date.now()}-${pIndex}-${i}`,
              content: chunks[i],
              sender: "assistant",
              timestamp: new Date(),
              usedAgentIds: agentIds,
              asHtml: true,
            })
          }
        }
      } catch (err) {
        console.error("Erro ao processar resposta externa:", err)
        addToast({
          title: "Erro ao processar resposta",
          description: "Não foi possível formatar e salvar a resposta da IA.",
          variant: "error",
        })
      }
    },
    [agents, selectedAgentsByChat, currentChatId, addMessage, addToast],
  )

  const currentUsedAgents = usedAgentsPerChat[currentChatId || ""] || []
  const currentSelectedAgents = selectedAgentsByChat[currentChatId || ""] || []
  const currentChat = chats.find((c) => c.id === currentChatId)

  const currentAgentHistories: Record<string, Message[]> = {}
  const currentChatMessages = chatMessages[currentChatId || ""] || []
  currentChatMessages.forEach((message: any) => {
    message.usedAgentIds?.forEach((agentId: string) => {
      if (!currentAgentHistories[agentId]) currentAgentHistories[agentId] = []
      currentAgentHistories[agentId].push(message)
    })
  })

  const handleToggleAgentVisibility = useCallback(
    async (agentId: string) => {
      if (!userId) return

      const currentVisibility = agentPreferences[agentId] ?? true
      const newVisibility = !currentVisibility

      try {
        toggleAgentVisibility(userId, agentId, newVisibility)
        setAgentPreferences((prev) => ({ ...prev, [agentId]: newVisibility }))

        addToast({
          title: newVisibility ? "Agente ativado" : "Agente desativado",
          description: `O agente ${newVisibility ? "aparecerá" : "não aparecerá mais"} na sua sidebar`,
          variant: "success",
        })
      } catch (error) {
        console.error("Error toggling agent visibility:", error)
        addToast({
          title: "Erro",
          description: "Não foi possível alterar a visibilidade do agente",
          variant: "error",
        })
      }
    },
    [userId, agentPreferences, addToast],
  )

  const visibleAgents = agents.filter((agent) => {
    const preference = agentPreferences[agent.id]
    return preference === undefined || preference === true
  })

  if (isLoadingConversations || !currentChatId) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0a0a12]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Carregando conversas...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-dvh md:h-screen bg-[#0a0a12] overflow-hidden whitelabel-theme">
      {/* Whitelabel Banner */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-blue-600/90 to-cyan-600/90 backdrop-blur-sm py-2 px-4">
        <div className="flex items-center justify-center gap-2">
          <Sparkles className="w-4 h-4 text-white" />
          <span className="text-white text-sm font-medium">
            Versao Whitelabel - Sua empresa pode ter uma plataforma personalizada como esta!
          </span>
          <Sparkles className="w-4 h-4 text-white" />
        </div>
      </div>
      
      <PhoneModal isOpen={showPhoneModal} onClose={() => setShowPhoneModal(false)} onSubmit={handlePhoneSubmit} />
      
      <div className="flex w-full pt-10">
        <ChatSidebar
          agents={visibleAgents}
          allAgents={agents}
          agentPreferences={agentPreferences}
          onToggleAgentVisibility={handleToggleAgentVisibility}
          selectedAgents={currentSelectedAgents}
          usedAgents={currentUsedAgents}
          onToggleAgent={toggleAgent}
          onSelectAgent={toggleAgent}
          agentHistories={currentAgentHistories}
          isMobileOpen={isMobileSidebarOpen}
          onMobileClose={() => setIsMobileSidebarOpen(false)}
          onAgentOrderChange={(agentIds) => {}}
          whitelabelTheme={{
            primary: "blue",
            secondary: "cyan",
            brandName: "SUA MARCA AI",
            logoUrl: "/whitelabel-logo.jpg",
            profileUrl: "/whitelabel-profile.jpg",
          }}
        />
        <ChatArea
          agents={visibleAgents}
          selectedAgents={currentSelectedAgents}
          currentChatId={currentChatId}
          chats={chats}
          onCreateNewChat={createNewChat}
          onSwitchChat={setCurrentChatId}
          onMarkAgentAsUsed={(agentId) => markAgentAsUsed(currentChatId!, agentId)}
          onCreateChatWithMessages={createChatWithMessages}
          onDeleteChat={deleteChat}
          onReorderChat={reorderChatByDrop}
          onImportChat={importChat}
          onToggleFavorite={toggleFavorite}
          onUpdateChatName={updateChatName}
          messages={chatMessages}
          onAddMessage={addMessage}
          onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
          onExternalApiResponse={handleExternalApiResponse}
          onToggleAgent={toggleAgent}
          className="flex-1 w-full"
          selectedMessagesGlobal={selectedMessagesGlobal}
          onSelectedMessagesGlobalChange={setSelectedMessagesGlobal}
          whitelabelTheme={{
            primary: "blue",
            secondary: "cyan",
            brandName: "SUA MARCA AI",
            logoUrl: "/whitelabel-logo.jpg",
            profileUrl: "/whitelabel-profile.jpg",
          }}
        />
      </div>
      
      <style jsx global>{`
        /* Override CSS Variables for Whitelabel Theme - Modern Blue */
        .whitelabel-theme {
          --app-bg: #0f172a !important;
          --sidebar-bg: #1e293b !important;
          --sidebar-border: #334155 !important;
          --agent-bg: #334155 !important;
          --agent-hover: #3b82f6 !important;
          --agent-icon: #60a5fa !important;
          --tooltip-bg: #1e293b !important;
          --tooltip-text: #ffffff !important;
          --chat-bg: #0f172a !important;
          --chat-header-bg: #1e293b !important;
          --chat-border: #334155 !important;
          --message-user-bg: #1e3a5f !important;
          --message-assistant-bg: #1e293b !important;
          --input-bg: #1e293b !important;
          --settings-bg: #1e293b !important;
          --settings-border: #334155 !important;
          --settings-text: #ffffff !important;
          --settings-text-muted: #93c5fd !important;
          --text-primary: #ffffff !important;
          --text-secondary: #cbd5e1 !important;
          --border-color: #334155 !important;
          --settings-button-bg: #334155 !important;
          --settings-button-hover: #3b82f6 !important;
          --settings-input-bg: #0f172a !important;
          --card-bg: #334155 !important;
        }
        
        /* Force background colors - Modern slate/blue theme */
        .whitelabel-theme,
        .whitelabel-theme > div,
        .whitelabel-theme [class*="bg-[var(--app-bg)"] {
          background-color: #0f172a !important;
        }
        
        /* Sidebar background - Gradient slate to blue */
        .whitelabel-theme aside,
        .whitelabel-theme [class*="sidebar"],
        .whitelabel-theme [class*="bg-[var(--sidebar-bg)"] {
          background: linear-gradient(180deg, #1e293b 0%, #1e3a5f 100%) !important;
          border-color: #334155 !important;
          box-shadow: 2px 0 10px rgba(0,0,0,0.3) !important;
        }
        
        /* Sidebar header/top section */
        .whitelabel-theme aside > div:first-child,
        .whitelabel-theme [class*="sidebar"] > div:first-child {
          background-color: rgba(59, 130, 246, 0.1) !important;
          border-bottom: 1px solid #334155 !important;
        }
        
        /* All purple colors to blue */
        .whitelabel-theme [class*="purple-600"],
        .whitelabel-theme [class*="purple-500"],
        .whitelabel-theme [class*="bg-purple"] {
          background-color: #2563eb !important;
        }
        
        .whitelabel-theme [class*="text-purple"] {
          color: #3b82f6 !important;
        }
        
        .whitelabel-theme [class*="border-purple"] {
          border-color: #3b82f6 !important;
        }
        
        /* Gradient overrides */
        .whitelabel-theme [class*="from-purple"] {
          --tw-gradient-from: #2563eb !important;
        }
        
        .whitelabel-theme [class*="to-blue"],
        .whitelabel-theme [class*="to-purple"] {
          --tw-gradient-to: #1e40af !important;
        }
        
        /* Hover states */
        .whitelabel-theme [class*="hover:bg-purple"]:hover {
          background-color: #1d4ed8 !important;
        }
        
        /* Focus rings */
        .whitelabel-theme [class*="ring-purple"],
        .whitelabel-theme [class*="focus:ring-purple"]:focus {
          --tw-ring-color: #3b82f6 !important;
        }
        
        /* Scrollbar - blue theme */
        .whitelabel-theme ::-webkit-scrollbar-thumb {
          background-color: rgba(59, 130, 246, 0.5) !important;
        }
        
        .whitelabel-theme ::-webkit-scrollbar-thumb:hover {
          background-color: rgba(59, 130, 246, 0.7) !important;
        }
        
        /* Agent cards - Modern card design */
        .whitelabel-theme [class*="agent"] {
          background-color: #334155 !important;
          border: 1px solid #475569 !important;
          border-radius: 12px !important;
          box-shadow: 0 2px 8px rgba(0,0,0,0.2) !important;
          transition: all 0.3s ease !important;
        }
        
        .whitelabel-theme [class*="agent"]:hover {
          background-color: #3b82f6 !important;
          border-color: #60a5fa !important;
          transform: translateX(4px) !important;
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3) !important;
        }
        
        .whitelabel-theme [class*="agent"][class*="active"],
        .whitelabel-theme [class*="agent"][data-active="true"] {
          background-color: #2563eb !important;
          border-color: #60a5fa !important;
          box-shadow: 0 4px 16px rgba(59, 130, 246, 0.4) !important;
        }
        
        /* Agent icons */
        .whitelabel-theme [class*="agent"] svg,
        .whitelabel-theme [class*="agent"] [class*="icon"] {
          color: #60a5fa !important;
        }
        
        .whitelabel-theme [class*="agent"]:hover svg,
        .whitelabel-theme [class*="agent"]:hover [class*="icon"] {
          color: #ffffff !important;
        }
        
        /* Message bubbles - dark background with white text */
        .whitelabel-theme [class*="message"] {
          background-color: #0d1525 !important;
          color: #ffffff !important;
        }
        
        .whitelabel-theme [class*="message"] p,
        .whitelabel-theme [class*="message"] span,
        .whitelabel-theme [class*="message"] div {
          color: #ffffff !important;
        }
        
        /* Force all text inside chat area to be white */
        .whitelabel-theme .text-\\[var\\(--text-primary\\)\\],
        .whitelabel-theme .text-\\[var\\(--text-secondary\\)\\] {
          color: #ffffff !important;
        }
        
        /* Message content text */
        .whitelabel-theme [class*="prose"],
        .whitelabel-theme [class*="prose"] p,
        .whitelabel-theme [class*="prose"] span,
        .whitelabel-theme [class*="prose"] li,
        .whitelabel-theme [class*="prose"] strong {
          color: #ffffff !important;
        }
        
        /* Chat area text */
        .whitelabel-theme main p,
        .whitelabel-theme main span:not([class*="badge"]),
        .whitelabel-theme main div:not([class*="bg-"]) {
          color: #ffffff !important;
        }
        
        /* Secondary text - slightly dimmer white */
        .whitelabel-theme [class*="text-gray"],
        .whitelabel-theme [class*="text-slate"],
        .whitelabel-theme [class*="text-muted"] {
          color: #cbd5e1 !important;
        }
        
        /* Timestamps and metadata */
        .whitelabel-theme time,
        .whitelabel-theme [class*="timestamp"],
        .whitelabel-theme small {
          color: #94a3b8 !important;
        }
        
        /* Input fields */
        .whitelabel-theme input,
        .whitelabel-theme textarea {
          background-color: #0a0a18 !important;
          border-color: #1e3a5f !important;
        }
        
        .whitelabel-theme input:focus,
        .whitelabel-theme textarea:focus {
          border-color: #3b82f6 !important;
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2) !important;
        }
        
        /* Buttons */
        .whitelabel-theme button[class*="purple"],
        .whitelabel-theme button[class*="bg-gradient"] {
          background: linear-gradient(to right, #2563eb, #1e40af) !important;
        }
        
        .whitelabel-theme button[class*="purple"]:hover,
        .whitelabel-theme button[class*="bg-gradient"]:hover {
          background: linear-gradient(to right, #1d4ed8, #1e3a8a) !important;
        }
        
        /* Header/banner specific */
        .whitelabel-theme .bg-gradient-to-r {
          background: linear-gradient(to right, #2563eb, #1e40af) !important;
        }
        
        /* Fix any remaining backgrounds */
        .whitelabel-theme div[class*="0f0f"],
        .whitelabel-theme div[class*="1a1a"],
        .whitelabel-theme div[class*="111827"] {
          background-color: #0a0a18 !important;
        }
        
        /* Force white text on all paragraphs in chat */
        .whitelabel-theme p {
          color: #ffffff !important;
        }
        
        /* Badge/tags should stay colored */
        .whitelabel-theme [class*="badge"],
        .whitelabel-theme [class*="Badge"] {
          color: inherit !important;
        }
        
        /* Links - blue color */
        .whitelabel-theme a {
          color: #60a5fa !important;
        }
        
        .whitelabel-theme a:hover {
          color: #93c5fd !important;
        }
        
        /* Code blocks - darker background */
        .whitelabel-theme pre,
        .whitelabel-theme code {
          background-color: #020617 !important;
          color: #e2e8f0 !important;
        }
        
        /* Headers */
        .whitelabel-theme h1,
        .whitelabel-theme h2,
        .whitelabel-theme h3,
        .whitelabel-theme h4,
        .whitelabel-theme h5,
        .whitelabel-theme h6 {
          color: #ffffff !important;
        }
        
        /* Lists */
        .whitelabel-theme ul,
        .whitelabel-theme ol,
        .whitelabel-theme li {
          color: #ffffff !important;
        }
        
        /* Ensure sidebar text is white */
        .whitelabel-theme aside p,
        .whitelabel-theme aside span,
        .whitelabel-theme aside div {
          color: #ffffff !important;
        }
        
        /* Input placeholder */
        .whitelabel-theme input::placeholder,
        .whitelabel-theme textarea::placeholder {
          color: #64748b !important;
        }
        
        /* Input text */
        .whitelabel-theme input,
        .whitelabel-theme textarea {
          color: #ffffff !important;
        }
        
        /* AGGRESSIVE OVERRIDES - Force all purple variations to blue */
        .whitelabel-theme .bg-purple-50 { background-color: #eff6ff !important; }
        .whitelabel-theme .bg-purple-100 { background-color: #dbeafe !important; }
        .whitelabel-theme .bg-purple-200 { background-color: #bfdbfe !important; }
        .whitelabel-theme .bg-purple-300 { background-color: #93c5fd !important; }
        .whitelabel-theme .bg-purple-400 { background-color: #60a5fa !important; }
        .whitelabel-theme .bg-purple-500 { background-color: #3b82f6 !important; }
        .whitelabel-theme .bg-purple-600 { background-color: #2563eb !important; }
        .whitelabel-theme .bg-purple-700 { background-color: #1d4ed8 !important; }
        .whitelabel-theme .bg-purple-800 { background-color: #1e40af !important; }
        .whitelabel-theme .bg-purple-900 { background-color: #1e3a8a !important; }
        
        .whitelabel-theme .text-purple-50 { color: #eff6ff !important; }
        .whitelabel-theme .text-purple-100 { color: #dbeafe !important; }
        .whitelabel-theme .text-purple-200 { color: #bfdbfe !important; }
        .whitelabel-theme .text-purple-300 { color: #93c5fd !important; }
        .whitelabel-theme .text-purple-400 { color: #60a5fa !important; }
        .whitelabel-theme .text-purple-500 { color: #3b82f6 !important; }
        .whitelabel-theme .text-purple-600 { color: #2563eb !important; }
        .whitelabel-theme .text-purple-700 { color: #1d4ed8 !important; }
        .whitelabel-theme .text-purple-800 { color: #1e40af !important; }
        .whitelabel-theme .text-purple-900 { color: #1e3a8a !important; }
        
        .whitelabel-theme .border-purple-50 { border-color: #eff6ff !important; }
        .whitelabel-theme .border-purple-100 { border-color: #dbeafe !important; }
        .whitelabel-theme .border-purple-200 { border-color: #bfdbfe !important; }
        .whitelabel-theme .border-purple-300 { border-color: #93c5fd !important; }
        .whitelabel-theme .border-purple-400 { border-color: #60a5fa !important; }
        .whitelabel-theme .border-purple-500 { border-color: #3b82f6 !important; }
        .whitelabel-theme .border-purple-600 { border-color: #2563eb !important; }
        .whitelabel-theme .border-purple-700 { border-color: #1d4ed8 !important; }
        .whitelabel-theme .border-purple-800 { border-color: #1e40af !important; }
        .whitelabel-theme .border-purple-900 { border-color: #1e3a8a !important; }
        
        /* Override all hex color classes that might be purple */
        .whitelabel-theme .bg-\\[\\#a855f7\\],
        .whitelabel-theme .bg-\\[\\#9333ea\\],
        .whitelabel-theme .bg-\\[\\#7c3aed\\],
        .whitelabel-theme .bg-\\[\\#6d28d9\\] {
          background-color: #2563eb !important;
        }
        
        /* Search input in sidebar */
        .whitelabel-theme aside input[type="text"],
        .whitelabel-theme aside input[type="search"],
        .whitelabel-theme [class*="sidebar"] input {
          background-color: rgba(51, 65, 85, 0.8) !important;
          border: 1px solid #475569 !important;
          border-radius: 8px !important;
          color: #ffffff !important;
          padding: 8px 12px !important;
        }
        
        .whitelabel-theme aside input:focus,
        .whitelabel-theme [class*="sidebar"] input:focus {
          background-color: rgba(59, 130, 246, 0.1) !important;
          border-color: #3b82f6 !important;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2) !important;
        }
        
        /* Sidebar buttons (tabs, filters, etc) */
        .whitelabel-theme aside button,
        .whitelabel-theme [class*="sidebar"] button {
          background-color: rgba(51, 65, 85, 0.6) !important;
          border: 1px solid transparent !important;
          border-radius: 8px !important;
          color: #cbd5e1 !important;
          transition: all 0.2s ease !important;
        }
        
        .whitelabel-theme aside button:hover,
        .whitelabel-theme [class*="sidebar"] button:hover {
          background-color: #3b82f6 !important;
          color: #ffffff !important;
          border-color: #60a5fa !important;
        }
        
        .whitelabel-theme aside button[class*="active"],
        .whitelabel-theme [class*="sidebar"] button[data-active="true"] {
          background-color: #2563eb !important;
          color: #ffffff !important;
          border-color: #60a5fa !important;
        }
        
        /* Override all specific background colors to modern slate theme */
        .whitelabel-theme .bg-white { background-color: #1e293b !important; }
        .whitelabel-theme .bg-gray-50 { background-color: #334155 !important; }
        .whitelabel-theme .bg-gray-100 { background-color: #334155 !important; }
        .whitelabel-theme .bg-gray-200 { background-color: #475569 !important; }
        .whitelabel-theme .bg-gray-800 { background-color: #1e293b !important; }
        .whitelabel-theme .bg-gray-900 { background-color: #0f172a !important; }
        .whitelabel-theme .bg-slate-50 { background-color: #334155 !important; }
        .whitelabel-theme .bg-slate-100 { background-color: #334155 !important; }
        .whitelabel-theme .bg-slate-800 { background-color: #1e293b !important; }
        .whitelabel-theme .bg-slate-900 { background-color: #0f172a !important; }
        
        /* Force all text to be white/light */
        .whitelabel-theme .text-gray-900,
        .whitelabel-theme .text-gray-800,
        .whitelabel-theme .text-gray-700,
        .whitelabel-theme .text-slate-900,
        .whitelabel-theme .text-slate-800,
        .whitelabel-theme .text-slate-700,
        .whitelabel-theme .text-black {
          color: #ffffff !important;
        }
        
        .whitelabel-theme .text-gray-600,
        .whitelabel-theme .text-gray-500,
        .whitelabel-theme .text-gray-400,
        .whitelabel-theme .text-slate-600,
        .whitelabel-theme .text-slate-500,
        .whitelabel-theme .text-slate-400 {
          color: #cbd5e1 !important;
        }
        
        /* Buttons - all variations */
        .whitelabel-theme button {
          border-color: #1e3a5f !important;
        }
        
        .whitelabel-theme button:not([class*="ghost"]):not([class*="outline"]) {
          background-color: #2563eb !important;
          color: #ffffff !important;
        }
        
        .whitelabel-theme button:not([class*="ghost"]):not([class*="outline"]):hover {
          background-color: #1d4ed8 !important;
        }
        
        /* Specific component overrides */
        .whitelabel-theme [role="tab"][data-state="active"],
        .whitelabel-theme [data-selected="true"],
        .whitelabel-theme [aria-selected="true"] {
          background-color: #2563eb !important;
          color: #ffffff !important;
          border-color: #2563eb !important;
        }
        
        /* Conversation list items */
        .whitelabel-theme [class*="conversation"] {
          background-color: #0d1525 !important;
          border-color: #1e3a5f !important;
        }
        
        .whitelabel-theme [class*="conversation"]:hover {
          background-color: #152035 !important;
        }
        
        .whitelabel-theme [class*="conversation"][class*="active"],
        .whitelabel-theme [class*="conversation"][data-active="true"] {
          background-color: #152035 !important;
          border-color: #2563eb !important;
        }
        
        /* Override any remaining specific hex values */
        .whitelabel-theme * {
          scrollbar-color: rgba(59, 130, 246, 0.5) #0a0a18 !important;
        }
        
        /* Make sure all divs use the theme colors */
        .whitelabel-theme div {
          border-color: #1e3a5f;
        }
        
        /* Universal text color enforcement */
        .whitelabel-theme * {
          color: inherit;
        }
        
        .whitelabel-theme body,
        .whitelabel-theme main,
        .whitelabel-theme section,
        .whitelabel-theme article {
          color: #ffffff;
        }
      `}</style>
    </div>
  )
}
