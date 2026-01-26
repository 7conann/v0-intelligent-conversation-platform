"use client"

import { useEffect, useState } from "react"
import { useRouter } from 'next/navigation'
import { createClient } from "@/lib/supabase/client"
import { isAdminUser } from "@/lib/utils/trial"
import { Users, MessageSquare, Bot, TrendingUp, Eye, Calendar, BarChart3, PieChart } from 'lucide-react'
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
        console.log("[v0] 📊 Fetching dashboard data...")
        
        // Fetch system metrics
        const response = await fetch("/api/admin/dashboard")
        if (!response.ok) {
          throw new Error(`Failed to fetch admin data: ${response.statusText}`)
        }

        const data = await response.json()
        console.log("[v0] 📊 Dashboard data received:", data)
        console.log("[v0] 📊 System metrics:", data.systemMetrics)
        
        setSystemMetrics(data.systemMetrics)

        // Fetch chart data
        console.log("[v0] 📈 Fetching chart data...")
        const chartResponse = await fetch("/api/admin/dashboard/charts")
        if (chartResponse.ok) {
          const charts = await chartResponse.json()
          console.log("[v0] 📈 Chart data received:", {
            messagesCount: charts.messagesPerDay?.length,
            conversationsCount: charts.conversationsPerDay?.length,
            agentUsageCount: charts.agentUsage?.length,
            userActivityCount: charts.userActivity?.length
          })
          setChartData(charts)
        }
      } catch (error) {
        console.error("[v0] ❌ Error loading admin data:", error)
      }

      setLoading(false)
    }

    checkAdminAndLoadData()
  }, [router])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--app-bg)]">
        <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

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
    <div className="min-h-screen bg-[var(--app-bg)] p-6">
      <div className="max-w-7xl mx-auto">
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
                {chartData.userActivity.slice(0, 10).map((user, index) => (
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
      </div>
    </div>
  )
}
