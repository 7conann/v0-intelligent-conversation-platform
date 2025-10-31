"use client"

import type React from "react"

import type { Agent, Message } from "@/types/chat"
import { cn } from "@/lib/utils"
import {
  User,
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
}: ChatSidebarProps) {
  const router = useRouter()
  const [userName, setUserName] = useState("Usuário")
  const [avatarUrl, setAvatarUrl] = useState("")
  const [isExpanded, setIsExpanded] = useState(true)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [showAgentSettings, setShowAgentSettings] = useState(false)

  const [viewMode, setViewMode] = useState<"sequential" | "grouped">("sequential")
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(["Geral"]))
  const [groupIcons, setGroupIcons] = useState<Record<string, string>>({})

  const [hoveredAgent, setHoveredAgent] = useState<string | null>(null)
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null)

  const [draggedAgent, setDraggedAgent] = useState<string | null>(null)
  const [draggedOverAgent, setDraggedOverAgent] = useState<string | null>(null)
  const [localAgents, setLocalAgents] = useState<Agent[]>(agents)

  useEffect(() => {
    const deduplicatedAgents = agents.reduce((acc, agent) => {
      // Check if we already have an agent with this exact name
      const exactMatch = acc.find((a) => a.name === agent.name)
      if (exactMatch) {
        console.log("[v0] 🔄 Removendo agente duplicado (nome exato):", agent.name, agent.id)
        return acc
      }

      // Check if we have an agent whose name contains this agent's name or vice versa
      const partialMatch = acc.find((a) => {
        const aNameLower = a.name.toLowerCase()
        const agentNameLower = agent.name.toLowerCase()
        return aNameLower.includes(agentNameLower) || agentNameLower.includes(aNameLower)
      })

      if (partialMatch) {
        // Keep the agent with the longer name (more specific)
        if (agent.name.length > partialMatch.name.length) {
          // Replace the shorter name with the longer one
          console.log("[v0] 🔄 Substituindo agente com nome mais curto:", partialMatch.name, "por:", agent.name)
          const index = acc.indexOf(partialMatch)
          acc[index] = agent
        } else {
          console.log("[v0] 🔄 Removendo agente duplicado (nome parcial):", agent.name, agent.id)
        }
        return acc
      }

      // No duplicate found, add the agent
      acc.push(agent)
      return acc
    }, [] as Agent[])

    setLocalAgents(deduplicatedAgents)
    console.log(
      "[v0] 🎨 SIDEBAR: Agentes recebidos:",
      deduplicatedAgents.map((a) => ({
        name: a.name,
        id: a.id,
        group_name: a.group_name,
        isCustom: (a as any).isCustomAgent,
        trigger: a.trigger_word,
      })),
    )
    console.log("[v0] 🎨 SIDEBAR: Total de agentes na sidebar:", deduplicatedAgents.length)
    console.log("[v0] 🎨 SIDEBAR: Agentes removidos por duplicação:", agents.length - deduplicatedAgents.length)
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

      const { data: groupsData, error: groupsError } = await supabase.from("groups").select("name, icon")

      if (!groupsError && groupsData) {
        const icons: Record<string, string> = {}
        groupsData.forEach((group: any) => {
          icons[group.name] = group.icon
        })
        setGroupIcons(icons)
        console.log("[v0] 🎨 SIDEBAR: Group icons loaded:", icons)
      } else if (groupsError) {
        console.error("[v0] ❌ SIDEBAR: Error loading group icons:", groupsError)
      }
    }

    loadProfile()
  }, [])

  useEffect(() => {
    const savedExpanded = localStorage.getItem("sidebarExpanded")
    if (savedExpanded !== null) {
      setIsExpanded(savedExpanded === "true")
    }
  }, [])

  useEffect(() => {
    const savedViewMode = localStorage.getItem("sidebarViewMode")
    if (savedViewMode === "sequential" || savedViewMode === "grouped") {
      setViewMode(savedViewMode)
    }
  }, [])

  const toggleExpanded = () => {
    const newState = !isExpanded
    setIsExpanded(newState)
    localStorage.setItem("sidebarExpanded", String(newState))
  }

  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>, agentId: string, name: string) => {
    if (isExpanded) return

    const rect = e.currentTarget.getBoundingClientRect()
    const messageCount = agentHistories[agentId]?.length || 0
    const tooltipText = messageCount > 0 ? `${name} (${messageCount} mensagens)` : name
    setHoveredAgent(tooltipText)
    setCoords({
      top: rect.top + rect.height / 2,
      left: rect.right + 8,
    })
  }

  const handleMouseLeave = () => {
    setHoveredAgent(null)
    setCoords(null)
  }

  const handleDragStart = (e: React.DragEvent, agentId: string) => {
    setDraggedAgent(agentId)
    e.dataTransfer.effectAllowed = "move"
  }

  const handleDragOver = (e: React.DragEvent, agentId: string) => {
    e.preventDefault()
    if (draggedAgent && draggedAgent !== agentId) {
      setDraggedOverAgent(agentId)
    }
  }

  const handleDragEnd = async () => {
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

  const toggleViewMode = (mode: "sequential" | "grouped") => {
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

  const groupedAgents = localAgents.reduce(
    (acc, agent) => {
      const groupName = agent.group_name || "Geral"
      if (!acc[groupName]) {
        acc[groupName] = []
      }
      acc[groupName].push(agent)
      return acc
    },
    {} as Record<string, Agent[]>,
  )

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
        draggable
        onDragStart={(e) => handleDragStart(e, agent.id)}
        onDragOver={(e) => handleDragOver(e, agent.id)}
        onDragEnd={handleDragEnd}
        onClick={() => onToggleAgent(agent.id)}
        onMouseEnter={(e) => handleMouseEnter(e, agent.id, agent.name)}
        onMouseLeave={handleMouseLeave}
        className={cn(
          "transition-all duration-300 relative group cursor-move",
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
        title={agent.name}
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
          title="Fechar menu"
        >
          <X className="w-4 h-4 text-[var(--text-primary)]" />
        </button>

        <button
          onClick={toggleExpanded}
          className="hidden md:flex absolute -right-3 top-6 w-6 h-6 rounded-full bg-[var(--agent-bg)] border border-[var(--sidebar-border)] items-center justify-center hover:bg-[var(--agent-hover)] transition-all z-10"
          title={isExpanded ? "Recolher sidebar" : "Expandir sidebar"}
        >
          {isExpanded ? (
            <ChevronLeft className="w-4 h-4 text-[var(--text-primary)]" />
          ) : (
            <ChevronRight className="w-4 h-4 text-[var(--text-primary)]" />
          )}
        </button>

        <div className="flex flex-col items-center gap-2 mb-2">
          <button
            onClick={() => router.push("/profile")}
            className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center hover:scale-105 transition-transform cursor-pointer overflow-hidden"
            title={!isExpanded ? userName : undefined}
          >
            {avatarUrl ? (
              <img
                src={avatarUrl || "/placeholder.svg"}
                alt={userName || "User avatar"}
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="w-5 h-5 md:w-6 md:h-6 text-white" />
            )}
          </button>
          {isExpanded && (
            <span className="text-xs text-[var(--text-secondary)] font-medium truncate max-w-[200px] px-2">
              {userName}
            </span>
          )}
        </div>

        <div className="w-full h-px bg-[var(--background)] mb-2" />

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
                Por Grupo
              </button>
            </div>
          </div>
        )}

        <div
          className={cn(
            "w-full px-2 md:px-3 gap-2 scrollbar-hide overflow-y-auto",
            isExpanded
              ? "flex flex-col max-h-[calc(100vh-320px)]"
              : "grid grid-cols-1 place-items-center max-h-[calc(100vh-280px)]",
          )}
        >
          {console.log("[v0] 🎨 SIDEBAR: Renderizando", localAgents.length, "agentes")}

          {viewMode === "sequential"
            ? // Sequential view (existing flat list)
              localAgents.map((agent) => renderAgentButton(agent))
            : // Improved grouped view design with better visual hierarchy and styling
              Object.entries(groupedAgents).map(([groupName, groupAgents]) => {
                const isExpandedGroup = expandedGroups.has(groupName)
                const groupIcon = groupIcons[groupName] || "📁"

                return (
                  <div key={groupName} className="w-full mb-2">
                    <button
                      onClick={() => toggleGroup(groupName)}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200",
                        "bg-gradient-to-r from-purple-500/10 to-blue-500/10",
                        "hover:from-purple-500/20 hover:to-blue-500/20",
                        "border border-purple-500/20",
                        "shadow-sm hover:shadow-md",
                        "mb-2",
                      )}
                    >
                      <div
                        className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center transition-all flex-shrink-0",
                          "bg-gradient-to-br from-purple-500 to-blue-500",
                          "shadow-sm",
                        )}
                      >
                        <span className="text-lg">{groupIcon}</span>
                      </div>

                      <span className="text-sm font-semibold text-[var(--text-primary)] flex-1 text-left truncate">
                        {groupName}
                      </span>

                      <span className="rounded-full w-6 h-6 flex items-center justify-center text-[10px] font-bold text-white bg-gradient-to-br from-purple-500 to-blue-500 shadow-sm flex-shrink-0">
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
                      <div className="flex flex-col gap-2 pl-3 border-l-2 border-purple-500/20 ml-4">
                        {groupAgents.map((agent) => renderAgentButton(agent))}
                      </div>
                    )}
                  </div>
                )
              })}
        </div>

        <div className="flex-1" />

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

        {hoveredAgent &&
          coords &&
          createPortal(
            <div
              className="fixed px-2 py-1 bg-[var(--tooltip-bg)] text-[var(--tooltip-text)] text-xs rounded shadow-lg whitespace-nowrap transition-opacity opacity-100"
              style={{
                top: coords.top,
                left: coords.left,
                transform: "translateY(-50%)",
                zIndex: 999999999,
                pointerEvents: "none",
              }}
            >
              {hoveredAgent}
            </div>,
            document.getElementById("tooltip-root")!,
          )}
      </div>
    </>
  )
}
