"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { isAdminUser } from "@/lib/utils/trial"
import {
  Users,
  MessageSquare,
  Bot,
  TrendingUp,
  Eye,
  ChevronLeft,
  ChevronRight,
  Filter,
  X,
  Calendar,
  Phone,
  Mail,
  User,
  Clock,
  Edit,
} from "lucide-react"

interface UserMetrics {
  id: string
  email: string
  display_name: string
  phone: string | null
  created_at: string
  last_access: string | null
  account_expiration_date: string | null
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

interface Filters {
  searchName: string
  searchEmail: string
  searchPhone: string
  trialStatus: "all" | "active" | "expired" | "admin"
  createdFrom: string
  createdTo: string
  lastAccessFrom: string
  lastAccessTo: string
  sortBy: "name" | "email" | "created_at" | "last_access"
  sortOrder: "asc" | "desc"
}

const ITEMS_PER_PAGE = 10

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
  const [currentPage, setCurrentPage] = useState(1)
  const [showFilterSidebar, setShowFilterSidebar] = useState(false)
  const [filters, setFilters] = useState<Filters>({
    searchName: "",
    searchEmail: "",
    searchPhone: "",
    trialStatus: "all",
    createdFrom: "",
    createdTo: "",
    lastAccessFrom: "",
    lastAccessTo: "",
    sortBy: "name",
    sortOrder: "asc",
  })
  const [editingUser, setEditingUser] = useState<UserMetrics | null>(null)
  const [newExpirationDate, setNewExpirationDate] = useState("")
  const [savingExpiration, setSavingExpiration] = useState(false)

