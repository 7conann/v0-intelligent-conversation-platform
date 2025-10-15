"use client"

import type React from "react"

import type { Agent, Message } from "@/types/chat"
import { cn } from "@/lib/utils"
import { BarChart3, User, Code, Palette, Settings, ChevronLeft, ChevronRight, Briefcase, X } from "lucide-react"
import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

interface ChatSidebarProps {
  agents: Agent[]
  selectedAgents: string[]
  usedAgents: string[]
  onToggleAgent: (agentId: string) => void
  agentHistories: Record<string, Message[]>
  isMobileOpen?: boolean
  onMobileClose?: () => void
}

export function ChatSidebar({
  agents,
  selectedAgents,
  usedAgents,
  onToggleAgent,
  agentHistories,
  isMobileOpen = false,
  onMobileClose,
}: ChatSidebarProps) {
  const router = useRouter()
  const [userName, setUserName] = useState("Usuário")
  const [avatarUrl, setAvatarUrl] = useState("")
  const [isCollapsed, setIsCollapsed] = useState(false)

  // Tooltip states
  const [hoveredAgent, setHoveredAgent] = useState<string | null>(null)
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null)

  useEffect(() => {
    const loadProfile = async () => {
      const supabase = createClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (session) {
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
    }

    loadProfile()
  }, [])

  useEffect(() => {
    const savedCollapsed = localStorage.getItem("sidebarCollapsed")
    if (savedCollapsed) {
      setIsCollapsed(savedCollapsed === "true")
    }
  }, [])

  const toggleCollapse = () => {
    const newState = !isCollapsed
    setIsCollapsed(newState)
    localStorage.setItem("sidebarCollapsed", String(newState))
  }

  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>, agentId: string, name: string) => {
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

  const getAgentIcon = (index: number) => {
    const icons = [BarChart3, User, Code, Palette, BarChart3, User]
    const Icon = icons[index % icons.length]
    return Icon
  }

  return (
    <>
      {isMobileOpen && <div className="md:hidden fixed inset-0 bg-black/60 z-30" onClick={onMobileClose} />}

      <div
        className={cn(
          "bg-[var(--sidebar-bg)] border-r border-[var(--sidebar-border)] flex flex-col items-center gap-4 py-4 md:py-6 transition-all duration-300",
          "fixed md:relative left-0 top-0 bottom-0 z-40",
          "md:translate-x-0",
          isMobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
          isCollapsed ? "w-16" : "w-64 md:w-40",
        )}
      >
        <button
          onClick={onMobileClose}
          className="md:hidden absolute right-2 top-2 w-8 h-8 rounded-full bg-[var(--agent-bg)] border border-[var(--sidebar-border)] flex items-center justify-center hover:bg-[var(--agent-hover)] transition-all z-10"
          title="Fechar menu"
        >
          <X className="w-4 h-4" />
        </button>

        <button
          onClick={toggleCollapse}
          className="hidden md:flex absolute -right-3 top-6 w-6 h-6 rounded-full bg-[var(--agent-bg)] border border-[var(--sidebar-border)] items-center justify-center hover:bg-[var(--agent-hover)] transition-all z-10"
          title={isCollapsed ? "Expandir sidebar" : "Recolher sidebar"}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>

        <div className="flex flex-col items-center gap-2 mb-2">
          <button
            onClick={() => router.push("/profile")}
            className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center hover:scale-105 transition-transform cursor-pointer overflow-hidden"
          >
            {avatarUrl ? (
              <img src={avatarUrl || "/placeholder.svg"} alt={userName} className="w-full h-full object-cover" />
            ) : (
              <User className="w-5 h-5 md:w-6 md:h-6 text-white" />
            )}
          </button>
          {!isCollapsed && (
            <span className="text-xs text-[var(--text-secondary)] font-medium truncate max-w-[120px] px-2">
              {userName}
            </span>
          )}
        </div>

        <div className="w-full h-px bg-[var(--sidebar-border)] mb-2" />

        <div
          className={cn(
            "content-start px-2 md:px-3 gap-2 scrollbar-hide overflow-y-auto max-h-[calc(100vh-280px)] md:max-h-[calc(100vh-300px)]",
            isCollapsed ? "flex flex-col" : "grid grid-cols-2",
          )}
        >
          {agents.map((agent, index) => {
            const Icon = getAgentIcon(index)
            const isSelected = selectedAgents.includes(agent.id)
            const isUsed = usedAgents.includes(agent.id)
            const messageCount = agentHistories[agent.id]?.length || 0

            return (
              <button
                key={agent.id}
                onClick={() => onToggleAgent(agent.id)}
                onMouseEnter={(e) => handleMouseEnter(e, agent.id, agent.name)}
                onMouseLeave={handleMouseLeave}
                className={cn(
                  "w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center transition-all duration-300 relative group",
                  "bg-[var(--agent-bg)] hover:bg-[var(--agent-hover)] hover:scale-105 hover:shadow-lg cursor-pointer",
                  isSelected && "border-2 border-solid",
                  isUsed && !isSelected && "border-2 border-dashed border-white/40",
                )}
                style={{
                  ...(isSelected && { borderColor: agent.color }),
                }}
              >
                <Icon
                  className="w-4 h-4 md:w-5 md:h-5 transition-colors duration-300"
                  style={{
                    color: isSelected || isUsed ? agent.color : "var(--agent-icon)",
                  }}
                />
                {messageCount > 0 && (
                  <span
                    className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center text-white"
                    style={{ backgroundColor: agent.color }}
                  >
                    {messageCount > 9 ? "9+" : messageCount}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        <div className="flex-1" />

        <div className="w-full h-px bg-[var(--sidebar-border)] mt-2" />

        <button
          onClick={() => router.push("/workspaces")}
          className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-[var(--agent-bg)] hover:bg-[var(--agent-hover)] flex items-center justify-center transition-all cursor-pointer"
          title="Workspaces"
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
