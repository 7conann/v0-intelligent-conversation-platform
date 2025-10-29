"use client"

import { X } from "lucide-react"
import type { Agent } from "@/types/chat"
import { cn } from "@/lib/utils"

interface AgentTagInputProps {
  selectedAgents: Agent[]
  onRemoveAgent: (agentId: string) => void
  className?: string
}

export function AgentTagInput({ selectedAgents, onRemoveAgent, className }: AgentTagInputProps) {
  if (selectedAgents.length === 0) return null

  return (
    <div className={cn("flex flex-wrap gap-2 mb-2", className)}>
      {selectedAgents.map((agent) => (
        <div
          key={agent.id}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all hover:scale-105"
          style={{
            backgroundColor: `${agent.color}15`,
            borderColor: `${agent.color}60`,
            borderWidth: "1.5px",
            borderStyle: "solid",
            color: agent.color,
          }}
        >
          <span className="text-base">{agent.icon}</span>
          <span className="text-xs font-semibold">{agent.trigger_word}</span>
          <button
            onClick={() => onRemoveAgent(agent.id)}
            className="ml-1 hover:bg-black/20 rounded-full p-0.5 transition-colors"
            title={`Remover ${agent.name}`}
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}
    </div>
  )
}
