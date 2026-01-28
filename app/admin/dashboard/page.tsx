"use client"

import { useEffect, useState } from "react"
import { useRouter } from 'next/navigation'
import { createClient } from "@/lib/supabase/client"
import { isAdminUser } from "@/lib/utils/trial"
import { Users, MessageSquare, Bot, TrendingUp, Eye, Calendar, BarChart3, PieChart, Search, Filter, ArrowUpDown, ChevronDown, MoreHorizontal, Trash2, Edit, Mail, Phone, Briefcase, Sparkles, Loader2, LogIn } from 'lucide-react'
import { Line, Bar, Doughnut } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

interface SystemMetrics {
  total_users: number
  total_conversations: number
  total_messages: number
  total_agents: number
}

interface UserData {
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

interface ChartData {
  messagesPerDay: { date: string; count: number }[]
  conversationsPerDay: { date: string; count: number }[]
  agentUsage: { agent_name: string; count: number }[]
  userActivity: { user_name: string; messages: number; conversations: number }[]
}

export default function AdminDashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics>({
    total_users: 0,
    total_conversations: 0,
    total_messages: 0,
    total_agents: 0,
  })
  const [chartData, setChartData] = useState<ChartData>({
    messagesPerDay: [],
    conversationsPerDay: [],
    agentUsage: [],
    userActivity: []
  })
  const [users, setUsers] = useState<UserData[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "expired">("all")
  const [sortBy, setSortBy] = useState<"name" | "email" | "messages" | "conversations" | "expiration">("name")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")
  const [showFilters, setShowFilters] = useState(false)
  const [editingUser, setEditingUser] = useState<UserData | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editForm, setEditForm] = useState({ 
    display_name: "", 
    phone: "", 
    account_expiration_date: "" 
  })
  const [workspaces, setWorkspaces] = useState<any[]>([])
  const [loadingInsights, setLoadingInsights] = useState<{[key: string]: 'summary' | 'trending' | null}>({})
  const [selectedWorkspace, setSelectedWorkspace] = useState<string | null>(null)
  const [impersonating, setImpersonating] = useState<string | null>(null)
  
  // Pagination states
  const [usersPage, setUsersPage] = useState(1)
  const [topUsersPage, setTopUsersPage] = useState(1)
  const [workspacesPage, setWorkspacesPage] = useState(1)
  const ITEMS_PER_PAGE = 10

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
        // Fetch system metrics
        const response = await fetch("/api/admin/dashboard")
        if (!response.ok) {
          throw new Error(`Failed to fetch admin data: ${response.statusText}`)
        }

        const data = await response.json()
        setSystemMetrics(data.systemMetrics)
        setUsers(data.users || [])

        // Fetch chart data
        const chartResponse = await fetch("/api/admin/dashboard/charts")
        if (chartResponse.ok) {
          const charts = await chartResponse.json()
          setChartData(charts)
        }

