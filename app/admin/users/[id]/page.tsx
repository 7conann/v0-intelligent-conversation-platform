"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from 'next/navigation'
import { createClient } from "@/lib/supabase/client"
import { isAdminUser } from "@/lib/utils/trial"
import { ArrowLeft, MessageSquare, Bot, Calendar, User, FileText } from 'lucide-react'

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

interface MessageLog {
  user_message: string
  assistant_response: string | null
  request_payload: any
  response_body: any
  response_status: number
  created_at: string
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
  const [selectedMessageLog, setSelectedMessageLog] = useState<MessageLog | null>(null)
  const [loadingLog, setLoadingLog] = useState(false)

  useEffect(() => {
    const checkAdminAndLoadData = async () => {
      const supabase = createClient()

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
      const supabase = createClient()

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

  const loadMessageLog = async (messageId: string) => {
    setLoadingLog(true)
    try {
      const supabase = createClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) return

      const response = await fetch(`/api/admin/message-log?messageId=${messageId}`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      if (!response.ok) {
        console.error("[v0] Failed to fetch log")
        setSelectedMessageLog({
          user_message: "Erro ao carregar log",
          assistant_response: null,
          request_payload: null,
          response_body: null,
          response_status: 0,
          created_at: new Date().toISOString()
        } as MessageLog)
        return
      }

      const data = await response.json()
      
      if (!data.log) {
        setSelectedMessageLog({
          user_message: "Log não disponível para esta mensagem",
          assistant_response: "Esta mensagem foi criada antes da implementação do sistema de logs",
          request_payload: null,
          response_body: null,
          response_status: 0,
          created_at: new Date().toISOString()
        } as MessageLog)
      } else {
        setSelectedMessageLog(data.log)
      }
    } catch (error) {
      console.error("[v0] Error loading log:", error)
      setSelectedMessageLog({
        user_message: "Erro ao carregar log",
        assistant_response: null,
        request_payload: null,
        response_body: null,
        response_status: 0,
        created_at: new Date().toISOString()
      } as MessageLog)
    } finally {
      setLoadingLog(false)
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
    <div className="min-h-screen bg-[var(--app-bg)] flex flex-col">
      <div className="flex-shrink-0 p-6 pb-0">
        <button
          onClick={() => router.push("/admin/dashboard")}
          className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] mb-4"
        >
          <ArrowLeft className="w-5 h-5" />
          Voltar ao Dashboard
        </button>

        <div className="bg-[var(--sidebar-bg)] rounded-lg border border-[var(--sidebar-border)] p-6 mb-4">
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

        <div className="bg-[var(--sidebar-bg)] rounded-lg border border-[var(--sidebar-border)] p-4 mb-4">
          <h2 className="text-lg font-bold text-[var(--text-primary)] mb-3">Conversas ({conversations.length})</h2>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => loadConversationMessages(conv.id)}
                className={`flex-shrink-0 w-64 text-left p-4 rounded-lg border transition-colors relative ${
                  selectedConversation === conv.id
                    ? "bg-purple-500/10 border-purple-500"
                    : "bg-[var(--app-bg)] border-[var(--sidebar-border)] hover:border-purple-500/50"
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-medium text-[var(--text-primary)] truncate flex-1">{conv.title}</h3>
                  
                  {/* Bolinhas indicadoras usando flex */}
                  <div className="flex items-center gap-1.5 ml-2" style={{ zIndex: 99999 }}>
                    {selectedConversation === conv.id && messages.length > 0 && (
                      <div 
                        className="w-3 h-3 bg-yellow-500 rounded-full shadow-lg flex-shrink-0"
                        title="Com mensagens carregadas"
                      />
                    )}

                    {/* Green indicator - Selected conversation (right) */}
                    {selectedConversation === conv.id && (
                      <div 
                        className="w-3 h-3 bg-green-500 rounded-full shadow-lg flex-shrink-0"
                        title="Conversa selecionada"
                      />
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="min-h-[600px] px-6 pb-6">
        <div className="h-full bg-[var(--sidebar-bg)] rounded-lg border border-[var(--sidebar-border)] p-6 flex flex-col">
          <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4 flex-shrink-0">
            {selectedConversation ? "Mensagens" : "Selecione uma conversa"}
          </h2>
          {loadingMessages ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : selectedConversation ? (
            <div className="flex-1 space-y-3 overflow-y-auto">
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
                    {msg.role === "user" && (
                      <button
                        onClick={() => loadMessageLog(msg.id)}
                        className="ml-2 p-1 rounded hover:bg-purple-500/20 transition-colors"
                        title="Ver log da API"
                      >
                        <FileText className="w-4 h-4 text-purple-500" />
                      </button>
                    )}
                  </div>
                  <p className="text-[var(--text-primary)] whitespace-pre-wrap">{msg.content}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[var(--text-secondary)] text-center flex-1 flex items-center justify-center">
              Selecione uma conversa para ver as mensagens
            </p>
          )}
        </div>
      </div>

      {selectedMessageLog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedMessageLog(null)}>
          <div className="bg-[var(--sidebar-bg)] rounded-lg border border-[var(--sidebar-border)] max-w-4xl w-full max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-[var(--text-primary)]">Log da API</h3>
                <button
                  onClick={() => setSelectedMessageLog(null)}
                  className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                >
                  ✕
                </button>
              </div>

              {!selectedMessageLog.request_payload && !selectedMessageLog.response_body ? (
                <div className="text-center py-8">
                  <p className="text-[var(--text-secondary)] mb-2">
                    Log não disponível para esta mensagem
                  </p>
                  <p className="text-sm text-[var(--text-secondary)]">
                    Esta mensagem foi criada antes da implementação do sistema de logs
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-[var(--text-secondary)] mb-2">Mensagem do Usuário</h4>
                    <div className="bg-[var(--app-bg)] p-3 rounded border border-[var(--sidebar-border)]">
                      <p className="text-[var(--text-primary)] whitespace-pre-wrap">{selectedMessageLog.user_message}</p>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-[var(--text-secondary)] mb-2">Resposta do Assistente</h4>
                    <div className="bg-[var(--app-bg)] p-3 rounded border border-[var(--sidebar-border)]">
                      <p className="text-[var(--text-primary)] whitespace-pre-wrap">{selectedMessageLog.assistant_response || "Sem resposta"}</p>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-[var(--text-secondary)] mb-2">Payload da Requisição</h4>
                    <div className="bg-[var(--app-bg)] p-3 rounded border border-[var(--sidebar-border)]">
                      <pre className="text-xs text-[var(--text-primary)] overflow-x-auto">
                        {JSON.stringify(selectedMessageLog.request_payload, null, 2)}
                      </pre>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-[var(--text-secondary)] mb-2">Resposta da API</h4>
                    <div className="bg-[var(--app-bg)] p-3 rounded border border-[var(--sidebar-border)]">
                      <pre className="text-xs text-[var(--text-primary)] overflow-x-auto">
                        {JSON.stringify(selectedMessageLog.response_body, null, 2)}
                      </pre>
                    </div>
                  </div>

                  <div className="flex gap-4 text-sm">
                    <div>
                      <span className="text-[var(--text-secondary)]">Status: </span>
                      <span className={selectedMessageLog.response_status === 200 ? "text-green-500" : "text-red-500"}>
                        {selectedMessageLog.response_status}
                      </span>
                    </div>
                    <div>
                      <span className="text-[var(--text-secondary)]">Timestamp: </span>
                      <span className="text-[var(--text-primary)]">
                        {new Date(selectedMessageLog.created_at).toLocaleString("pt-BR")}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
