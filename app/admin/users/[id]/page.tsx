"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { isAdminUser } from "@/lib/utils/trial"
import { ArrowLeft, MessageSquare, Bot, Calendar, User } from "lucide-react"

interface UserDetails {
  id: string
  email: string
  display_name: string
  created_at: string
  days_remaining: number
}

interface Conversation {
  id: string
  title: string
  created_at: string
  message_count: number
  agents_used: string[]
}

export default function UserDetailsPage() {
  const router = useRouter()
  const params = useParams()
  const userId = params.id as string

  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<UserDetails | null>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [loadingMessages, setLoadingMessages] = useState(false)

  useEffect(() => {
    const checkAdminAndLoadData = async () => {
      const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session || !isAdminUser(session.user.email || "")) {
        router.push("/login/admin")
        return
      }

      try {
        console.log("[v0] Fetching user details from API...")
        const response = await fetch(`/api/admin/users/${userId}`, {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        })

        if (!response.ok) {
          console.error("[v0] Failed to fetch user details:", response.statusText)
          setLoading(false)
          return
        }

        const data = await response.json()
        console.log("[v0] User details received:", data.user.email)

        setUser(data.user)
        setConversations(data.conversations)
      } catch (error) {
        console.error("[v0] Error loading user data:", error)
      }

      setLoading(false)
    }

    checkAdminAndLoadData()
  }, [router, userId])

  const loadConversationMessages = async (conversationId: string) => {
    setLoadingMessages(true)
    try {
      const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) return

      console.log("[v0] Fetching messages from API...")
      const response = await fetch(`/api/admin/users/${userId}/messages?conversationId=${conversationId}`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      if (!response.ok) {
        console.error("[v0] Failed to fetch messages:", response.statusText)
        return
      }

      const data = await response.json()
      console.log("[v0] Messages received:", data.messages.length)

      setMessages(data.messages)
      setSelectedConversation(conversationId)
    } catch (error) {
      console.error("[v0] Error loading messages:", error)
    } finally {
      setLoadingMessages(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--app-bg)]">
        <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--app-bg)]">
        <p className="text-[var(--text-primary)]">Usuário não encontrado</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--app-bg)] p-6">
      <div className="max-w-7xl mx-auto">
        <button
          onClick={() => router.push("/admin/dashboard")}
          className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          Voltar ao Dashboard
        </button>

        <div className="bg-[var(--sidebar-bg)] rounded-lg border border-[var(--sidebar-border)] p-6 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">{user.display_name}</h1>
              <p className="text-[var(--text-secondary)] mb-4">{user.email}</p>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                  <Calendar className="w-4 h-4" />
                  Criado em: {new Date(user.created_at).toLocaleDateString("pt-BR")}
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                      user.days_remaining === 999
                        ? "bg-green-500/10 text-green-500"
                        : user.days_remaining <= 2
                          ? "bg-red-500/10 text-red-500"
                          : user.days_remaining <= 5
                            ? "bg-yellow-500/10 text-yellow-500"
                            : "bg-blue-500/10 text-blue-500"
                    }`}
                  >
                    {user.days_remaining === 999 ? "Administrador" : `${user.days_remaining} dias restantes`}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-[var(--sidebar-bg)] rounded-lg border border-[var(--sidebar-border)] p-6">
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4">Conversas ({conversations.length})</h2>
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => loadConversationMessages(conv.id)}
                  className={`w-full text-left p-4 rounded-lg border transition-colors ${
                    selectedConversation === conv.id
                      ? "bg-purple-500/10 border-purple-500"
                      : "bg-[var(--app-bg)] border-[var(--sidebar-border)] hover:border-purple-500/50"
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-medium text-[var(--text-primary)]">{conv.title}</h3>
                    <span className="text-xs text-[var(--text-secondary)]">
                      {new Date(conv.created_at).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-[var(--text-secondary)]">
                    <div className="flex items-center gap-1">
                      <MessageSquare className="w-4 h-4" />
                      {conv.message_count} mensagens
                    </div>
                    <div className="flex items-center gap-1">
                      <Bot className="w-4 h-4" />
                      {conv.agents_used.length} agentes
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-[var(--sidebar-bg)] rounded-lg border border-[var(--sidebar-border)] p-6">
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4">
              {selectedConversation ? "Mensagens" : "Selecione uma conversa"}
            </h2>
            {loadingMessages ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : selectedConversation ? (
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`p-4 rounded-lg ${
                      msg.role === "user" ? "bg-purple-500/10 ml-8" : "bg-[var(--app-bg)] mr-8"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <User className="w-4 h-4 text-[var(--text-secondary)]" />
                      <span className="text-sm font-medium text-[var(--text-primary)]">
                        {msg.role === "user" ? "Usuário" : "Assistente"}
                      </span>
                      <span className="text-xs text-[var(--text-secondary)] ml-auto">
                        {new Date(msg.created_at).toLocaleString("pt-BR")}
                      </span>
                    </div>
                    <p className="text-[var(--text-primary)] whitespace-pre-wrap">{msg.content}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[var(--text-secondary)] text-center py-8">
                Selecione uma conversa para ver as mensagens
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
