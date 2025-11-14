"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { ArrowLeft, ChevronDown, ChevronUp, Search } from "lucide-react"

interface ApiLog {
  id: string
  user_id: string
  conversation_id: string | null
  message_id: string | null
  request_payload: any
  request_timestamp: string
  response_body: any | null
  response_status: number | null
  response_timestamp: string | null
  agent_ids: string[] | null
  user_message: string | null
  assistant_response: string | null
  error_message: string | null
  created_at: string
  profiles: {
    display_name: string | null
    email: string | null
  }
}

export default function AdminLogsPage() {
  const router = useRouter()
  const [logs, setLogs] = useState<ApiLog[]>([])
  const [filteredLogs, setFilteredLogs] = useState<ApiLog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [expandedLog, setExpandedLog] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    checkAdminAndLoadLogs()
  }, [])

  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredLogs(logs)
    } else {
      const term = searchTerm.toLowerCase()
      const filtered = logs.filter(
        (log) =>
          log.profiles?.display_name?.toLowerCase().includes(term) ||
          log.profiles?.email?.toLowerCase().includes(term) ||
          log.user_message?.toLowerCase().includes(term) ||
          log.assistant_response?.toLowerCase().includes(term),
      )
      setFilteredLogs(filtered)
    }
  }, [searchTerm, logs])

  const checkAdminAndLoadLogs = async () => {
    try {
      const supabase = createClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        router.push("/login/admin")
        return
      }

      const { data: profile } = await supabase.from("profiles").select("role").eq("id", session.user.id).single()

      if (profile?.role !== "admin") {
        router.push("/")
        return
      }

      const response = await fetch("/api/admin/logs")
      const data = await response.json()

      if (data.logs) {
        setLogs(data.logs)
        setFilteredLogs(data.logs)
      }
    } catch (error) {
      console.error("[v0] Error loading logs:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const toggleExpand = (logId: string) => {
    setExpandedLog(expandedLog === logId ? null : logId)
  }

  const getStatusColor = (status: number | null) => {
    if (!status) return "text-gray-400"
    if (status >= 200 && status < 300) return "text-green-400"
    if (status >= 400 && status < 500) return "text-yellow-400"
    return "text-red-400"
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--sidebar-bg)]">
        <div className="text-[var(--settings-text)]">Carregando logs...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--sidebar-bg)] p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-[var(--settings-text)] mb-2">API Logs</h1>
            <p className="text-[var(--settings-text-muted)]">
              {filteredLogs.length} log{filteredLogs.length !== 1 ? "s" : ""} encontrado
              {filteredLogs.length !== 1 ? "s" : ""}
            </p>
          </div>
          <Button onClick={() => router.push("/admin/dashboard")} variant="outline" className="flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Button>
        </div>

        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--settings-text-muted)]" />
            <input
              type="text"
              placeholder="Buscar por usuário, mensagem..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[var(--card-bg)] border border-[var(--chat-border)] rounded-lg text-[var(--settings-text)] placeholder:text-[var(--settings-text-muted)] focus:border-purple-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="space-y-2">
          {filteredLogs.map((log) => (
            <div
              key={log.id}
              className="bg-[var(--card-bg)] border border-[var(--chat-border)] rounded-lg overflow-hidden"
            >
              <div
                className="p-4 cursor-pointer hover:bg-[var(--agent-hover)] transition-colors"
                onClick={() => toggleExpand(log.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-[var(--settings-text)] font-medium">
                        {log.profiles?.display_name || log.profiles?.email || "Usuário desconhecido"}
                      </span>
                      <span className={`text-sm font-mono ${getStatusColor(log.response_status)}`}>
                        {log.response_status || "Pending"}
                      </span>
                      <span className="text-xs text-[var(--settings-text-muted)]">
                        {new Date(log.created_at).toLocaleString("pt-BR")}
                      </span>
                    </div>
                    <p className="text-sm text-[var(--settings-text-muted)] truncate">
                      {log.user_message || "Sem mensagem"}
                    </p>
                  </div>
                  <div className="ml-4">
                    {expandedLog === log.id ? (
                      <ChevronUp className="w-5 h-5 text-[var(--settings-text-muted)]" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-[var(--settings-text-muted)]" />
                    )}
                  </div>
                </div>
              </div>

              {expandedLog === log.id && (
                <div className="border-t border-[var(--chat-border)] p-4 space-y-4 bg-[var(--agent-bg)]">
                  <div>
                    <h3 className="text-sm font-semibold text-[var(--settings-text)] mb-2">Mensagem do Usuário</h3>
                    <p className="text-sm text-[var(--settings-text-muted)] whitespace-pre-wrap">
                      {log.user_message || "N/A"}
                    </p>
                  </div>

                  {log.assistant_response && (
                    <div>
                      <h3 className="text-sm font-semibold text-[var(--settings-text)] mb-2">Resposta do Assistente</h3>
                      <p className="text-sm text-[var(--settings-text-muted)] whitespace-pre-wrap">
                        {log.assistant_response}
                      </p>
                    </div>
                  )}

                  {log.agent_ids && log.agent_ids.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-[var(--settings-text)] mb-2">Agentes Utilizados</h3>
                      <div className="flex flex-wrap gap-2">
                        {log.agent_ids.map((agentId) => (
                          <span
                            key={agentId}
                            className="px-2 py-1 rounded-full text-xs bg-purple-500/20 text-purple-400 border border-purple-500/40"
                          >
                            {agentId}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {log.error_message && (
                    <div>
                      <h3 className="text-sm font-semibold text-red-400 mb-2">Erro</h3>
                      <p className="text-sm text-red-300 whitespace-pre-wrap">{log.error_message}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-sm font-semibold text-[var(--settings-text)] mb-2">Request Payload</h3>
                      <pre className="text-xs text-[var(--settings-text-muted)] bg-black/30 p-3 rounded overflow-x-auto">
                        {JSON.stringify(log.request_payload, null, 2)}
                      </pre>
                    </div>

                    {log.response_body && (
                      <div>
                        <h3 className="text-sm font-semibold text-[var(--settings-text)] mb-2">Response Body</h3>
                        <pre className="text-xs text-[var(--settings-text-muted)] bg-black/30 p-3 rounded overflow-x-auto">
                          {JSON.stringify(log.response_body, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>

                  <div className="text-xs text-[var(--settings-text-muted)] space-y-1">
                    <p>Request: {new Date(log.request_timestamp).toLocaleString("pt-BR")}</p>
                    {log.response_timestamp && (
                      <p>Response: {new Date(log.response_timestamp).toLocaleString("pt-BR")}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}

          {filteredLogs.length === 0 && (
            <div className="text-center py-12 text-[var(--settings-text-muted)]">Nenhum log encontrado</div>
          )}
        </div>
      </div>
    </div>
  )
}
