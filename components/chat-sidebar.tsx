"use client"

import type React from "react"

import type { Agent, Message } from "@/types/chat"
import { cn } from "@/lib/utils"
import {
  Settings,
  ChevronLeft,
  ChevronRight,
  Briefcase,
  X,
  BarChart3,
  Code,
  Palette,
  Users,
  Layers,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
} from "lucide-react"
import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

const AUTHORIZED_EMAILS = ["kleber.zumiotti@iprocesso.com", "angelomarchi05@gmail.com"]

const getAgentIconComponent = (agent: Agent) => {
  // If icon is an emoji, return it
  if (agent.icon && /\p{Emoji}/u.test(agent.icon)) {
    return agent.icon
  }

  // Otherwise, return a lucide icon based on the agent name
  const iconMap: Record<string, any> = {
    Finanças: BarChart3,
    RH: Users,
    Vendas: BarChart3,
    Dados: BarChart3,
    Estratégia: BarChart3,
    Marketing: Palette,
    Educação: Code,
  }

  const IconComponent = iconMap[agent.name] || Code
  return <IconComponent className="w-4 h-4 md:w-5 md:h-5 text-[var(--agent-icon)]" />
}

interface ChatSidebarProps {
  agents: Agent[]
  allAgents?: Agent[]
  agentPreferences?: Record<string, boolean>
  onToggleAgentVisibility?: (agentId: string) => void
  selectedAgents: string[]
  usedAgents: string[]
  onToggleAgent: (agentId: string) => void
  agentHistories: Record<string, Message[]>
  isMobileOpen?: boolean
  onMobileClose?: () => void
  onAgentOrderChange?: (agentIds: string[]) => void
  isSidebarOpen?: boolean
  onSelectAgent: (agentId: string) => void
}

