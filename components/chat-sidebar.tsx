"use client"

import type React from "react"

import type { Agent, Message } from "@/types/chat"
import { cn } from "@/lib/utils"
import { BarChart3, User, Code, Palette, Settings, Star, Plus, Trash2, ChevronLeft, ChevronRight } from "lucide-react"
import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { useRouter } from "next/navigation"

interface ChatSidebarProps {
  agents: Agent[]
  selectedAgents: string[]
  usedAgents: string[]
  onToggleAgent: (agentId: string) => void
  agentHistories: Record<string, Message[]>
  favoriteAgents: string[]
  onToggleAgentFavorite: (agentId: string) => void
  onCreateCustomAgent: () => void
  onDeleteCustomAgent: (agentId: string) => void
}

export function ChatSidebar({
  agents,
  selectedAgents,
  usedAgents,
  onToggleAgent,
  agentHistories,
  favoriteAgents,
  onToggleAgentFavorite,
  onCreateCustomAgent,
  onDeleteCustomAgent,
}: ChatSidebarProps) {
  const router = useRouter()
  const [userEmail, setUserEmail] = useState("Iprocesso")
  const [hoveredAgent, setHoveredAgent] = useState<string | null>(null)
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null)
  const [deleteConfirmAgent, setDeleteConfirmAgent] = useState<string | null>(null)
  const [isCollapsed, setIsCollapsed] = useState(false)

  useEffect(() => {
    const email = localStorage.getItem("userEmail")
    if (email) {
      setUserEmail(email)
    }

    const savedCollapsed = localStorage.getItem("sidebarCollapsed")
    if (savedCollapsed) {
      setIsCollapsed(savedCollapsed === "true")
    }
  }, [])

  useEffect(() => {
    localStorage.setItem("sidebarCollapsed", String(isCollapsed))
  }, [isCollapsed])

  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>, agentId: string, name: string) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const messageCount = agentHistories[agentId]?.length || 0
    const agent = agents.find((a) => a.id === agentId)
    let tooltipText = messageCount > 0 ? `${name} (${messageCount} mensagens)` : name

    if (agent?.isCustom && agent.composedAgentIds) {
      const composedNames = agent.composedAgentIds
        .map((id) => agents.find((a) => a.id === id)?.name)
        .filter(Boolean)
        .join(", ")
      tooltipText += `\nCombina: ${composedNames}`
    }

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

  const sortedAgents = [...agents].sort((a, b) => {
    const aIsFavorite = favoriteAgents.includes(a.id)
    const bIsFavorite = favoriteAgents.includes(b.id)
    if (aIsFavorite && !bIsFavorite) return -1
    if (!aIsFavorite && bIsFavorite) return 1
    return 0
  })

  return (
    <div
      className={cn(
        "bg-[var(--sidebar-bg)] border-r border-[var(--sidebar-border)] flex flex-col items-center gap-4 py-6 transition-all duration-300 relative",
        isCollapsed ? "w-16" : "w-40",
      )}
    >
      {/* Collapse Toggle Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-6 w-6 h-6 rounded-full bg-[var(--sidebar-bg)] border border-[var(--sidebar-border)] flex items-center justify-center hover:bg-[var(--agent-hover)] transition-all cursor-pointer z-10"
        title={isCollapsed ? "Expandir sidebar" : "Colapsar sidebar"}
      >
        {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>

      <div className="flex flex-col items-center gap-2 mb-2">
        <button className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
          <User className="w-6 h-6 text-white" />
        </button>
        {!isCollapsed && <span className="text-xs text-[var(--text-secondary)] font-medium">{userEmail}</span>}
      </div>

      <div className="w-full h-px bg-[var(--sidebar-border)] mb-2" />

      <div
        className={cn(
          "grid content-start px-3 gap-2 scrollbar-hide overflow-y-auto max-h-[calc(100vh-300px)]",
          isCollapsed ? "grid-cols-1" : "grid-cols-2",
        )}
      >
        {sortedAgents.map((agent, index) => {
          const isSelected = selectedAgents.includes(agent.id)
          const isUsed = usedAgents.includes(agent.id)
          const isFavorite = favoriteAgents.includes(agent.id)
          const messageCount = agentHistories[agent.id]?.length || 0

          return (
            <div key={agent.id} className="relative">
              <button
                onClick={() => onToggleAgent(agent.id)}
                onMouseEnter={(e) => handleMouseEnter(e, agent.id, agent.name)}
                onMouseLeave={handleMouseLeave}
                className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 relative group text-xl",
                  "bg-[#111111] hover:bg-[#2a2a2a] hover:scale-105 hover:shadow-lg cursor-pointer",
                  isSelected && "border-2 border-solid",
                  isUsed && !isSelected && "border-2 border-dashed border-white/40",
                )}
                style={{
                  ...(isSelected && { borderColor: agent.color }),
                  ...(agent.isCustom && { backgroundColor: agent.color + "20" }),
                }}
              >
                {agent.isCustom ? (
                  <span style={{ color: isSelected || isUsed ? agent.color : "var(--agent-icon)" }}>{agent.icon}</span>
                ) : (
                  (() => {
                    const Icon = getAgentIcon(index)
                    return (
                      <Icon
                        className="w-5 h-5 transition-colors duration-300"
                        style={{
                          color: isSelected || isUsed ? agent.color : "var(--agent-icon)",
                        }}
                      />
                    )
                  })()
                )}
                {messageCount > 0 && (
                  <span
                    className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center text-white"
                    style={{ backgroundColor: agent.color }}
                  >
                    {messageCount > 9 ? "9+" : messageCount}
                  </span>
                )}
                {isFavorite && <Star className="w-3 h-3 text-yellow-400 fill-yellow-400 absolute -top-1 -left-1" />}
              </button>
              {!isCollapsed && (
                <div className="absolute -bottom-1 -right-1 flex gap-0.5">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onToggleAgentFavorite(agent.id)
                    }}
                    className="w-4 h-4 rounded-full bg-gray-800 flex items-center justify-center hover:bg-gray-700 transition-colors cursor-pointer"
                    title={isFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                  >
                    <Star className={cn("w-2.5 h-2.5 text-yellow-400", isFavorite && "fill-yellow-400")} />
                  </button>
                  {agent.isCustom && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setDeleteConfirmAgent(agent.id)
                      }}
                      className="w-4 h-4 rounded-full bg-gray-800 flex items-center justify-center hover:bg-red-700 transition-colors cursor-pointer"
                      title="Deletar agente customizado"
                    >
                      <Trash2 className="w-2.5 h-2.5 text-red-400" />
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}

        {/* Add Custom Agent Button */}
        <button
          onClick={onCreateCustomAgent}
          className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600/20 to-blue-600/20 border-2 border-dashed border-purple-500/50 hover:border-purple-500 flex items-center justify-center transition-all hover:scale-105 cursor-pointer"
          title="Criar agente customizado"
        >
          <Plus className="w-5 h-5 text-purple-400" />
        </button>
      </div>

      <div className="flex-1" />

      <div className="w-full h-px bg-[var(--sidebar-border)] mt-2" />

      <button
        onClick={() => router.push("/settings")}
        className="w-12 h-12 rounded-xl bg-[var(--agent-bg)] hover:bg-[var(--agent-hover)] flex items-center justify-center transition-all cursor-pointer"
        title="Configurações"
      >
        <Settings className="w-5 h-5 text-[var(--agent-icon)]" />
      </button>

      {hoveredAgent &&
        coords &&
        createPortal(
          <div
            className="fixed px-3 py-2 bg-[var(--tooltip-bg)] text-[var(--tooltip-text)] text-xs rounded shadow-lg whitespace-pre-line transition-opacity opacity-100 max-w-xs"
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

      {deleteConfirmAgent &&
        createPortal(
          <div
            className="fixed inset-0 bg-black/70 flex items-center justify-center z-[999999]"
            onClick={() => setDeleteConfirmAgent(null)}
          >
            <div
              className="bg-gray-900 border border-gray-700 rounded-xl p-6 max-w-sm mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold text-white mb-2">Confirmar exclusão</h3>
              <p className="text-gray-400 text-sm mb-4">
                Tem certeza que deseja deletar este agente customizado? Esta ação não pode ser desfeita.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setDeleteConfirmAgent(null)}
                  className="flex-1 px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-white transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    onDeleteCustomAgent(deleteConfirmAgent)
                    setDeleteConfirmAgent(null)
                  }}
                  className="flex-1 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white transition-all cursor-pointer"
                >
                  Deletar
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  )
}
