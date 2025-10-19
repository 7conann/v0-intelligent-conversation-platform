"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { isAdminUser } from "@/lib/utils/trial"
import { Users, MessageSquare, Bot, TrendingUp, Search, Eye } from "lucide-react"

interface UserMetrics {
  id: string
  email: string
  display_name: string
  created_at: string
  total_conversations: number
  total_messages: number
  days_remaining: number
}

interface SystemMetrics {
  total_users: number
  total_conversations: number
  total_messages: number
  total_agents: number
}

export default function AdminDashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<UserMetrics[]>([])
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics>({
    total_users: 0,
    total_conversations: 0,
    total_messages: 0,
    total_agents: 0,
  })
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    const checkAdminAndLoadData = async () => {
      const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        router.push("/login/admin")
        return
      }

      if (!isAdminUser(session.user.email || "")) {
        router.push("/chat")
        return
      }

      try {
        console.log("[v0] Fetching admin data from API...")
        const response = await fetch("/api/admin/dashboard")

        if (!response.ok) {
          throw new Error(`Failed to fetch admin data: ${response.statusText}`)
        }

        const data = await response.json()
        console.log("[v0] Admin data received:", {
          totalUsers: data.users?.length,
          totalConversations: data.systemMetrics?.total_conversations,
          totalMessages: data.systemMetrics?.total_messages,
        })

        setSystemMetrics(data.systemMetrics)
        setUsers(data.users)
      } catch (error) {
        console.error("[v0] Error loading admin data:", error)
      }

      setLoading(false)
    }

    checkAdminAndLoadData()
  }, [router])

  const filteredUsers = users.filter(
    (user) =>
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.display_name.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--app-bg)]">
        <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--app-bg)] p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2">Painel Administrativo</h1>
          <p className="text-[var(--text-secondary)]">Visão geral do sistema e gerenciamento de usuários</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-[var(--sidebar-bg)] rounded-lg p-6 border border-[var(--sidebar-border)]">
            <div className="flex items-center justify-between mb-2">
              <Users className="w-8 h-8 text-purple-500" />
              <span className="text-2xl font-bold text-[var(--text-primary)]">{systemMetrics.total_users}</span>
            </div>
            <p className="text-[var(--text-secondary)] text-sm">Total de Usuários</p>
          </div>

          <div className="bg-[var(--sidebar-bg)] rounded-lg p-6 border border-[var(--sidebar-border)]">
            <div className="flex items-center justify-between mb-2">
              <MessageSquare className="w-8 h-8 text-blue-500" />
              <span className="text-2xl font-bold text-[var(--text-primary)]">{systemMetrics.total_conversations}</span>
            </div>
            <p className="text-[var(--text-secondary)] text-sm">Total de Conversas</p>
          </div>

          <div className="bg-[var(--sidebar-bg)] rounded-lg p-6 border border-[var(--sidebar-border)]">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="w-8 h-8 text-green-500" />
              <span className="text-2xl font-bold text-[var(--text-primary)]">{systemMetrics.total_messages}</span>
            </div>
            <p className="text-[var(--text-secondary)] text-sm">Total de Mensagens</p>
          </div>

          <div className="bg-[var(--sidebar-bg)] rounded-lg p-6 border border-[var(--sidebar-border)]">
            <div className="flex items-center justify-between mb-2">
              <Bot className="w-8 h-8 text-orange-500" />
              <span className="text-2xl font-bold text-[var(--text-primary)]">{systemMetrics.total_agents}</span>
            </div>
            <p className="text-[var(--text-secondary)] text-sm">Total de Agentes</p>
          </div>
        </div>

        <div className="bg-[var(--sidebar-bg)] rounded-lg border border-[var(--sidebar-border)] p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-[var(--text-primary)]">Usuários</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-secondary)]" />
              <input
                type="text"
                placeholder="Buscar usuário..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 bg-[var(--app-bg)] border border-[var(--sidebar-border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--sidebar-border)]">
                  <th className="text-left py-3 px-4 text-[var(--text-secondary)] font-medium">Usuário</th>
                  <th className="text-left py-3 px-4 text-[var(--text-secondary)] font-medium">Email</th>
                  <th className="text-center py-3 px-4 text-[var(--text-secondary)] font-medium">Conversas</th>
                  <th className="text-center py-3 px-4 text-[var(--text-secondary)] font-medium">Mensagens</th>
                  <th className="text-center py-3 px-4 text-[var(--text-secondary)] font-medium">Dias Restantes</th>
                  <th className="text-center py-3 px-4 text-[var(--text-secondary)] font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b border-[var(--sidebar-border)] hover:bg-[var(--app-bg)] transition-colors"
                  >
                    <td className="py-3 px-4 text-[var(--text-primary)]">{user.display_name}</td>
                    <td className="py-3 px-4 text-[var(--text-secondary)]">{user.email}</td>
                    <td className="py-3 px-4 text-center text-[var(--text-primary)]">{user.total_conversations}</td>
                    <td className="py-3 px-4 text-center text-[var(--text-primary)]">{user.total_messages}</td>
                    <td className="py-3 px-4 text-center">
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
                        {user.days_remaining === 999 ? "Admin" : `${user.days_remaining} dias`}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => router.push(`/admin/users/${user.id}`)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                        Ver Detalhes
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
