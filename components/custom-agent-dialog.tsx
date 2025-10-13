"use client"

import { useState } from "react"
import { X, Plus, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { Agent, CustomAgent } from "@/types/chat"
import { cn } from "@/lib/utils"

interface CustomAgentDialogProps {
  isOpen: boolean
  onClose: () => void
  agents: Agent[]
  onCreateCustomAgent: (customAgent: Omit<CustomAgent, "id" | "createdAt">) => void
  editingAgent?: CustomAgent | null
}

const PRESET_COLORS = [
  "#a78bfa",
  "#60a5fa",
  "#34d399",
  "#fbbf24",
  "#f472b6",
  "#fb923c",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
  "#10b981",
]

const PRESET_ICONS = ["🎯", "📊", "👥", "💰", "📱", "🎁", "🚀", "⚡", "🔥", "💡", "🎨", "🔧"]

export function CustomAgentDialog({
  isOpen,
  onClose,
  agents,
  onCreateCustomAgent,
  editingAgent,
}: CustomAgentDialogProps) {
  const [name, setName] = useState(editingAgent?.name || "")
  const [selectedIcon, setSelectedIcon] = useState(editingAgent?.icon || "🎯")
  const [selectedColor, setSelectedColor] = useState(editingAgent?.color || "#a78bfa")
  const [selectedAgents, setSelectedAgents] = useState<string[]>(editingAgent?.composedAgentIds || [])

  if (!isOpen) return null

  const handleSubmit = () => {
    if (!name.trim() || selectedAgents.length === 0) return

    onCreateCustomAgent({
      name: name.trim(),
      icon: selectedIcon,
      color: selectedColor,
      composedAgentIds: selectedAgents,
    })

    // Reset form
    setName("")
    setSelectedIcon("🎯")
    setSelectedColor("#a78bfa")
    setSelectedAgents([])
    onClose()
  }

  const toggleAgent = (agentId: string) => {
    setSelectedAgents((prev) => (prev.includes(agentId) ? prev.filter((id) => id !== agentId) : [...prev, agentId]))
  }

  const systemAgents = agents.filter((a) => !a.isCustom)

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-gray-900 border border-gray-700 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-gray-900 border-b border-gray-700 p-6 z-10">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">
              {editingAgent ? "Editar Agente Customizado" : "Criar Agente Customizado"}
            </h2>
            <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors cursor-pointer">
              <X className="w-6 h-6" />
            </button>
          </div>
          <p className="text-sm text-gray-400 mt-2">
            Combine múltiplos agentes para criar um agente personalizado com capacidades específicas
          </p>
        </div>

        <div className="p-6 space-y-6">
          {/* Name Input */}
          <div>
            <Label htmlFor="agent-name" className="text-white mb-2 block">
              Nome do Agente
            </Label>
            <Input
              id="agent-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Analista Financeiro Completo"
              className="bg-gray-800 border-gray-700 text-white"
            />
          </div>

          {/* Icon Selection */}
          <div>
            <Label className="text-white mb-2 block">Ícone</Label>
            <div className="grid grid-cols-6 gap-2">
              {PRESET_ICONS.map((icon) => (
                <button
                  key={icon}
                  onClick={() => setSelectedIcon(icon)}
                  className={cn(
                    "w-12 h-12 rounded-lg flex items-center justify-center text-2xl transition-all cursor-pointer",
                    selectedIcon === icon ? "bg-purple-600 ring-2 ring-purple-400" : "bg-gray-800 hover:bg-gray-700",
                  )}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          {/* Color Selection */}
          <div>
            <Label className="text-white mb-2 block">Cor</Label>
            <div className="grid grid-cols-5 gap-2">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => setSelectedColor(color)}
                  className={cn(
                    "w-12 h-12 rounded-lg transition-all cursor-pointer",
                    selectedColor === color && "ring-2 ring-white ring-offset-2 ring-offset-gray-900",
                  )}
                  style={{ backgroundColor: color }}
                >
                  {selectedColor === color && <Check className="w-6 h-6 text-white mx-auto" />}
                </button>
              ))}
            </div>
          </div>

          {/* Agent Selection */}
          <div>
            <Label className="text-white mb-2 block">Selecione os Agentes ({selectedAgents.length} selecionados)</Label>
            <div className="grid grid-cols-2 gap-3">
              {systemAgents.map((agent) => (
                <button
                  key={agent.id}
                  onClick={() => toggleAgent(agent.id)}
                  className={cn(
                    "p-4 rounded-lg border-2 transition-all text-left cursor-pointer",
                    selectedAgents.includes(agent.id)
                      ? "border-purple-500 bg-purple-500/10"
                      : "border-gray-700 bg-gray-800 hover:border-gray-600",
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                      style={{ backgroundColor: agent.color }}
                    >
                      {agent.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-white truncate">{agent.name}</div>
                      {selectedAgents.includes(agent.id) && (
                        <div className="text-xs text-purple-400 mt-1">Selecionado</div>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Preview */}
          {name && selectedAgents.length > 0 && (
            <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
              <Label className="text-white mb-3 block">Preview</Label>
              <div className="flex items-center gap-3">
                <div
                  className="w-16 h-16 rounded-xl flex items-center justify-center text-3xl"
                  style={{ backgroundColor: selectedColor }}
                >
                  {selectedIcon}
                </div>
                <div>
                  <div className="font-semibold text-white text-lg">{name}</div>
                  <div className="text-sm text-gray-400">
                    Combina {selectedAgents.length} agente{selectedAgents.length > 1 ? "s" : ""}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-gray-900 border-t border-gray-700 p-6 flex gap-3">
          <Button
            onClick={onClose}
            variant="outline"
            className="flex-1 bg-gray-800 border-gray-700 text-white hover:bg-gray-700 cursor-pointer"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!name.trim() || selectedAgents.length === 0}
            className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4 mr-2" />
            {editingAgent ? "Salvar Alterações" : "Criar Agente"}
          </Button>
        </div>
      </div>
    </div>
  )
}