export function ChatSidebar({
  agents,
  allAgents,
  agentPreferences,
  onToggleAgentVisibility,
  selectedAgents,
  usedAgents,
  onToggleAgent,
  agentHistories,
  isMobileOpen = false,
  onMobileClose,
  onAgentOrderChange,
  isSidebarOpen = true,
  onSelectAgent,
}: ChatSidebarProps) {
  const router = useRouter()
  const [userName, setUserName] = useState("Usuário")
  const [avatarUrl, setAvatarUrl] = useState("")
  const [isExpanded, setIsExpanded] = useState(true)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [showAgentSettings, setShowAgentSettings] = useState(false)
  const [showTopSection, setShowTopSection] = useState(true)
  const [showBottomSection, setShowBottomSection] = useState(true)

  const [viewMode, setViewMode] = useState<"sequential" | "grouped" | "icon">("sequential")
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(["Geral"]))
  const [groupIcons, setGroupIcons] = useState<Record<string, string>>({})
  const [groupsWithOrder, setGroupsWithOrder] = useState<
    Array<{ name: string; icon: string; display_order: number; description?: string }>
  >([])
  const [hoveredAgent, setHoveredAgent] = useState<Agent | null>(null)
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null)

  const [draggedAgent, setDraggedAgent] = useState<string | null>(null)
  const [draggedOverAgent, setDraggedOverAgent] = useState<string | null>(null)
  const [localAgents, setLocalAgents] = useState<Agent[]>(agents)

  const [searchQuery, setSearchQuery] = useState("")

  const [hoveredGroup, setHoveredGroup] = useState<{ name: string; count: number; description?: string } | null>(null)
  const [groupCoords, setGroupCoords] = useState<{ top: number; left: number } | null>(null)
  const [groupHoverTimeout, setGroupHoverTimeout] = useState<NodeJS.Timeout | null>(null)

  const selectedAgentId = selectedAgents.length > 0 ? selectedAgents[0] : null

  useEffect(() => {
    setLocalAgents(agents)
    console.log(
      "[v0] 🎨 SIDEBAR: Agentes recebidos:",
      agents.map((a) => ({
        name: a.name,
        id: a.id,
        group_name: a.group_name,
        group_id: (a as any).group_id,
        group: (a as any).group,
        isCustom: (a as any).isCustomAgent,
      })),
    )
    console.log("[v0] 🎨 SIDEBAR: Total de agentes na sidebar:", agents.length)
  }, [agents])

  useEffect(() => {
    const loadProfile = async () => {
      const supabase = createClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (session) {
        setIsAuthorized(AUTHORIZED_EMAILS.includes(session.user.email || ""))

        const { data: profile } = await supabase
          .from("profiles")
          .select("display_name, avatar_url")
          .eq("id", session.user.id)
          .single()

        if (profile) {
          setUserName(profile.display_name || session.user.email?.split("@")[0] || "Usuário")
          setAvatarUrl(profile.avatar_url || "")
        } else {
          setUserName(session.user.email?.split("@")[0] || "Usuário")
        }
      }

      const { data: groupsData, error: groupsError } = await supabase
        .from("groups")
        .select("name, icon, display_order, description")

      if (!groupsError && groupsData) {
        const icons: Record<string, string> = {}
        groupsData.forEach((group: any) => {
          icons[group.name] = group.icon
        })
        setGroupIcons(icons)
        setGroupsWithOrder(groupsData)
        console.log("[v0] 🎨 SIDEBAR: Group icons loaded:", icons)
        console.log("[v0] 🎨 SIDEBAR: Groups with order:", groupsData)
      } else if (groupsError) {
        console.error("[v0] ❌ SIDEBAR: Error loading group icons:", groupsError)
      }
    }

    loadProfile()
  }, [agents])

  useEffect(() => {
    const savedExpanded = localStorage.getItem("sidebarExpanded")
    if (savedExpanded !== null) {
      setIsExpanded(savedExpanded === "true")
    }
    const savedTopSection = localStorage.getItem("sidebarTopSection")
    if (savedTopSection !== null) {
      setShowTopSection(savedTopSection === "true")
    }
    const savedBottomSection = localStorage.getItem("sidebarBottomSection")
    if (savedBottomSection !== null) {
      setShowBottomSection(savedBottomSection === "true")
    }
    const savedViewMode = localStorage.getItem("sidebarViewMode")
    if (savedViewMode && (savedViewMode === "sequential" || savedViewMode === "grouped" || savedViewMode === "icon")) {
      setViewMode(savedViewMode)
    }

    const hiddenAgents = JSON.parse(localStorage.getItem("hiddenAgents") || "[]")
    console.log("[v0] 📋 Hidden agents from localStorage:", hiddenAgents)

    // Update local agents to filter out hidden ones
    const visibleAgents = agents.filter((agent) => !hiddenAgents.includes(agent.id))
    setLocalAgents(visibleAgents)
  }, [])

  const toggleExpanded = () => {
    const newState = !isExpanded
    setIsExpanded(newState)
    localStorage.setItem("sidebarExpanded", String(newState))
  }

  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>, agent: Agent) => {
    const rect = e.currentTarget.getBoundingClientRect()

    setHoveredAgent(agent)

    // Position differently based on expanded state
    if (isExpanded) {
      // When expanded, show above the element centered (like workspace)
      setCoords({
        top: rect.top - 10,
        left: rect.left + rect.width / 2,
      })
    } else {
      // When collapsed, show to the right
      setCoords({
        top: rect.top + rect.height / 2,
        left: rect.right + 8,
      })
    }
  }

  const handleMouseLeave = () => {
    setHoveredAgent(null)
    setCoords(null)
  }

  const handleGroupMouseEnter = (e: React.MouseEvent, groupName: string, agentCount: number) => {
    console.log("[v0] 👆 Group hover started:", groupName)
    const rect = e.currentTarget.getBoundingClientRect()

    // Clear any existing timeout
    if (groupHoverTimeout) {
      clearTimeout(groupHoverTimeout)
    }

    // Set a timeout for 1500ms before showing tooltip
    const timeout = setTimeout(() => {
      console.log("[v0] ⏱️ Group hover timeout reached:", groupName)

      const groupData = groupsWithOrder.find((g) => g.name === groupName)
      const groupDescription = (groupData as any)?.description || ""

      setHoveredGroup({ name: groupName, count: agentCount, description: groupDescription })
      setGroupCoords({
        top: rect.top - 8,
        left: rect.left + rect.width / 2,
      })
    }, 300)

    setGroupHoverTimeout(timeout)
  }

  const handleGroupMouseLeave = () => {
    console.log("[v0] 🚪 Group hover ended")
    // Clear the timeout if mouse leaves before 1500ms
    if (groupHoverTimeout) {
      clearTimeout(groupHoverTimeout)
      setGroupHoverTimeout(null)
    }
    setHoveredGroup(null)
    setGroupCoords(null)
  }

  const handleDragStart = (e: React.DragEvent, agentId: string) => {
    if (!isAuthorized) {
      e.preventDefault()
      return
    }
    setDraggedAgent(agentId)
    e.dataTransfer.effectAllowed = "move"
  }

  const handleDragOver = (e: React.DragEvent, agentId: string) => {
    e.preventDefault()
    if (!isAuthorized) {
      return
    }
    if (draggedAgent && draggedAgent !== agentId) {
      setDraggedOverAgent(agentId)
    }
  }

  const handleDragEnd = async () => {
    if (!isAuthorized) {
      setDraggedAgent(null)
      setDraggedOverAgent(null)
      return
    }

    if (draggedAgent && draggedOverAgent) {
      const draggedIndex = localAgents.findIndex((a) => a.id === draggedAgent)
      const targetIndex = localAgents.findIndex((a) => a.id === draggedOverAgent)

      if (draggedIndex !== -1 && targetIndex !== -1) {
        const newAgents = [...localAgents]
        const [removed] = newAgents.splice(draggedIndex, 1)
        newAgents.splice(targetIndex, 0, removed)
        setLocalAgents(newAgents)

        // Save new order to database
        const supabase = createClient()
        const agentIds = newAgents.map((a) => a.id)

        // Update order for each agent
        for (let i = 0; i < newAgents.length; i++) {
          const agent = newAgents[i]
          const tableName = (agent as any).isCustomAgent ? "custom_agents" : "agents"
          await supabase.from(tableName).update({ order: i }).eq("id", agent.id)
        }

        // Notify parent component
        if (onAgentOrderChange) {
          onAgentOrderChange(agentIds)
        }

        console.log("[v0] 💾 Agent order saved:", agentIds)
      }
    }
    setDraggedAgent(null)
    setDraggedOverAgent(null)
  }

  const toggleViewMode = (mode: "sequential" | "grouped" | "icon") => {
    setViewMode(mode)
    localStorage.setItem("sidebarViewMode", mode)
  }

  const toggleGroup = (groupName: string) => {
    const newExpanded = new Set(expandedGroups)
    if (newExpanded.has(groupName)) {
      newExpanded.delete(groupName)
    } else {
      newExpanded.add(groupName)
    }
    setExpandedGroups(newExpanded)
  }

  const toggleTopSection = () => {
    const newState = !showTopSection
    setShowTopSection(newState)
    localStorage.setItem("sidebarTopSection", String(newState))
  }

  const toggleBottomSection = () => {
    const newState = !showBottomSection
    setShowBottomSection(newState)
    localStorage.setItem("sidebarBottomSection", String(newState))
  }

  const filteredAgents = localAgents.filter((agent) => {
    if (agent.is_active === false) return false

    // Filter by localStorage hidden agents (per-user visibility)
    const hiddenAgents = JSON.parse(localStorage.getItem("hiddenAgents") || "[]")
    if (hiddenAgents.includes(agent.id)) return false

    // Filtro de busca
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      agent.name.toLowerCase().includes(query) ||
      agent.description?.toLowerCase().includes(query) ||
      agent.trigger_word?.toLowerCase().includes(query)
    )
  })

  const groupedAgents = filteredAgents.reduce(
    (acc, agent) => {
      const groupName = agent.group?.name || agent.group_name || "Sem Grupo"
      if (!acc[groupName]) {
        acc[groupName] = []
      }
      acc[groupName].push(agent)
      return acc
    },
    {} as Record<string, Agent[]>,
  )

  const activeGroupedAgents = Object.keys(groupIcons).reduce(
    (acc, groupName) => {
      const agentsInGroup = groupedAgents[groupName] || []

      // If there's a search query, only include groups with agents
      // If no search query, include all groups (even empty ones)
      if (searchQuery.trim()) {
        if (agentsInGroup.length > 0) {
          acc[groupName] = agentsInGroup
        }
      } else {
        acc[groupName] = agentsInGroup
      }

      return acc
    },
    {} as Record<string, Agent[]>,
  )

  // Also include any groups that have agents but aren't in the groups table
  Object.entries(groupedAgents).forEach(([groupName, groupAgents]) => {
    if (!groupIcons[groupName] && groupAgents.length > 0) {
      if (groupName !== "Sem Grupo") {
        console.log("[v0] ⚠️ SIDEBAR: Group has agents but not in groups table:", groupName)
      }
      activeGroupedAgents[groupName] = groupAgents
    }
  })

  const renderAgentButton = (agent: Agent) => {
    const isSelected = selectedAgents.includes(agent.id)
    const isUsed = usedAgents.includes(agent.id)
    const messageCount = agentHistories[agent.id]?.length || 0
    const iconContent = getAgentIconComponent(agent)
    const isDragging = draggedAgent === agent.id
    const isDraggedOver = draggedOverAgent === agent.id
    const isCustomAgent = (agent as any).isCustomAgent || false

    return (
      <button
        key={agent.id}
        draggable={isAuthorized}
        onDragStart={(e) => handleDragStart(e, agent.id)}
        onDragOver={(e) => handleDragOver(e, agent.id)}
        onDragEnd={handleDragEnd}
        onClick={() => onSelectAgent(agent.id)}
        onMouseEnter={(e) => handleMouseEnter(e, agent)}
        onMouseLeave={handleMouseLeave}
        className={cn(
          "transition-all duration-300 relative group",
          isAuthorized && "cursor-move",
          !isAuthorized && "cursor-pointer",
          isExpanded
            ? "w-full px-4 py-3 rounded-xl flex items-center gap-3 justify-start bg-[var(--agent-bg)] hover:bg-[var(--agent-hover)] hover:scale-[1.02]"
            : "w-12 h-12 rounded-xl flex items-center justify-center bg-[var(--agent-bg)] hover:bg-[var(--agent-hover)] hover:scale-105",
          isSelected && "border-2 border-solid shadow-lg",
          isUsed && !isSelected && "border-2 border-dashed border-white/40",
          isDragging && "animate-shake opacity-50 scale-110",
          isDraggedOver && "scale-110 ring-2 ring-purple-500",
        )}
        style={{
          ...(isSelected && { borderColor: agent.color }),
        }}
      >
        {isCustomAgent && (
          <div className="absolute -top-1 -left-1 w-4 h-4 bg-purple-600 rounded-full flex items-center justify-center">
            <Layers className="w-2.5 h-2.5 text-white" />
          </div>
        )}

        {typeof iconContent === "string" ? (
          <span
            className={cn("transition-all duration-300", isExpanded ? "text-xl" : "text-lg md:text-xl")}
            style={{
              filter: isSelected || isUsed ? "none" : "grayscale(50%) opacity(0.7)",
            }}
          >
            {iconContent}
          </span>
        ) : (
          <div
            className="transition-all duration-300"
            style={{
              filter: isSelected || isUsed ? "none" : "grayscale(50%) opacity(0.7)",
            }}
          >
            {iconContent}
          </div>
        )}

        {isExpanded && (
          <span className="text-sm font-medium text-[var(--text-primary)] truncate flex-1 text-left">{agent.name}</span>
        )}

        {messageCount > 0 && (
          <span
            className={cn(
              "rounded-full text-[9px] font-bold flex items-center justify-center text-white",
              isExpanded ? "px-2 py-0.5 ml-auto" : "absolute -top-1 -right-1 w-4 h-4",
            )}
            style={{ backgroundColor: agent.color }}
          >
            {messageCount > 9 ? "9+" : messageCount}
          </span>
        )}
      </button>
    )
  }

  const renderIconButton = (agent: Agent) => {
    const isSelected = selectedAgents.includes(agent.id)
    const isUsed = usedAgents.includes(agent.id)
    const messageCount = agentHistories[agent.id]?.length || 0
    const iconContent = getAgentIconComponent(agent)
    const isCustomAgent = (agent as any).isCustomAgent || false

    return (
      <button
        key={agent.id}
        onClick={() => onSelectAgent(agent.id)}
        onMouseEnter={(e) => handleMouseEnter(e, agent)}
        onMouseLeave={handleMouseLeave}
        className={cn(
          "w-14 h-14 rounded-xl flex items-center justify-center bg-[var(--agent-bg)] hover:bg-[var(--agent-hover)] flex items-center justify-center transition-all relative",
          isSelected && "border-2 border-solid shadow-lg",
          isUsed && !isSelected && "border-2 border-dashed border-white/40",
        )}
        style={{
          ...(isSelected && { borderColor: agent.color }),
        }}
      >
        {isCustomAgent && (
          <div className="absolute -top-1 -left-1 w-4 h-4 bg-purple-600 rounded-full flex items-center justify-center">
            <Layers className="w-2.5 h-2.5 text-white" />
          </div>
        )}

        {typeof iconContent === "string" ? (
          <span
            className="text-2xl transition-all duration-300"
            style={{
              filter: isSelected || isUsed ? "none" : "grayscale(50%) opacity(0.7)",
            }}
          >
            {iconContent}
          </span>
        ) : (
          <div
            className="transition-all duration-300"
            style={{
              filter: isSelected || isUsed ? "none" : "grayscale(50%) opacity(0.7)",
            }}
          >
            {iconContent}
          </div>
        )}

        {messageCount > 0 && (
          <span
            className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-[9px] font-bold flex items-center justify-center text-white"
            style={{ backgroundColor: agent.color }}
          >
            {messageCount > 9 ? "9+" : messageCount}
          </span>
        )}
      </button>
    )
  }

  return (
    <>
      {isMobileOpen && <div className="md:hidden fixed inset-0 bg-black/60 z-30" onClick={onMobileClose} />}

      {showAgentSettings && allAgents && onToggleAgentVisibility && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--sidebar-bg)] rounded-2xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">Gerenciar Agentes</h2>
              <button
                onClick={() => setShowAgentSettings(false)}
                className="w-8 h-8 rounded-full bg-[var(--agent-bg)] hover:bg-[var(--agent-hover)] flex items-center justify-center transition-all"
              >
                <X className="w-4 h-4 text-[var(--text-primary)]" />
              </button>
            </div>
            <p className="text-sm text-[var(--text-secondary)] mb-4">
              Escolha quais agentes você deseja ver na sidebar
            </p>
            <div className="space-y-2">
              {allAgents.map((agent) => {
                const isVisible = agentPreferences?.[agent.id] ?? true
                const iconContent = getAgentIconComponent(agent)

                return (
                  <button
                    key={agent.id}
                    onClick={() => onToggleAgentVisibility(agent.id)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-[var(--agent-bg)] hover:bg-[var(--agent-hover)] transition-all"
                  >
                    {typeof iconContent === "string" ? (
                      <span className="text-xl">{iconContent}</span>
                    ) : (
                      <div>{iconContent}</div>
                    )}
                    <span className="flex-1 text-left text-sm font-medium text-[var(--text-primary)]">
                      {agent.name}
                    </span>
                    {isVisible ? (
                      <Eye className="w-5 h-5 text-green-500" />
                    ) : (
                      <EyeOff className="w-5 h-5 text-gray-400" />
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      <div
        className={cn(
          "bg-[var(--sidebar-bg)] border-r border-[var(--sidebar-border)] flex flex-col items-center gap-4 py-4 md:py-6 transition-all duration-300",
          "fixed md:relative left-0 top-0 bottom-0 z-40",
          "md:translate-x-0",
          isMobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
          isExpanded ? "w-64" : "w-20",
        )}
      >
        <button
          onClick={onMobileClose}
          className="md:hidden absolute right-2 top-2 w-8 h-8 rounded-full bg-[var(--agent-bg)] border border-[var(--sidebar-border)] flex items-center justify-center hover:bg-[var(--agent-hover)] transition-all z-10"
        >
          <X className="w-4 h-4 text-[var(--text-primary)]" />
        </button>

        <button
          onClick={toggleExpanded}
          className={cn(
            "hidden md:flex absolute -right-3 top-3 w-6 h-6 rounded-full bg-[var(--agent-bg)] hover:bg-[var(--agent-hover)] flex items-center justify-center transition-all cursor-pointer mb-2",
            !isExpanded && "w-10 h-10",
          )}
          title={isExpanded ? "Recolher sidebar" : "Expandir sidebar"}
        >
          {isExpanded ? (
            <ChevronLeft className="w-4 h-4 md:w-5 md:h-5 text-[var(--agent-icon)]" />
          ) : (
            <ChevronRight className="w-4 h-4 md:w-5 md:h-5 text-[var(--agent-icon)]" />
          )}
        </button>

        {showTopSection && (
          <>
            <div className="flex flex-col items-center gap-2 mb-2">
              <button
                onClick={() => router.push("/profile")}
                className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center hover:scale-105 transition-transform cursor-pointer overflow-hidden"
              >
                <img src="/iredondo.png" alt={userName || "User avatar"} className="w-full h-full object-cover" />
              </button>
              {isExpanded && (
                <span className="text-xs text-[var(--text-secondary)] font-medium truncate max-w-[200px] px-2">
                  {userName}
                </span>
              )}
            </div>

            <div className="w-full h-px bg-[var(--background)] mb-2" />
          </>
        )}

        <button
          onClick={toggleTopSection}
          className={cn(
            "w-10 h-10 rounded-xl bg-[var(--agent-bg)] hover:bg-[var(--agent-hover)] flex items-center justify-center transition-all cursor-pointer mb-2",
            !isExpanded && "w-10 h-10",
          )}
          title={showTopSection ? "Ocultar cabeçalho" : "Mostrar cabeçalho"}
        >
          {showTopSection ? (
            <ChevronUp className="w-4 h-4 md:w-5 md:h-5 text-[var(--agent-icon)]" />
          ) : (
            <ChevronDown className="w-4 h-4 md:w-5 md:h-5 text-[var(--agent-icon)]" />
          )}
        </button>

        {isExpanded && (
          <div className="w-full px-3 mb-2">
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar agentes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 pl-9 bg-[var(--agent-bg)] border border-[var(--sidebar-border)] rounded-lg text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
              />
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-[var(--agent-hover)] hover:bg-[var(--sidebar-border)] flex items-center justify-center transition-all"
                >
                  <X className="w-3 h-3 text-[var(--text-secondary)]" />
                </button>
              )}
            </div>
          </div>
        )}

        {isExpanded && (
          <div className="w-full px-3 mb-3">
            <div className="flex gap-1 p-1 bg-[var(--agent-bg)] rounded-lg">
              <button
                onClick={() => toggleViewMode("sequential")}
                className={cn(
                  "flex-1 px-3 py-2 rounded-md text-xs font-medium transition-all duration-200",
                  viewMode === "sequential"
                    ? "bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-md"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
                )}
              >
                Sequencial
              </button>
              <button
                onClick={() => toggleViewMode("grouped")}
                className={cn(
                  "flex-1 px-3 py-2 rounded-md text-xs font-medium transition-all duration-200",
                  viewMode === "grouped"
                    ? "bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-md"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
                )}
              >
                Grupo
              </button>
              <button
                onClick={() => toggleViewMode("icon")}
                className={cn(
                  "flex-1 px-3 py-2 rounded-md text-xs font-medium transition-all duration-200",
                  viewMode === "icon"
                    ? "bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-md"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
                )}
              >
                Ícones
              </button>
            </div>
          </div>
        )}

        <div
          className={cn(
            "w-full px-2 md:px-3 overflow-y-auto",
            "scrollbar-thin scrollbar-thumb-purple-500/50 scrollbar-track-transparent hover:scrollbar-thumb-purple-500/70",
            viewMode === "icon" && isExpanded
              ? filteredAgents.length > 12
                ? "grid grid-cols-3 gap-2 max-h-[calc(100vh-380px)]"
                : "grid grid-cols-2 gap-2 max-h-[calc(100vh-380px)]"
              : isExpanded
                ? "flex flex-col gap-2 max-h-[calc(100vh-380px)]"
                : "grid grid-cols-1 place-items-center gap-2 max-h-[calc(100vh-340px)]",
            !showBottomSection &&
              !showTopSection &&
              (viewMode === "icon" && isExpanded
                ? filteredAgents.length > 12
                  ? "max-h-[calc(100vh-160px)]"
                  : "max-h-[calc(100vh-160px)]"
                : isExpanded
                  ? "max-h-[calc(100vh-160px)]"
                  : "max-h-[calc(100vh-140px)]"),
          )}
        >
          {viewMode === "icon"
            ? filteredAgents.map((agent) => renderIconButton(agent))
            : viewMode === "sequential"
              ? filteredAgents.map((agent) => renderAgentButton(agent))
              : groupsWithOrder
                  .filter(({ name: groupName }) => {
                    const groupAgents = activeGroupedAgents[groupName]

                    // If there's a search query, only show groups with agents
                    // If no search query, show all groups
                    if (searchQuery.trim()) {
                      return groupAgents && groupAgents.length > 0
                    }
                    return true
                  })
                  .sort((a, b) => a.display_order - b.display_order)
                  .map(({ name: groupName }) => {
                    const groupAgents = activeGroupedAgents[groupName] || []
                    const isExpandedGroup = expandedGroups.has(groupName)
                    const groupIcon = groupIcons[groupName] || "📁"

                    return (
                      <div key={groupName} className="w-full mb-1">
                        <button
                          onClick={() => toggleGroup(groupName)}
                          onMouseEnter={(e) => handleGroupMouseEnter(e, groupName, groupAgents.length)}
                          onMouseLeave={handleGroupMouseLeave}
                          className={cn(
                            "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200",
                            "bg-gradient-to-r from-purple-500/10 to-blue-500/10",
                            "hover:from-purple-500/20 hover:to-blue-500/20",
                            "border border-purple-500/20",
                            "shadow-sm hover:shadow-md",
                            "mb-1",
                          )}
                        >
                          <div
                            className={cn(
                              "w-8 h-8 rounded-lg flex items-center justify-center transition-all flex-shrink-0",
                              "bg-gradient-to-br from-purple-500 to-blue-600",
                              "shadow-sm",
                            )}
                          >
                            <span className="text-lg">{groupIcon}</span>
                          </div>

                          <span className="text-sm font-semibold text-[var(--text-primary)] flex-1 text-left truncate">
                            {groupName}
                          </span>

                          <span className="rounded-full w-6 h-6 flex items-center justify-center text-[10px] font-bold text-white bg-gradient-to-br from-purple-500 to-blue-600 shadow-sm flex-shrink-0">
                            {groupAgents.length}
                          </span>

                          <div
                            className={cn(
                              "w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0",
                              "bg-[var(--agent-bg)]",
                              "transition-all duration-200",
                            )}
                          >
                            <ChevronDown
                              className={cn(
                                "w-4 h-4 text-[var(--text-secondary)] transition-transform duration-200",
                                isExpandedGroup ? "rotate-180" : "",
                              )}
                            />
                          </div>
                        </button>

                        {isExpandedGroup && (
                          <div className="flex flex-col gap-1.5 pl-3 border-l-2 border-purple-500/20 ml-4">
                            {groupAgents.map((agent) => renderAgentButton(agent))}
                          </div>
                        )}
                      </div>
                    )
                  })}
        </div>

        <div className="flex-1" />

        <button
          onClick={toggleBottomSection}
          className={cn(
            "w-10 h-10 rounded-xl bg-[var(--agent-bg)] hover:bg-[var(--agent-hover)] flex items-center justify-center transition-all cursor-pointer mb-2",
            !isExpanded && "w-10 h-10",
          )}
          title={showBottomSection ? "Ocultar configurações" : "Mostrar configurações"}
        >
          {showBottomSection ? (
            <ChevronDown className="w-4 h-4 md:w-5 md:h-5 text-[var(--agent-icon)]" />
          ) : (
            <ChevronUp className="w-4 h-4 md:w-5 md:h-5 text-[var(--agent-icon)]" />
          )}
        </button>

        {showBottomSection && (
          <>
            <div className="w-full h-px bg-[var(--background)] mt-2" />

            <div
              className={cn(
                "flex gap-2 px-2",
                isExpanded ? "flex-row items-center justify-center" : "flex-col items-center",
              )}
            >
              <button
                onClick={() => router.push("/workspaces")}
                className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-[var(--agent-bg)] hover:bg-[var(--agent-hover)] flex items-center justify-center transition-all cursor-pointer"
                title="Workspace"
              >
                <Briefcase className="w-4 h-4 md:w-5 md:h-5 text-[var(--agent-icon)]" />
              </button>

              <button
                onClick={() => router.push("/profile")}
                className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-[var(--agent-bg)] hover:bg-[var(--agent-hover)] flex items-center justify-center transition-all cursor-pointer"
                title="Configurações"
              >
                <Settings className="w-4 h-4 md:w-5 md:h-5 text-[var(--agent-icon)]" />
              </button>
            </div>
          </>
        )}

        {hoveredAgent &&
          coords &&
          createPortal(
            <div
              className="fixed px-4 py-3 bg-gray-900 text-white text-sm rounded-lg shadow-xl transition-opacity opacity-100 max-w-xs border border-gray-700 whitespace-normal break-words"
              style={{
                top: coords.top,
                left: isExpanded ? Math.max(160, Math.min(coords.left, window.innerWidth - 160)) : coords.left,
                transform: isExpanded ? "translate(-50%, -100%)" : "translate(0, -50%)",
                marginTop: isExpanded ? "-8px" : "0",
                zIndex: 99999,
                pointerEvents: "none",
              }}
            >
              <div className="font-semibold mb-1">{hoveredAgent.name}</div>
              {hoveredAgent.description && (
                <div className="text-xs text-gray-300 leading-relaxed">{hoveredAgent.description}</div>
              )}
            </div>,
            document.getElementById("tooltip-root")!,
          )}

        {hoveredGroup &&
          groupCoords &&
          groupCoords.top !== 0 &&
          groupCoords.left !== 0 &&
          createPortal(
            <div
              className="fixed px-4 py-3 bg-gray-900 text-white text-sm rounded-lg shadow-xl transition-opacity opacity-100 max-w-xs border border-gray-700"
              style={{
                top: groupCoords.top,
                left: Math.max(160, Math.min(groupCoords.left, window.innerWidth - 160)),
                transform: "translate(-50%, -100%)",
                zIndex: 99999,
                pointerEvents: "none",
              }}
            >
              <div className="font-semibold mb-1">{hoveredGroup.name}</div>
              <div className="text-xs text-gray-300 whitespace-normal break-words">
                {hoveredGroup.description || `${hoveredGroup.count} ${hoveredGroup.count === 1 ? "agente" : "agentes"}`}
              </div>
            </div>,
            document.getElementById("tooltip-root")!,
          )}
      </div>
    </>
  )
}
