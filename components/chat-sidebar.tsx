"use client"

import type { Agent } from "@/types/chat"
import { cn } from "@/lib/utils"
import { BarChart3, User, Code, Palette, Settings } from "lucide-react"
import { useEffect, useState } from "react"

interface ChatSidebarProps {
  agents: Agent[]
  selectedAgents: string[]
  usedAgents: string[]
  onToggleAgent: (agentId: string) => void
  onOpenSettings: () => void
}

export function ChatSidebar({ agents, selectedAgents, usedAgents, onToggleAgent, onOpenSettings }: ChatSidebarProps) {
  const [userEmail, setUserEmail] = useState("Iprocesso")

  useEffect(() => {
    const email = localStorage.getItem("userEmail")
    if (email) {
      setUserEmail(email)
    }
  }, [])

  const getAgentIcon = (index: number) => {
    const icons = [BarChart3, User, Code, Palette, BarChart3, User]
    const Icon = icons[index % icons.length]
    return Icon
  }

  return (
    <div className="bg-[var(--sidebar-bg)] border-r border-[var(--sidebar-border)] flex flex-col items-center w-40 gap-4 py-6 relative overflow-visible">
      <div className="flex flex-col items-center gap-2 mb-2">
        <button className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center cursor-pointer">
          <User className="w-6 h-6 text-white" />
        </button>
        <span className="text-xs text-[var(--text-secondary)] font-medium">{userEmail}</span>
      </div>

      <div className="w-full h-px bg-[var(--sidebar-border)] mb-2" />

      <div className="w-full flex-1 overflow-y-auto overflow-x-visible scrollbar-hide px-3">
        <div className="grid grid-cols-2 content-start gap-2 py-0 px-2.5">
          {agents.map((agent, index) => {
            const Icon = getAgentIcon(index)
            const isSelected = selectedAgents.includes(agent.id)
            const isUsed = usedAgents.includes(agent.id)
            const isLeftColumn = index % 2 === 0

            return (
              <button
                key={agent.id}
                onClick={() => onToggleAgent(agent.id)}
                className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 relative group flex-row",
                  "bg-[#111111] hover:bg-[#2a2a2a] hover:scale-105 hover:shadow-lg cursor-pointer",
                  isUsed && "border-2",
                  isSelected && "ring-2 ring-offset-2 ring-offset-[var(--sidebar-bg)]",
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

                <div
                  className={cn(
                    "absolute px-3 py-1.5 bg-[var(--tooltip-bg)] text-[var(--tooltip-text)] text-xs rounded-lg",
                    "opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none",
                    "z-[99999] shadow-xl border border-[var(--sidebar-border)]",
                    "top-1/2 -translate-y-1/2",
                    isLeftColumn ? "right-full mr-3" : "left-full ml-3",
                  )}
                >
                  {agent.name}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      <div className="w-full h-px bg-[var(--sidebar-border)] mt-2" />

      <button
        onClick={onOpenSettings}
        className="w-12 h-12 rounded-xl bg-[var(--agent-bg)] hover:bg-[var(--agent-hover)] flex items-center justify-center transition-all cursor-pointer"
      >
        <Settings className="w-5 h-5 text-[var(--agent-icon)]" />
      </button>
    </div>
  )
}
