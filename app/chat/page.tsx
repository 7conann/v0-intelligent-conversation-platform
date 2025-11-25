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
          .replace(/\r\n/g, "\n") // normaliza quebras
          .replace(/ {2}\n/g, "\n") // remove "dois espaços + quebra" típicos do WhatsApp
          .replace(/^\s*-\s+/gm, "• ") // bullets '-' -> '•'
          .replace(/^\s*\*\s+/gm, "• ") // bullets '*' -> '•'
          .replace(/^\s*--\s*$/gm, "— — —"), // separador
    )
}

/** Escapa HTML cru para evitar XSS. */
const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")

/** Converte o “glossário” (markdown/whatsapp-like) em HTML básico seguro. */
/** Converte “glossário” em HTML, preservando blocos/linhas e agrupando listas. */
const markdownToHtmlFromGlossary = (raw: string): string => {
  // Base seguro: escapa HTML e normaliza quebras
  let t = escapeHtml(raw).replace(/\r\n/g, "\n").trim()

  // Normalizações de bullets/separador
  t = t.replace(/ {2}\n/g, "\n")
  t = t.replace(/^\s*-\s+/gm, "• ")
  t = t.replace(/^\s*\*\s+/gm, "• ")
  t = t.replace(/(^|\n)[\s_–—-]{0,5}(?:—|–|-|_){3,}[\s_–—-]{0,5}(?=\n|$)/g, "$1<hr/>")

  // Quebra em BLOCO por linha em branco (1+ linhas vazias)
  const blocks = t.split(/\n{2,}/)
  const out: string[] = []

  for (const block of blocks) {
    // Bloco de código cercado por \`\`\`
    const fence = block.match(/^```([\s\S]*?)```$/)
    if (fence) {
      out.push(`<pre><code>${fence[1]}</code></pre>`)
      continue
    }

    // Títulos
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

    // Citações: todas as linhas iniciam com ">"
    if (lines.every((l) => /^>\s?/.test(l))) {
      const inner = lines.map((l) => fmt(l.replace(/^>\s?/, ""))).join("<br/>")
      out.push(`<blockquote>${inner}</blockquote>`)
      continue
    }

    // Listas com "• "
    if (lines.every((l) => /^•\s+/.test(l))) {
      const items = lines.map((l) => `<li>${fmt(l.replace(/^•\s+/, ""))}</li>`).join("")
      out.push(`<ul>${items}</ul>`)
      continue
    }

    // Listas numeradas "1. ...", "2. ..."
    if (lines.every((l) => /^\d+\.\s+/.test(l))) {
      const items = lines.map((l) => `<li>${fmt(l.replace(/^\d+\.\s+/, ""))}</li>`).join("")
      out.push(`<ol>${items}</ol>`)
      continue
    }

    // Parágrafo padrão: preserva quebras simples como <br/>
    out.push(`<p>${fmt(block).replace(/\n/g, "<br/>")}</p>`)
  }

  return out.join("\n")

  // Inline: negrito/itálico/código/links
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
    console.log("[v0] 🧹 Cleared selectedMessagesGlobal from localStorage on page load")
  }, [])

  useEffect(() => {
    if (selectedMessagesGlobal.length > 0) {
      localStorage.setItem("selectedMessagesGlobal", JSON.stringify(selectedMessagesGlobal))
      console.log("[v0] 💾 Saved selectedMessagesGlobal to localStorage:", selectedMessagesGlobal)
    } else {
      localStorage.removeItem("selectedMessagesGlobal")
      console.log("[v0] 🗑️ Removed selectedMessagesGlobal from localStorage")
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
        console.log("[v0] 👁️ Agent preferences loaded from localStorage:", preferences)

        console.log("[v0] 🔍 Buscando workspace para user_id:", session.user.id)
        const { data: workspaces } = await supabase
          .from("workspaces")
          .select("*")
          .eq("user_id", session.user.id)
          .limit(1)

        let workspace = workspaces?.[0]

        if (!workspace) {
          console.log("[v0] ⚠️ Workspace não encontrado, criando novo...")
          const { data: newWorkspace } = await supabase
            .from("workspaces")
            .insert({
              user_id: session.user.id,
              name: "Workspace Padrão",
            })
            .select()
            .single()

          workspace = newWorkspace
          console.log("[v0] ✅ Novo workspace criado:", workspace)
        }

        if (workspace) {
          setWorkspaceId(workspace.id)
          console.log("[v0] 🏢 Workspace carregado:", {
            id: workspace.id,
            name: workspace.name,
            user_id: workspace.user_id,
          })
        }

        try {
          console.log("[v0] 🔍 Buscando agentes padrão...")
          const agentsData = await getAgents()

          console.log("[v0] 📦 Agentes padrão retornados:", agentsData?.length || 0)

          console.log("[v0] 🔍 Buscando custom agents para workspace_id:", workspace?.id)
          let customAgentsData = null

          if (workspace) {
            try {
              customAgentsData = await getCustomAgents(session.user.id, workspace.id)
              console.log("[v0] 📦 Custom agents retornados do banco:", customAgentsData)
              console.log("[v0] 📊 Quantidade de custom agents:", customAgentsData?.length || 0)
            } catch (err) {
              console.error("[v0] ❌ Erro ao buscar custom agents:", err)
            }
          }

          const loadedAgents: Agent[] = []

          if (agentsData) {
            loadedAgents.push(
              ...agentsData.map((agent) => ({
                id: agent.id,
                name: agent.name,
                description: agent.description, // Added description field
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
            console.log(
              "[v0] ✅ Adicionando custom agents à lista:",
              customAgentsData.map((a) => a.name),
            )
            loadedAgents.push(
              ...customAgentsData.map(
                (agent) =>
                  ({
                    id: agent.id,
                    name: agent.name,
                    description: agent.description, // Added description field
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
            console.log(
              "[v0] 📦 Custom agents com group:",
              customAgentsData.map((a) => ({ name: a.name, group: a.group?.name })),
            )
          } else {
            console.log("[v0] ⚠️ Nenhum custom agent encontrado para este workspace")
          }

          console.log(
            "[v0] 📥 Agentes carregados inicialmente:",
            loadedAgents.map((a) => ({
              name: a.name,
              trigger_word: a.trigger_word,
              isCustom: (a as any).isCustomAgent,
            })),
          )
          console.log(`[v0] 📊 Total de agentes carregados: ${loadedAgents.length}`)
          setAgents(loadedAgents)
        } catch (error) {
          console.error("[v0] Error loading agents:", error)
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
  }, [addToast, router])

  useEffect(() => {
    const reloadAgentsAndPreferences = async () => {
      console.log("[v0] 🔄 Página ficou visível, recarregando agentes e preferências...")
      const supabase = createClient()

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (!session) return

        const preferences = getAgentPreferences(session.user.id)
        setAgentPreferences(preferences)
        console.log("[v0] 👁️ Agent preferences reloaded from localStorage:", preferences)

        console.log("[v0] 🔍 Buscando workspace para reload...")
        const { data: workspaces } = await supabase
          .from("workspaces")
          .select("*")
          .eq("user_id", session.user.id)
          .limit(1)

        const workspace = workspaces?.[0]
        console.log("[v0] 🏢 Workspace para reload:", workspace?.id)

        const agentsData = await getAgents()

        console.log("[v0] 📦 Agentes padrão no reload:", agentsData?.length || 0)

        let customAgentsData = null

        if (workspace) {
          try {
            customAgentsData = await getCustomAgents(session.user.id, workspace.id)
            console.log("[v0] 📦 Custom agents no reload:", customAgentsData?.length || 0)
            console.log("[v0] 📦 Custom agents data:", customAgentsData)
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
              description: agent.description, // Added description field
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
          console.log(
            "[v0] ✅ Adicionando custom agents no reload:",
            customAgentsData.map((a) => a.name),
          )
          loadedAgents.push(
            ...customAgentsData.map(
              (agent) =>
                ({
                  id: agent.id,
                  name: agent.name,
                  description: agent.description, // Added description field
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

        console.log(
          "[v0] ✅ Agentes recarregados do banco:",
          loadedAgents.map((a) => ({ name: a.name, trigger_word: a.trigger_word, isCustom: (a as any).isCustomAgent })),
        )
        console.log(`[v0] 📊 Total de agentes recarregados: ${loadedAgents.length}`)
        setAgents(loadedAgents)
      } catch (error) {
        console.error("[v0] ❌ Erro ao recarregar agentes:", error)
      }
    }

    const handleWindowFocus = () => {
      console.log("[v0] 👁️ Janela ganhou foco, recarregando agentes e preferências...")
      reloadAgentsAndPreferences()
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        console.log("[v0] 👁️ Página ficou visível, recarregando agentes e preferências...")
        reloadAgentsAndPreferences()
      }
    }

    window.addEventListener("focus", handleWindowFocus)
    document.addEventListener("visibilitychange", handleVisibilityChange)

    return () => {
      window.removeEventListener("focus", handleWindowFocus)
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
          await saveMessage(userId, chatId, message.content, message.sender, (message as any).usedAgentIds || [], [])
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
      console.error("[v0] Error updating phone:", error)
      addToast({
        title: "Erro ao atualizar telefone",
        description: "Não foi possível salvar seu número de telefone.",
        variant: "error",
      })
    }
  }

  /* =======================================================================
     HANDLER PARA RESPOSTA DA API EXTERNA (usa máscara -> HTML)
     Chame isto quando o JSON deles chegar.
     ======================================================================= */
  const handleExternalApiResponse = useCallback(
    async (apiPayload: ExternalApiResponse, opts?: { decorate?: boolean }) => {
      const decorate = opts?.decorate ?? true

      if (!currentChatId) {
        console.warn("[v0] Sem currentChatId no momento de inserir a resposta.")
        return
      }

      try {
        const parts = extractTextBodies(apiPayload) // cada TEXT body de aiMessages
        if (parts.length === 0) return

        const header = decorate ? `### 🤖 ${apiPayload.conversation?.aiAgentName || "Assistente"}\n` : ""
        const footer =
          decorate && apiPayload.usage?.credits != null
            ? // ? `\n\n—\n📌 _Uso_: ${apiPayload.usage.credits} crédito(s)`
              ``
            : ""

        // mapeia para agente local
        const agentIds = resolveAgentIds(apiPayload, agents, selectedAgentsByChat[currentChatId] || [])

        for (let pIndex = 0; pIndex < parts.length; pIndex++) {
          const isFirstPart = pIndex === 0
          const isLastPart = pIndex === parts.length - 1

          // aplica header apenas na primeira parte, footer apenas na última
          const raw = `${isFirstPart ? header : ""}${parts[pIndex]}${isLastPart ? footer : ""}`

          // 🔥 converte markdown-like -> HTML seguro
          const html = markdownToHtmlFromGlossary(raw)

          // ⚙️ quebra por <hr/> (se houver) — cada pedaço vira uma bolha
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
              asHtml: true, // será renderizado via dangerouslySetInnerHTML
            })
          }
        }
      } catch (err) {
        console.error("[v0] Erro ao processar resposta externa:", err)
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
        console.error("[v0] Error toggling agent visibility:", error)
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
    // If no preference is set, show the agent by default
    return preference === undefined || preference === true
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
      <PhoneModal isOpen={showPhoneModal} onClose={() => setShowPhoneModal(false)} onSubmit={handlePhoneSubmit} />
      <ChatSidebar
        agents={visibleAgents}
        allAgents={agents}
        agentPreferences={agentPreferences}
        onToggleAgentVisibility={handleToggleAgentVisibility}
        selectedAgents={currentSelectedAgents}
        usedAgents={currentUsedAgents}
        onToggleAgent={toggleAgent}
        agentHistories={currentAgentHistories}
        isMobileOpen={isMobileSidebarOpen}
        onMobileClose={() => setIsMobileSidebarOpen(false)}
        onAgentOrderChange={(agentIds) => {
          console.log("[v0] 🔄 Agent order changed:", agentIds)
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
      />
    </div>
  )
}
