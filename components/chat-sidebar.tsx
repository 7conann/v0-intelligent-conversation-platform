"use client"

import type { Agent } from "@/types/chat"
import { cn } from "@/lib/utils"
import { BarChart3, User, Code, Palette } from "lucide-react"

interface ChatSidebarProps {
  agents: Agent[]
  selectedAgents: string[]
  usedAgents: string[]
  onToggleAgent: (agentId: string) => void
}

export function ChatSidebar({ agents, selectedAgents, usedAgents, onToggleAgent }: ChatSidebarProps) {
  const getAgentIcon = (index: number) => {
    const icons = [BarChart3, User, Code, Palette, BarChart3, User]
    const Icon = icons[index % icons.length]
    return Icon
  }

  return (
    <div className="bg-gradient-to-b from-gray-900 to-gray-950 border-r border-gray-800 flex flex-col items-center w-40 gap-4 py-6">
      {/* User Profile */}
      <button className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center mb-4">
        <User className="w-6 h-6 text-white" />
      </button>

      <div className="w-full h-px bg-gray-800 mb-2" />

      <div className="grid grid-cols-2 content-start px-3 gap-3">
        {agents.map((agent, index) => {
          const Icon = getAgentIcon(index)
          const isSelected = selectedAgents.includes(agent.id)
          const isUsed = usedAgents.includes(agent.id)

          return (
            <button
              key={agent.id}
              onClick={() => onToggleAgent(agent.id)}
              className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center transition-all relative group",
                "bg-gradient-to-br from-gray-800 to-gray-900 hover:from-gray-700 hover:to-gray-800",
                isSelected && "ring-2 ring-purple-500 ring-offset-2 ring-offset-gray-950",
                isUsed && "ring-2 ring-offset-2 ring-offset-gray-950",
              )}
              style={{
                borderColor: isUsed ? agent.color : "transparent",
                borderWidth: isUsed ? "2px" : "0px",
              }}
              title={agent.name}
            >
              <Icon className="w-5 h-5" style={{ color: isSelected ? agent.color : "#9ca3af" }} />

              {/* Tooltip */}
              <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                {agent.name}
              </div>
            </button>
          )
        })}
      </div>

      <div className="flex-1" />

      <div className="w-full h-px bg-gray-800 mt-2" />

      {/* Settings */}
      <button className="w-12 h-12 rounded-xl bg-gradient-to-br from-gray-800 to-gray-900 hover:from-gray-700 hover:to-gray-800 flex items-center justify-center transition-all">
        <Code className="w-5 h-5 text-gray-400" />
      </button>
    </div>
  )
}