  useEffect(() => {
    const checkAdminAndLoadData = async () => {
      const supabase = createClient()

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

  const filteredUsers = users
    .filter((user) => {
      // Name filter
      if (filters.searchName && !user.display_name.toLowerCase().includes(filters.searchName.toLowerCase())) {
        return false
      }

      // Email filter
      if (filters.searchEmail && !user.email.toLowerCase().includes(filters.searchEmail.toLowerCase())) {
        return false
      }

      // Phone filter
      if (filters.searchPhone && (!user.phone || !user.phone.includes(filters.searchPhone))) {
        return false
      }

      // Trial status filter
      if (filters.trialStatus !== "all") {
        if (filters.trialStatus === "admin" && user.days_remaining !== 999) return false
        if (filters.trialStatus === "expired" && (user.days_remaining > 0 || user.days_remaining === 999)) return false
        if (filters.trialStatus === "active" && (user.days_remaining <= 0 || user.days_remaining === 999)) return false
      }

      // Created date range filter
      if (filters.createdFrom) {
        const createdDate = new Date(user.created_at)
        const fromDate = new Date(filters.createdFrom)
        if (createdDate < fromDate) return false
      }
      if (filters.createdTo) {
        const createdDate = new Date(user.created_at)
        const toDate = new Date(filters.createdTo)
        toDate.setHours(23, 59, 59, 999)
        if (createdDate > toDate) return false
      }

      // Last access date range filter
      if (filters.lastAccessFrom && user.last_access) {
        const accessDate = new Date(user.last_access)
        const fromDate = new Date(filters.lastAccessFrom)
        if (accessDate < fromDate) return false
      }
      if (filters.lastAccessTo && user.last_access) {
        const accessDate = new Date(user.last_access)
        const toDate = new Date(filters.lastAccessTo)
        toDate.setHours(23, 59, 59, 999)
        if (accessDate > toDate) return false
      }

      return true
    })
    .sort((a, b) => {
      let aValue: any
      let bValue: any

      switch (filters.sortBy) {
        case "name":
          aValue = a.display_name.toLowerCase()
          bValue = b.display_name.toLowerCase()
          break
        case "email":
          aValue = a.email.toLowerCase()
          bValue = b.email.toLowerCase()
          break
        case "created_at":
          aValue = new Date(a.created_at).getTime()
          bValue = new Date(b.created_at).getTime()
          break
        case "last_access":
          aValue = a.last_access ? new Date(a.last_access).getTime() : 0
          bValue = b.last_access ? new Date(b.last_access).getTime() : 0
          break
        default:
          return 0
      }

      if (filters.sortOrder === "asc") {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })

  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE)
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Nunca"
    const date = new Date(dateString)
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const resetFilters = () => {
    setFilters({
      searchName: "",
      searchEmail: "",
      searchPhone: "",
      trialStatus: "all",
      createdFrom: "",
      createdTo: "",
      lastAccessFrom: "",
      lastAccessTo: "",
      sortBy: "name",
      sortOrder: "asc",
    })
    setCurrentPage(1)
  }

  const activeFiltersCount = [
    filters.searchName,
    filters.searchEmail,
    filters.searchPhone,
    filters.trialStatus !== "all",
    filters.createdFrom,
    filters.createdTo,
    filters.lastAccessFrom,
    filters.lastAccessTo,
  ].filter(Boolean).length

  const handleUpdateExpiration = async () => {
    if (!editingUser) return

    setSavingExpiration(true)
    try {
      const response = await fetch(`/api/admin/users/${editingUser.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          account_expiration_date: newExpirationDate || null,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to update expiration")
      }

      // Reload users data
      const dashboardResponse = await fetch("/api/admin/dashboard")
      const data = await dashboardResponse.json()
      setUsers(data.users)

      setEditingUser(null)
      setNewExpirationDate("")
    } catch (error) {
      console.error("[v0] Error updating expiration:", error)
      alert("Erro ao atualizar data de expiração")
    } finally {
      setSavingExpiration(false)
    }
  }

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
            <button
              onClick={() => setShowFilterSidebar(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Filter className="w-4 h-4" />
              Filtros
              {activeFiltersCount > 0 && (
                <span className="bg-white text-purple-600 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
                  {activeFiltersCount}
                </span>
              )}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--sidebar-border)]">
                  <th className="text-left py-3 px-4 text-[var(--text-secondary)] font-medium">Usuário</th>
                  <th className="text-left py-3 px-4 text-[var(--text-secondary)] font-medium">Email</th>
                  <th className="text-left py-3 px-4 text-[var(--text-secondary)] font-medium">Telefone</th>
                  <th className="text-center py-3 px-4 text-[var(--text-secondary)] font-medium">Último Acesso</th>
                  <th className="text-center py-3 px-4 text-[var(--text-secondary)] font-medium">Conversas</th>
                  <th className="text-center py-3 px-4 text-[var(--text-secondary)] font-medium">Mensagens</th>
                  <th className="text-center py-3 px-4 text-[var(--text-secondary)] font-medium">Dias Restantes</th>
                  <th className="text-center py-3 px-4 text-[var(--text-secondary)] font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {paginatedUsers.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b border-[var(--sidebar-border)] hover:bg-[var(--app-bg)] transition-colors"
                  >
                    <td className="py-3 px-4 text-[var(--text-primary)]">{user.display_name}</td>
                    <td className="py-3 px-4 text-[var(--text-secondary)]">{user.email}</td>
                    <td className="py-3 px-4 text-[var(--text-secondary)]">{user.phone || "Não cadastrado"}</td>
                    <td className="py-3 px-4 text-center text-[var(--text-secondary)] text-sm">
                      {formatDate(user.last_access)}
                    </td>
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
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => {
                            setEditingUser(user)
                            setNewExpirationDate(
                              user.account_expiration_date
                                ? new Date(user.account_expiration_date).toISOString().split("T")[0]
                                : "",
                            )
                          }}
                          className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                          title="Editar data de expiração"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => router.push(`/admin/users/${user.id}`)}
                          className="inline-flex items-center gap-2 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <p className="text-[var(--text-secondary)] text-sm">
                Mostrando {(currentPage - 1) * ITEMS_PER_PAGE + 1} a{" "}
                {Math.min(currentPage * ITEMS_PER_PAGE, filteredUsers.length)} de {filteredUsers.length} usuários
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 bg-[var(--app-bg)] border border-[var(--sidebar-border)] rounded-lg text-[var(--text-primary)] hover:bg-[var(--sidebar-bg)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="text-[var(--text-primary)] px-4">
                  Página {currentPage} de {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 bg-[var(--app-bg)] border border-[var(--sidebar-border)] rounded-lg text-[var(--text-primary)] hover:bg-[var(--sidebar-bg)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {editingUser && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setEditingUser(null)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-[var(--sidebar-bg)] border border-[var(--sidebar-border)] rounded-lg z-50 p-6">
            <h3 className="text-xl font-bold text-[var(--text-primary)] mb-4">Editar Data de Expiração</h3>
            <p className="text-[var(--text-secondary)] mb-4">
              Usuário: <span className="font-medium text-[var(--text-primary)]">{editingUser.display_name}</span>
            </p>
            <div className="mb-6">
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                Nova Data de Expiração
              </label>
              <input
                type="date"
                value={newExpirationDate}
                onChange={(e) => setNewExpirationDate(e.target.value)}
                onClick={(e) => {
                  const input = e.target as HTMLInputElement
                  if (input.showPicker) {
                    input.showPicker()
                  }
                }}
                min={new Date().toISOString().split("T")[0]}
                className="w-full px-4 py-3 bg-[var(--app-bg)] border-2 border-[var(--sidebar-border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 cursor-pointer transition-all"
                placeholder="Selecione uma data"
              />
              <p className="text-xs text-[var(--text-secondary)] mt-2">
                Deixe vazio para acesso ilimitado (apenas para admins)
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setEditingUser(null)}
                disabled={savingExpiration}
                className="flex-1 px-4 py-2 bg-[var(--app-bg)] border border-[var(--sidebar-border)] rounded-lg text-[var(--text-primary)] hover:bg-[var(--sidebar-bg)] transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleUpdateExpiration}
                disabled={savingExpiration}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingExpiration ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </>
      )}

      {showFilterSidebar && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setShowFilterSidebar(false)} />
          <div className="fixed right-0 top-0 h-full w-96 bg-[var(--sidebar-bg)] border-l border-[var(--sidebar-border)] z-50 overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-[var(--text-primary)]">Filtros Avançados</h3>
                <button
                  onClick={() => setShowFilterSidebar(false)}
                  className="p-2 hover:bg-[var(--app-bg)] rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-[var(--text-secondary)]" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Search by name */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)] mb-2">
                    <User className="w-4 h-4" />
                    Buscar por Nome
                  </label>
                  <input
                    type="text"
                    value={filters.searchName}
                    onChange={(e) => {
                      setFilters({ ...filters, searchName: e.target.value })
                      setCurrentPage(1)
                    }}
                    placeholder="Digite o nome..."
                    className="w-full px-4 py-2 bg-[var(--app-bg)] border border-[var(--sidebar-border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                {/* Search by email */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)] mb-2">
                    <Mail className="w-4 h-4" />
                    Buscar por Email
                  </label>
                  <input
                    type="text"
                    value={filters.searchEmail}
                    onChange={(e) => {
                      setFilters({ ...filters, searchEmail: e.target.value })
                      setCurrentPage(1)
                    }}
                    placeholder="Digite o email..."
                    className="w-full px-4 py-2 bg-[var(--app-bg)] border border-[var(--sidebar-border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                {/* Search by phone */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)] mb-2">
                    <Phone className="w-4 h-4" />
                    Buscar por Telefone
                  </label>
                  <input
                    type="text"
                    value={filters.searchPhone}
                    onChange={(e) => {
                      setFilters({ ...filters, searchPhone: e.target.value })
                      setCurrentPage(1)
                    }}
                    placeholder="Digite o telefone..."
                    className="w-full px-4 py-2 bg-[var(--app-bg)] border border-[var(--sidebar-border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                {/* Trial status */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)] mb-2">
                    <Clock className="w-4 h-4" />
                    Status do Trial
                  </label>
                  <select
                    value={filters.trialStatus}
                    onChange={(e) => {
                      setFilters({ ...filters, trialStatus: e.target.value as any })
                      setCurrentPage(1)
                    }}
                    className="w-full px-4 py-2 bg-[var(--app-bg)] border border-[var(--sidebar-border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="all">Todos</option>
                    <option value="active">Trial Ativo</option>
                    <option value="expired">Trial Expirado</option>
                    <option value="admin">Administradores</option>
                  </select>
                </div>

                {/* Created date range */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)] mb-2">
                    <Calendar className="w-4 h-4" />
                    Data de Criação
                  </label>
                  <div className="space-y-2">
                    <input
                      type="date"
                      value={filters.createdFrom}
                      onChange={(e) => {
                        setFilters({ ...filters, createdFrom: e.target.value })
                        setCurrentPage(1)
                      }}
                      className="w-full px-4 py-2 bg-[var(--app-bg)] border border-[var(--sidebar-border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <input
                      type="date"
                      value={filters.createdTo}
                      onChange={(e) => {
                        setFilters({ ...filters, createdTo: e.target.value })
                        setCurrentPage(1)
                      }}
                      className="w-full px-4 py-2 bg-[var(--app-bg)] border border-[var(--sidebar-border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>

                {/* Last access date range */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)] mb-2">
                    <Clock className="w-4 h-4" />
                    Último Acesso
                  </label>
                  <div className="space-y-2">
                    <input
                      type="date"
                      value={filters.lastAccessFrom}
                      onChange={(e) => {
                        setFilters({ ...filters, lastAccessFrom: e.target.value })
                        setCurrentPage(1)
                      }}
                      className="w-full px-4 py-2 bg-[var(--app-bg)] border border-[var(--sidebar-border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <input
                      type="date"
                      value={filters.lastAccessTo}
                      onChange={(e) => {
                        setFilters({ ...filters, lastAccessTo: e.target.value })
                        setCurrentPage(1)
                      }}
                      className="w-full px-4 py-2 bg-[var(--app-bg)] border border-[var(--sidebar-border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>

                {/* Sort options */}
                <div>
                  <label className="text-sm font-medium text-[var(--text-primary)] mb-2 block">Ordenar Por</label>
                  <select
                    value={filters.sortBy}
                    onChange={(e) => setFilters({ ...filters, sortBy: e.target.value as any })}
                    className="w-full px-4 py-2 bg-[var(--app-bg)] border border-[var(--sidebar-border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-purple-500 mb-2"
                  >
                    <option value="name">Nome</option>
                    <option value="email">Email</option>
                    <option value="created_at">Data de Criação</option>
                    <option value="last_access">Último Acesso</option>
                  </select>
                  <select
                    value={filters.sortOrder}
                    onChange={(e) => setFilters({ ...filters, sortOrder: e.target.value as any })}
                    className="w-full px-4 py-2 bg-[var(--app-bg)] border border-[var(--sidebar-border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="asc">Crescente (A-Z)</option>
                    <option value="desc">Decrescente (Z-A)</option>
                  </select>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={resetFilters}
                  className="flex-1 px-4 py-2 bg-[var(--app-bg)] border border-[var(--sidebar-border)] rounded-lg text-[var(--text-primary)] hover:bg-[var(--sidebar-bg)] transition-colors"
                >
                  Limpar Filtros
                </button>
                <button
                  onClick={() => setShowFilterSidebar(false)}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Aplicar
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