        // Fetch workspaces
        const workspacesResponse = await fetch("/api/admin/workspaces")
        if (workspacesResponse.ok) {
          const workspacesData = await workspacesResponse.json()
          setWorkspaces(workspacesData.workspaces || [])
        }
      } catch (error) {
        console.error("[v0] Error loading admin data:", error)
      }

      setLoading(false)
    }

    checkAdminAndLoadData()
  }, [router])

  const handleGetInsights = async (workspaceId: string, workspaceName: string, type: 'summary' | 'trending', userId: string) => {
    setLoadingInsights({ ...loadingInsights, [workspaceId]: type })

    try {
      const response = await fetch("/api/admin/workspace-insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, workspaceName, type, userId })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }))
        throw new Error(errorData.error || errorData.details || `HTTP ${response.status}`)
      }

      const data = await response.json()
      
      // Update workspace in local state
      setWorkspaces(workspaces.map(w => 
        w.id === workspaceId 
          ? { 
              ...w, 
              conversation_summary: type === 'summary' ? data.result : w.conversation_summary,
              trending_topics: type === 'trending' ? data.result : w.trending_topics
            }
          : w
      ))

      alert(type === 'summary' ? 'Assunto atualizado!' : 'Tópicos atualizados!')
    } catch (error) {
      alert(`Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
    } finally {
      setLoadingInsights({ ...loadingInsights, [workspaceId]: null })
    }
  }

  const handleImpersonateUser = async (userId: string, userEmail: string, userName: string) => {
    if (!confirm(`Deseja entrar como ${userName} (${userEmail})? Você será redirecionado para o painel do usuário.`)) {
      return
    }

    setImpersonating(userId)
    
    try {
      // Store admin info in sessionStorage to allow returning
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session) {
        sessionStorage.setItem('admin_impersonation', JSON.stringify({
          adminId: session.user.id,
          adminEmail: session.user.email,
          impersonatedUserId: userId,
          impersonatedUserEmail: userEmail,
          impersonatedUserName: userName,
          timestamp: new Date().toISOString()
        }))
      }

      // Redirect to chat as impersonated user
      router.push(`/chat?impersonate=${userId}`)
    } catch (error) {
      console.error("[v0] Error impersonating user:", error)
      alert("Erro ao entrar como usuário")
    } finally {
      setImpersonating(null)
    }
  }

  const handleSaveUser = async () => {
    if (!editingUser) return

    try {
      const supabase = createClient()
      
      const updateData: any = {
        display_name: editForm.display_name,
        phone: editForm.phone || null,
      }

      if (editForm.account_expiration_date) {
        updateData.account_expiration_date = new Date(editForm.account_expiration_date).toISOString()
      }

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', editingUser.id)

      if (error) throw error

      // Update local state
      setUsers(users.map(u => 
        u.id === editingUser.id 
          ? { ...u, ...updateData, days_remaining: editForm.account_expiration_date 
              ? Math.ceil((new Date(editForm.account_expiration_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
              : u.days_remaining 
            }
          : u
      ))

      setShowEditModal(false)
      setEditingUser(null)
    } catch (error) {
      console.error("[v0] Error updating user:", error)
      alert("Erro ao atualizar usuário")
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--app-bg)]">
        <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // Filter and sort users
  const filteredUsers = users
    .filter(user => {
      // Search filter
      const matchesSearch = 
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.display_name.toLowerCase().includes(searchQuery.toLowerCase())
      
      // Status filter
      const now = new Date()
      const expirationDate = user.account_expiration_date ? new Date(user.account_expiration_date) : null
      const isExpired = expirationDate ? expirationDate < now : false
      
      const matchesStatus = 
        statusFilter === "all" ? true :
        statusFilter === "active" ? !isExpired :
        statusFilter === "expired" ? isExpired : true

      return matchesSearch && matchesStatus
    })
    .sort((a, b) => {
      let comparison = 0
      switch (sortBy) {
        case "name":
          comparison = a.display_name.localeCompare(b.display_name)
          break
        case "email":
          comparison = a.email.localeCompare(b.email)
          break
        case "messages":
          comparison = a.total_messages - b.total_messages
          break
        case "conversations":
          comparison = a.total_conversations - b.total_conversations
          break
        case "expiration":
          comparison = a.days_remaining - b.days_remaining
          break
      }
      return sortOrder === "asc" ? comparison : -comparison
    })

  // Pagination calculations
  const totalUsersPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE) || 1
  const paginatedUsers = filteredUsers.slice((usersPage - 1) * ITEMS_PER_PAGE, usersPage * ITEMS_PER_PAGE)
  
  const userActivityData = chartData?.userActivity || []
  const totalTopUsersPages = Math.ceil(userActivityData.length / ITEMS_PER_PAGE) || 1
  const paginatedTopUsers = userActivityData.slice((topUsersPage - 1) * ITEMS_PER_PAGE, topUsersPage * ITEMS_PER_PAGE)
  
  const totalWorkspacesPages = Math.ceil(workspaces.length / ITEMS_PER_PAGE) || 1
  const paginatedWorkspaces = workspaces.slice((workspacesPage - 1) * ITEMS_PER_PAGE, workspacesPage * ITEMS_PER_PAGE)

  // Chart configurations
  const messagesChartData = {
    labels: chartData.messagesPerDay.slice(-30).map(d => new Date(d.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })),
    datasets: [
      {
        label: 'Mensagens',
        data: chartData.messagesPerDay.slice(-30).map(d => d.count),
        borderColor: 'rgb(147, 51, 234)',
        backgroundColor: 'rgba(147, 51, 234, 0.1)',
        fill: true,
        tension: 0.4,
      },
    ],
  }

  const conversationsChartData = {
    labels: chartData.conversationsPerDay.slice(-30).map(d => new Date(d.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })),
    datasets: [
      {
        label: 'Conversas',
        data: chartData.conversationsPerDay.slice(-30).map(d => d.count),
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderColor: 'rgb(59, 130, 246)',
        borderWidth: 1,
      },
    ],
  }

  const agentUsageData = {
    labels: chartData.agentUsage.slice(0, 10).map(a => a.agent_name),
    datasets: [
      {
        data: chartData.agentUsage.slice(0, 10).map(a => a.count),
        backgroundColor: [
          'rgba(147, 51, 234, 0.8)',
          'rgba(59, 130, 246, 0.8)',
          'rgba(16, 185, 129, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(239, 68, 68, 0.8)',
          'rgba(236, 72, 153, 0.8)',
          'rgba(14, 165, 233, 0.8)',
          'rgba(168, 85, 247, 0.8)',
          'rgba(34, 197, 94, 0.8)',
          'rgba(251, 146, 60, 0.8)',
        ],
        borderWidth: 0,
      },
    ],
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(255, 255, 255, 0.05)',
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.5)',
        },
      },
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.5)',
        },
      },
    },
  }

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          color: 'rgba(255, 255, 255, 0.8)',
          padding: 15,
          font: {
            size: 12,
          },
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
      },
    },
    cutout: '60%',
  }

  return (
    <div className="min-h-screen bg-[var(--app-bg)] p-4 md:p-6 lg:p-8">
      <div className="w-full">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2">Dashboard</h1>
          <p className="text-[var(--text-secondary)]">Visão geral do sistema com métricas em tempo real</p>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-gradient-to-br from-purple-600/20 to-purple-800/20 backdrop-blur-sm rounded-2xl p-6 border border-purple-500/20">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-500/20 rounded-xl">
                <Users className="w-6 h-6 text-purple-400" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-purple-300/80">Total de Usuários</p>
              <p className="text-3xl font-bold text-white">{systemMetrics.total_users}</p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-600/20 to-blue-800/20 backdrop-blur-sm rounded-2xl p-6 border border-blue-500/20">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-500/20 rounded-xl">
                <MessageSquare className="w-6 h-6 text-blue-400" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-blue-300/80">Total de Conversas</p>
              <p className="text-3xl font-bold text-white">{systemMetrics.total_conversations}</p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-600/20 to-green-800/20 backdrop-blur-sm rounded-2xl p-6 border border-green-500/20">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-500/20 rounded-xl">
                <TrendingUp className="w-6 h-6 text-green-400" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-green-300/80">Total de Mensagens</p>
              <p className="text-3xl font-bold text-white">{systemMetrics.total_messages}</p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-600/20 to-orange-800/20 backdrop-blur-sm rounded-2xl p-6 border border-orange-500/20">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-orange-500/20 rounded-xl">
                <Bot className="w-6 h-6 text-orange-400" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-orange-300/80">Total de Agentes</p>
              <p className="text-3xl font-bold text-white">{systemMetrics.total_agents}</p>
            </div>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Messages Over Time */}
          <div className="bg-[var(--sidebar-bg)] rounded-2xl border border-[var(--sidebar-border)] p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <BarChart3 className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">Mensagens por Dia</h3>
                <p className="text-sm text-[var(--text-secondary)]">Últimos 30 dias</p>
              </div>
            </div>
            <div className="h-64">
              <Line data={messagesChartData} options={chartOptions} />
            </div>
          </div>

          {/* Conversations Over Time */}
          <div className="bg-[var(--sidebar-bg)] rounded-2xl border border-[var(--sidebar-border)] p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <TrendingUp className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">Conversas por Dia</h3>
                <p className="text-sm text-[var(--text-secondary)]">Últimos 30 dias</p>
              </div>
            </div>
            <div className="h-64">
              <Bar data={conversationsChartData} options={chartOptions} />
            </div>
          </div>
        </div>

        {/* Agent Usage Chart */}
        <div className="grid grid-cols-1 gap-6 mb-6">
          <div className="bg-[var(--sidebar-bg)] rounded-2xl border border-[var(--sidebar-border)] p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <PieChart className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">Uso de Agentes</h3>
                <p className="text-sm text-[var(--text-secondary)]">Top 10 agentes mais utilizados</p>
              </div>
            </div>
            <div className="h-80">
              <Doughnut data={agentUsageData} options={doughnutOptions} />
            </div>
          </div>
        </div>

        {/* Trending Topics and Subjects */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Most Discussed Subjects */}
          <div className="bg-[var(--sidebar-bg)] rounded-2xl border border-[var(--sidebar-border)] p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-pink-500/20 rounded-lg">
                <MessageSquare className="w-5 h-5 text-pink-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">Assuntos Mais Falados</h3>
                <p className="text-sm text-[var(--text-secondary)]">Top 8 assuntos mais discutidos</p>
              </div>
            </div>
            <div className="h-64">
              <Bar 
                data={{
                  labels: ['Vendas', 'Marketing', 'Suporte', 'Financeiro', 'RH', 'Tecnologia', 'Operações', 'Logística'],
                  datasets: [{
                    label: 'Menções',
                    data: [342, 289, 256, 198, 167, 145, 123, 98],
                    backgroundColor: [
                      'rgba(236, 72, 153, 0.8)',
                      'rgba(147, 51, 234, 0.8)',
                      'rgba(59, 130, 246, 0.8)',
                      'rgba(16, 185, 129, 0.8)',
                      'rgba(245, 158, 11, 0.8)',
                      'rgba(239, 68, 68, 0.8)',
                      'rgba(168, 85, 247, 0.8)',
                      'rgba(14, 165, 233, 0.8)',
                    ],
                    borderWidth: 0,
                  }]
                }}
                options={chartOptions}
              />
            </div>
          </div>

          {/* Trending Topics */}
          <div className="bg-[var(--sidebar-bg)] rounded-2xl border border-[var(--sidebar-border)] p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-cyan-500/20 rounded-lg">
                <TrendingUp className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">Tópicos Mais Falados</h3>
                <p className="text-sm text-[var(--text-secondary)]">Tópicos em alta nas conversas</p>
              </div>
            </div>
            <div className="h-64">
              <Doughnut 
                data={{
                  labels: ['IA Generativa', 'Automação', 'CRM', 'Análise de Dados', 'Cloud', 'API Integration', 'Workflows'],
                  datasets: [{
                    data: [285, 234, 198, 167, 143, 112, 89],
                    backgroundColor: [
                      'rgba(6, 182, 212, 0.8)',
                      'rgba(59, 130, 246, 0.8)',
                      'rgba(147, 51, 234, 0.8)',
                      'rgba(16, 185, 129, 0.8)',
                      'rgba(245, 158, 11, 0.8)',
                      'rgba(239, 68, 68, 0.8)',
                      'rgba(236, 72, 153, 0.8)',
                    ],
                    borderWidth: 0,
                  }]
                }}
                options={doughnutOptions}
              />
            </div>
          </div>
        </div>

        {/* Top Users Activity */}
        <div className="bg-[var(--sidebar-bg)] rounded-2xl border border-[var(--sidebar-border)] p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-yellow-500/20 rounded-lg">
              <Users className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">Usuários Mais Ativos</h3>
              <p className="text-sm text-[var(--text-secondary)]">Top 10 por número de mensagens</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--sidebar-border)]">
                  <th className="text-left py-3 px-4 text-[var(--text-secondary)] font-medium">Usuário</th>
                  <th className="text-center py-3 px-4 text-[var(--text-secondary)] font-medium">Mensagens</th>
                  <th className="text-center py-3 px-4 text-[var(--text-secondary)] font-medium">Conversas</th>
                  <th className="text-center py-3 px-4 text-[var(--text-secondary)] font-medium">Média Msg/Conv</th>
                </tr>
              </thead>
              <tbody>
                {paginatedTopUsers.map((user, index) => (
                  <tr
                    key={index}
                    className="border-b border-[var(--sidebar-border)] hover:bg-[var(--app-bg)] transition-colors"
                  >
                    <td className="py-3 px-4 text-[var(--text-primary)]">{user.user_name}</td>
                    <td className="py-3 px-4 text-center text-[var(--text-primary)]">{user.messages}</td>
                    <td className="py-3 px-4 text-center text-[var(--text-primary)]">{user.conversations}</td>
                    <td className="py-3 px-4 text-center text-[var(--text-secondary)]">
                      {user.conversations > 0 ? (user.messages / user.conversations).toFixed(1) : '0'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Pagination for Top Users */}
          {totalTopUsersPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-[var(--sidebar-border)]">
              <p className="text-sm text-[var(--text-secondary)]">
                Pagina {topUsersPage} de {totalTopUsersPages}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setTopUsersPage(Math.max(1, topUsersPage - 1))}
                  disabled={topUsersPage === 1}
                  className="px-3 py-1 bg-[var(--app-bg)] border border-[var(--sidebar-border)] rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--sidebar-bg)] transition-colors"
                >
                  Anterior
                </button>
                <button
                  onClick={() => setTopUsersPage(Math.min(totalTopUsersPages, topUsersPage + 1))}
                  disabled={topUsersPage === totalTopUsersPages}
                  className="px-3 py-1 bg-[var(--app-bg)] border border-[var(--sidebar-border)] rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--sidebar-bg)] transition-colors"
                >
                  Proximo
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Comprehensive Users Table */}
        <div className="mt-6 bg-[var(--sidebar-bg)] rounded-2xl border border-[var(--sidebar-border)] p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <Users className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">Gerenciamento de Usuários</h3>
                <p className="text-sm text-[var(--text-secondary)]">{filteredUsers.length} de {users.length} usuários</p>
              </div>
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--app-bg)] border border-[var(--sidebar-border)] rounded-lg hover:bg-[var(--sidebar-bg)] transition-colors"
            >
              <Filter className="w-4 h-4" />
              Filtros
              <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="mb-6 p-4 bg-[var(--app-bg)] rounded-lg border border-[var(--sidebar-border)] space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Search */}
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                    Buscar
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
                    <input
                      type="text"
                      placeholder="Nome ou email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-[var(--sidebar-bg)] border border-[var(--sidebar-border)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]"
                    />
                  </div>
                </div>

                {/* Status Filter */}
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                    Status
                  </label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as "all" | "active" | "expired")}
                    className="w-full px-4 py-2 bg-[var(--sidebar-bg)] border border-[var(--sidebar-border)] rounded-lg text-[var(--text-primary)]"
                  >
                    <option value="all">Todos</option>
                    <option value="active">Ativos</option>
                    <option value="expired">Expirados</option>
                  </select>
                </div>

                {/* Sort By */}
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                    Ordenar por
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                      className="flex-1 px-4 py-2 bg-[var(--sidebar-bg)] border border-[var(--sidebar-border)] rounded-lg text-[var(--text-primary)]"
                    >
                      <option value="name">Nome</option>
                      <option value="email">Email</option>
                      <option value="messages">Mensagens</option>
                      <option value="conversations">Conversas</option>
                      <option value="expiration">Expiração</option>
                    </select>
                    <button
                      onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                      className="px-3 py-2 bg-[var(--sidebar-bg)] border border-[var(--sidebar-border)] rounded-lg hover:bg-[var(--app-bg)] transition-colors"
                    >
                      <ArrowUpDown className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Users Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--sidebar-border)]">
                  <th className="text-left py-3 px-4 text-[var(--text-secondary)] font-medium">Usuário</th>
                  <th className="text-left py-3 px-4 text-[var(--text-secondary)] font-medium">Contato</th>
                  <th className="text-center py-3 px-4 text-[var(--text-secondary)] font-medium">Mensagens</th>
                  <th className="text-center py-3 px-4 text-[var(--text-secondary)] font-medium">Conversas</th>
                  <th className="text-center py-3 px-4 text-[var(--text-secondary)] font-medium">Status</th>
                  <th className="text-center py-3 px-4 text-[var(--text-secondary)] font-medium">Dias Restantes</th>
                  <th className="text-center py-3 px-4 text-[var(--text-secondary)] font-medium">Último Acesso</th>
                  <th className="text-center py-3 px-4 text-[var(--text-secondary)] font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {paginatedUsers.map((user) => {
                  const isExpired = user.days_remaining <= 0
                  const isExpiringSoon = user.days_remaining > 0 && user.days_remaining <= 7

                  return (
                    <tr
                      key={user.id}
                      className="border-b border-[var(--sidebar-border)] hover:bg-[var(--app-bg)] transition-colors"
                    >
                      {/* User Info */}
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium text-[var(--text-primary)]">{user.display_name}</p>
                          <p className="text-sm text-[var(--text-secondary)]">{user.email}</p>
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                            <Mail className="w-3 h-3" />
                            <span className="truncate max-w-[200px]">{user.email}</span>
                          </div>
                          {user.phone && (
                            <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                              <Phone className="w-3 h-3" />
                              <span>{user.phone}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Messages */}
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 text-sm font-medium">
                          {user.total_messages}
                        </span>
                      </td>

                      {/* Conversations */}
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-sm font-medium">
                          {user.total_conversations}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-sm font-medium ${
                          isExpired 
                            ? 'bg-red-500/20 text-red-400' 
                            : isExpiringSoon 
                            ? 'bg-yellow-500/20 text-yellow-400' 
                            : 'bg-green-500/20 text-green-400'
                        }`}>
                          {isExpired ? 'Expirado' : isExpiringSoon ? 'Expirando' : 'Ativo'}
                        </span>
                      </td>

                      {/* Days Remaining */}
                      <td className="py-3 px-4 text-center">
                        <span className={`font-medium ${
                          isExpired 
                            ? 'text-red-400' 
                            : isExpiringSoon 
                            ? 'text-yellow-400' 
                            : 'text-green-400'
                        }`}>
                          {user.days_remaining > 0 ? `${user.days_remaining} dias` : 'Expirado'}
                        </span>
                      </td>

                      {/* Last Access */}
                      <td className="py-3 px-4 text-center text-sm text-[var(--text-secondary)]">
                        {user.last_access 
                          ? new Date(user.last_access).toLocaleDateString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })
                          : 'Nunca'
                        }
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleImpersonateUser(user.id, user.email, user.display_name)}
                            disabled={impersonating === user.id}
                            className="p-2 hover:bg-purple-500/20 rounded-lg transition-colors disabled:opacity-50"
                            title="Entrar como este usuário"
                          >
                            {impersonating === user.id ? (
                              <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
                            ) : (
                              <LogIn className="w-4 h-4 text-purple-400" />
                            )}
                          </button>
                          <button
                            onClick={() => router.push(`/admin/users/${user.id}`)}
                            className="p-2 hover:bg-[var(--sidebar-bg)] rounded-lg transition-colors"
                            title="Ver detalhes"
                          >
                            <Eye className="w-4 h-4 text-[var(--text-secondary)]" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingUser(user)
                              setEditForm({
                                display_name: user.display_name,
                                phone: user.phone || "",
                                account_expiration_date: user.account_expiration_date 
                                  ? new Date(user.account_expiration_date).toISOString().split('T')[0]
                                  : ""
                              })
                              setShowEditModal(true)
                            }}
                            className="p-2 hover:bg-[var(--sidebar-bg)] rounded-lg transition-colors"
                            title="Editar"
                          >
                            <Edit className="w-4 h-4 text-[var(--text-secondary)]" />
                          </button>
                          <button
                            className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4 text-red-400" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination for Users */}
          {totalUsersPages > 1 && filteredUsers.length > 0 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-[var(--sidebar-border)]">
              <p className="text-sm text-[var(--text-secondary)]">
                Pagina {usersPage} de {totalUsersPages} ({filteredUsers.length} usuarios)
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setUsersPage(Math.max(1, usersPage - 1))}
                  disabled={usersPage === 1}
                  className="px-3 py-1 bg-[var(--app-bg)] border border-[var(--sidebar-border)] rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--sidebar-bg)] transition-colors"
                >
                  Anterior
                </button>
                {/* Page numbers */}
                <div className="flex gap-1">
                  {Array.from({ length: Math.min(5, totalUsersPages) }, (_, i) => {
                    let pageNum = i + 1
                    if (totalUsersPages > 5) {
                      if (usersPage <= 3) {
                        pageNum = i + 1
                      } else if (usersPage >= totalUsersPages - 2) {
                        pageNum = totalUsersPages - 4 + i
                      } else {
                        pageNum = usersPage - 2 + i
                      }
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setUsersPage(pageNum)}
                        className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                          usersPage === pageNum
                            ? 'bg-purple-600 text-white'
                            : 'bg-[var(--app-bg)] border border-[var(--sidebar-border)] hover:bg-[var(--sidebar-bg)]'
                        }`}
                      >
                        {pageNum}
                      </button>
                    )
                  })}
                </div>
                <button
                  onClick={() => setUsersPage(Math.min(totalUsersPages, usersPage + 1))}
                  disabled={usersPage === totalUsersPages}
                  className="px-3 py-1 bg-[var(--app-bg)] border border-[var(--sidebar-border)] rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--sidebar-bg)] transition-colors"
                >
                  Proximo
                </button>
              </div>
            </div>
          )}

          {/* Empty State */}
          {filteredUsers.length === 0 && (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-[var(--text-secondary)] mx-auto mb-3 opacity-50" />
              <p className="text-[var(--text-secondary)]">Nenhum usuario encontrado</p>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="mt-3 text-purple-400 hover:text-purple-300 text-sm"
                >
                  Limpar filtros
                </button>
              )}
            </div>
          )}
        </div>

        {/* Workspace Insights */}
        <div className="mt-6 bg-[var(--sidebar-bg)] rounded-2xl border border-[var(--sidebar-border)] p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Briefcase className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">Insights de Workspaces</h3>
              <p className="text-sm text-[var(--text-secondary)]">Análise de conversas e tópicos mais comentados</p>
            </div>
          </div>

          {workspaces.length === 0 ? (
            <div className="text-center py-8">
              <Briefcase className="w-12 h-12 text-[var(--text-secondary)] mx-auto mb-3 opacity-50" />
              <p className="text-[var(--text-secondary)]">Nenhum workspace encontrado</p>
            </div>
          ) : (
            <div className="space-y-4">
              {paginatedWorkspaces.map((workspace) => (
                <div 
                  key={workspace.id}
                  className="bg-[var(--app-bg)] rounded-xl p-4 border border-[var(--sidebar-border)]"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-medium text-[var(--text-primary)]">{workspace.name}</h4>
                      <p className="text-sm text-[var(--text-secondary)] mt-1">
                        {workspace.conversation_count} conversas
                        {workspace.profiles && (
                          <span> • {workspace.profiles.display_name || workspace.profiles.email}</span>
                        )}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleGetInsights(workspace.id, workspace.name, 'summary', workspace.user_id)}
                        disabled={!!loadingInsights[workspace.id]}
                        className="flex items-center gap-2 px-3 py-2 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 rounded-lg transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loadingInsights[workspace.id] === 'summary' ? (
                          <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
                        ) : (
                          <MessageSquare className="w-4 h-4 text-purple-400" />
                        )}
                        <span className="text-purple-300">Resumo</span>
                      </button>
                      <button
                        onClick={() => handleGetInsights(workspace.id, workspace.name, 'trending', workspace.user_id)}
                        disabled={!!loadingInsights[workspace.id]}
                        className="flex items-center gap-2 px-3 py-2 bg-orange-600/20 hover:bg-orange-600/30 border border-orange-500/30 rounded-lg transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loadingInsights[workspace.id] === 'trending' ? (
                          <Loader2 className="w-4 h-4 text-orange-400 animate-spin" />
                        ) : (
                          <Sparkles className="w-4 h-4 text-orange-400" />
                        )}
                        <span className="text-orange-300">Tópicos</span>
                      </button>
                    </div>
                  </div>

                  {/* Display results if available */}
                  {workspace.conversation_summary && (
                    <div className="mt-3 p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                      <p className="text-xs font-medium text-purple-300 mb-1">Resumo da Conversa:</p>
                      <p className="text-sm text-[var(--text-secondary)]">{workspace.conversation_summary}</p>
                    </div>
                  )}

                  {workspace.trending_topics && (
                    <div className="mt-3 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                      <p className="text-xs font-medium text-orange-300 mb-1">Assuntos Mais Comentados:</p>
                      <p className="text-sm text-[var(--text-secondary)]">{workspace.trending_topics}</p>
                    </div>
                  )}
                </div>
              ))}
              
              {/* Pagination for Workspaces */}
              {totalWorkspacesPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-[var(--sidebar-border)]">
                  <p className="text-sm text-[var(--text-secondary)]">
                    Pagina {workspacesPage} de {totalWorkspacesPages} ({workspaces.length} workspaces)
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setWorkspacesPage(Math.max(1, workspacesPage - 1))}
                      disabled={workspacesPage === 1}
                      className="px-3 py-1 bg-[var(--app-bg)] border border-[var(--sidebar-border)] rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--sidebar-bg)] transition-colors"
                    >
                      Anterior
                    </button>
                    <button
                      onClick={() => setWorkspacesPage(Math.min(totalWorkspacesPages, workspacesPage + 1))}
                      disabled={workspacesPage === totalWorkspacesPages}
                      className="px-3 py-1 bg-[var(--app-bg)] border border-[var(--sidebar-border)] rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--sidebar-bg)] transition-colors"
                    >
                      Proximo
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="mt-6 flex gap-4">
          <button
            onClick={() => router.push('/admin/logs')}
            className="flex-1 bg-[var(--sidebar-bg)] border border-[var(--sidebar-border)] rounded-xl p-4 hover:bg-[var(--app-bg)] transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <Eye className="w-5 h-5 text-purple-400" />
              </div>
              <div className="text-left">
                <p className="font-medium text-[var(--text-primary)]">Ver Logs</p>
                <p className="text-sm text-[var(--text-secondary)]">Visualizar registros do sistema</p>
              </div>
            </div>
          </button>
          
          <button
            onClick={() => window.location.reload()}
            className="flex-1 bg-[var(--sidebar-bg)] border border-[var(--sidebar-border)] rounded-xl p-4 hover:bg-[var(--app-bg)] transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Calendar className="w-5 h-5 text-blue-400" />
              </div>
              <div className="text-left">
                <p className="font-medium text-[var(--text-primary)]">Atualizar Dados</p>
                <p className="text-sm text-[var(--text-secondary)]">Recarregar métricas em tempo real</p>
              </div>
            </div>
          </button>
        </div>

        {/* Edit User Modal */}
        {showEditModal && editingUser && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-[var(--sidebar-bg)] rounded-2xl border border-[var(--sidebar-border)] p-6 max-w-md w-full">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-[var(--text-primary)]">Editar Usuário</h3>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="p-2 hover:bg-[var(--app-bg)] rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                {/* Display Name */}
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                    Nome de Exibição
                  </label>
                  <input
                    type="text"
                    value={editForm.display_name}
                    onChange={(e) => setEditForm({ ...editForm, display_name: e.target.value })}
                    className="w-full px-4 py-2 bg-[var(--app-bg)] border border-[var(--sidebar-border)] rounded-lg text-[var(--text-primary)]"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                    Telefone
                  </label>
                  <input
                    type="text"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    placeholder="(00) 00000-0000"
                    className="w-full px-4 py-2 bg-[var(--app-bg)] border border-[var(--sidebar-border)] rounded-lg text-[var(--text-primary)]"
                  />
                </div>

                {/* Account Expiration Date */}
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                    Data de Expiração da Conta
                  </label>
                  <input
                    type="date"
                    value={editForm.account_expiration_date}
                    onChange={(e) => setEditForm({ ...editForm, account_expiration_date: e.target.value })}
                    className="w-full px-4 py-2 bg-[var(--app-bg)] border border-[var(--sidebar-border)] rounded-lg text-[var(--text-primary)]"
                  />
                </div>

                {/* User Info */}
                <div className="pt-4 border-t border-[var(--sidebar-border)]">
                  <p className="text-sm text-[var(--text-secondary)]">
                    <span className="font-medium">Email:</span> {editingUser.email}
                  </p>
                  <p className="text-sm text-[var(--text-secondary)] mt-1">
                    <span className="font-medium">Mensagens:</span> {editingUser.total_messages}
                  </p>
                  <p className="text-sm text-[var(--text-secondary)] mt-1">
                    <span className="font-medium">Conversas:</span> {editingUser.total_conversations}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 px-4 py-2 bg-[var(--app-bg)] border border-[var(--sidebar-border)] rounded-lg hover:bg-[var(--sidebar-bg)] transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveUser}
                  className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors font-medium"
                >
                  Salvar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
