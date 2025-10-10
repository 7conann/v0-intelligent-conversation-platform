"use client"

import type { Agent } from "@/types/chat"
import { cn } from "@/lib/utils"
import { BarChart3, User, Code, Palette, Settings } from "lucide-react"
import { useEffect, useState, useRef } from "react"
import { createPortal } from "react-dom"
import { useRouter } from "next/navigation"

interface ChatSidebarProps {
  agents: Agent[]
  selectedAgents: string[]
  usedAgents: string[]
  onToggleAgent: (agentId: string) => void
}

export function ChatSidebar({ agents, selectedAgents, usedAgents, onToggleAgent }: ChatSidebarProps) {
  const router = useRouter()
  const [userEmail, setUserEmail] = useState("Iprocesso")

  // Tooltip states
  const [hoveredAgent, setHoveredAgent] = useState<string | null>(null)
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null)

  useEffect(() => {
    const email = localStorage.getItem("userEmail")
    if (email) {
      setUserEmail(email)
    }
  }, [])

  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>, name: string) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setHoveredAgent(name)
    setCoords({
      top: rect.top + rect.height / 2,
      left: rect.right + 8, // aparece à direita
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
    <div className="bg-[var(--sidebar-bg)] border-r border-[var(--sidebar-border)] flex flex-col items-center w-40 gap-4 py-6">
      <div className="flex flex-col items-center gap-2 mb-2">
        <button className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
          <User className="w-6 h-6 text-white" />
        </button>
        <span className="text-xs text-[var(--text-secondary)] font-medium">{userEmail}</span>
      </div>

      <div className="w-full h-px bg-[var(--sidebar-border)] mb-2" />

      <div className="grid grid-cols-2 content-start px-3 gap-2">
        {agents.map((agent, index) => {
          const Icon = getAgentIcon(index)
          const isSelected = selectedAgents.includes(agent.id)
          const isUsed = usedAgents.includes(agent.id)

          return (
            <button
              key={agent.id}
              onClick={() => onToggleAgent(agent.id)}
              onMouseEnter={(e) => handleMouseEnter(e, agent.name)}
              onMouseLeave={handleMouseLeave}
              className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 relative group",
                "bg-[#111111] hover:bg-[#2a2a2a] hover:scale-105 hover:shadow-lg cursor-pointer",
                isUsed && "border-2",
                isSelected && "ring-2 ring-offset-2 ring-offset-[var(--sidebar-bg)]"
              )}
              style={{
                borderColor: isUsed ? agent.color : "transparent",
                borderStyle: "solid",
                borderWidth: isUsed ? "2px" : "0px",
                ...(isSelected && { borderColor: agent.color, borderWidth: "2px" }),
              }}
            >
              <Icon
                className="w-5 h-5 transition-colors duration-300"
                style={{
                  color: isSelected || isUsed ? agent.color : "var(--agent-icon)",
                }}
              />
            </button>
          )
        })}
      </div>

      <div className="flex-1" />

      <div className="w-full h-px bg-[var(--sidebar-border)] mt-2" />

      <button
        onClick={() => router.push("/settings")}
        className="w-12 h-12 rounded-xl bg-[var(--agent-bg)] hover:bg-[var(--agent-hover)] flex items-center justify-center transition-all cursor-pointer"
      >
        <Settings className="w-5 h-5 text-[var(--agent-icon)]" />
      </button>

      {/* Tooltip via Portal (sobrepõe tudo) */}
      {hoveredAgent && coords &&
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
          document.getElementById("tooltip-root")!
          
        )}
    </div>
  )
}
