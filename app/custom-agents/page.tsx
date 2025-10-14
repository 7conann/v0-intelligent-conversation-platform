"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Plus, Trash2, Users } from "lucide-react"
import { useToast } from "@/components/ui/toast"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { Agent } from "@/types/chat"

interface CustomAgent {
  id: string
  name: string
  icon: string
  user_id: string
  agent_ids: string[]
  created_at: string
  trigger_word: string
}

export default function CustomAgentsPage() {
  const router = useRouter()
  const { addToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [customAgents, setCustomAgents] = useState<CustomAgent[]>([])
  const [availableAgents, setAvailableAgents] = useState<Agent[]>([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newAgentName, setNewAgentName] = useState("")
  const [newAgentIcon, setNewAgentIcon] = useState("👔")
  const [newAgentTriggerWord, setNewAgentTriggerWord] = useState("")
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>([])

  useEffect(() => {
    const loadData = async () => {
      const supabase = createClient()

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession()

      if (sessionError || !session) {
        addToast({
          title: "Não autenticado",
          description: "Faça login para acessar agentes customizados",
          variant: "error",
        })
        router.push("/login")
        return
      }

      // Load available agents
      const { data: agentsData, error: agentsError } = await supabase.from("agents").select("*").order("name")

      if (agentsData) {
        setAvailableAgents(agentsData as Agent[])
      }

      // Load custom agents
      const { data: customAgentsData, error: customError } = await supabase
        .from("custom_agents")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false })

      if (customAgentsData) {
        setCustomAgents(customAgentsData as CustomAgent[])
      }

      setLoading(false)
    }

    loadData()
  }, [router, addToast])

  const handleCreateCustomAgent = async () => {
    if (!newAgentName.trim()) {
      addToast({
        title: "Nome obrigatório",
        description: "Digite um nome para o agente customizado",
        variant: "error",
      })
      return
    }

    if (!newAgentTriggerWord.trim()) {
      addToast({
        title: "Palavra-chave obrigatória",
        description: "Digite uma palavra-chave para ativar o agente (ex: #vendas)",
        variant: "error",
      })
      return
    }

    if (selectedAgentIds.length === 0) {
      addToast({
        title: "Selecione agentes",
        description: "Selecione pelo menos um agente para compor o agente customizado",
        variant: "error",
      })
      return
    }

    const supabase = createClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) return

    const { data, error } = await supabase
      .from("custom_agents")
      .insert({
        name: newAgentName,
        icon: newAgentIcon,
        trigger_word: newAgentTriggerWord,
        user_id: session.user.id,
        agent_ids: selectedAgentIds,
      })
      .select()
      .single()

    if (error) {
      addToast({
        title: "Erro ao criar",
        description: error.message,
        variant: "error",
      })
      return
    }

    addToast({
      title: "Agente criado",
      description: `${newAgentName} foi criado com sucesso`,
      variant: "success",
    })

    setCustomAgents((prev) => [data as CustomAgent, ...prev])
    setShowCreateModal(false)
    setNewAgentName("")
    setNewAgentIcon("👔")
    setNewAgentTriggerWord("")
    setSelectedAgentIds([])
  }

  const handleDeleteCustomAgent = async (id: string) => {
    const supabase = createClient()

    const { error } = await supabase.from("custom_agents").delete().eq("id", id)

    if (error) {
      addToast({
        title: "Erro ao deletar",
        description: error.message,
        variant: "error",
      })
      return
    }

    addToast({
      title: "Agente deletado",
      description: "Agente customizado foi removido",
      variant: "success",
    })

    setCustomAgents((prev) => prev.filter((a) => a.id !== id))
  }

  const toggleAgentSelection = (agentId: string) => {
    setSelectedAgentIds((prev) => (prev.includes(agentId) ? prev.filter((id) => id !== agentId) : [...prev, agentId]))
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--app-bg)]">
        <div className="text-center">
          <div className="mb-4 text-2xl text-foreground">Carregando agentes customizados...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--app-bg)] text-foreground">
      {/* Header */}
      <div className="border-b border-[var(--sidebar-border)] bg-[var(--chat-header-bg)] px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push("/profile")}
              className="hover:bg-[var(--agent-bg)]"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Agentes Customizados</h1>
              <p className="text-sm text-muted-foreground">Crie composições de agentes especializados</p>
            </div>
          </div>
          <Button
            onClick={() => setShowCreateModal(true)}
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500"
          >
            <Plus className="h-4 w-4 mr-2" />
            Criar Agente
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-6xl p-6">
        {customAgents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-purple-600/20 to-blue-600/20 border border-purple-500/30 mb-6">
              <Users className="h-10 w-10 text-purple-400" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Nenhum agente customizado</h2>
            <p className="text-muted-foreground mb-6 text-center max-w-md">
              Crie composições de agentes para ter um "diretor" que combina múltiplos especialistas
            </p>
            <Button
              onClick={() => setShowCreateModal(true)}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500"
            >
              <Plus className="h-4 w-4 mr-2" />
              Criar Primeiro Agente
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {customAgents.map((customAgent) => {
              const composedAgents = availableAgents.filter((a) => customAgent.agent_ids.includes(a.id))

              return (
                <div
                  key={customAgent.id}
                  className="rounded-xl border border-[var(--sidebar-border)] bg-[var(--settings-bg)] p-6 hover:border-purple-500/50 transition-all"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl text-2xl bg-gradient-to-br from-purple-600/20 to-blue-600/20 border border-purple-500/30">
                        {customAgent.icon}
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">{customAgent.name}</h3>
                        <p className="text-xs text-muted-foreground">{composedAgents.length} agentes</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteCustomAgent(customAgent.id)}
                      className="hover:scale-110 transition-transform text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Agentes compostos:</p>
                    <div className="flex flex-wrap gap-2">
                      {composedAgents.map((agent) => (
                        <div
                          key={agent.id}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs"
                          style={{ backgroundColor: `${agent.color}20`, border: `1px solid ${agent.color}40` }}
                        >
                          <span>{agent.icon}</span>
                          <span style={{ color: agent.color }}>{agent.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--settings-bg)] rounded-xl border border-[var(--sidebar-border)] max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6">Criar Agente Customizado</h2>

            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="agentName">Nome do Agente</Label>
                <Input
                  id="agentName"
                  value={newAgentName}
                  onChange={(e) => setNewAgentName(e.target.value)}
                  placeholder="Ex: Diretor Executivo, Consultor Estratégico..."
                  className="bg-[var(--input-bg)] border-[var(--sidebar-border)]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="agentIcon">Ícone (Emoji)</Label>
                <Input
                  id="agentIcon"
                  value={newAgentIcon}
                  onChange={(e) => setNewAgentIcon(e.target.value)}
                  placeholder="👔"
                  className="bg-[var(--input-bg)] border-[var(--sidebar-border)]"
                  maxLength={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="triggerWord">Palavra-chave</Label>
                <Input
                  id="triggerWord"
                  value={newAgentTriggerWord}
                  onChange={(e) => setNewAgentTriggerWord(e.target.value)}
                  placeholder="Ex: #vendas, #suporte, #estrategia..."
                  className="bg-[var(--input-bg)] border-[var(--sidebar-border)]"
                />
                <p className="text-xs text-muted-foreground">
                  Esta palavra-chave será adicionada automaticamente ao selecionar o agente no chat
                </p>
              </div>

              <div className="space-y-2">
                <Label>Selecione os Agentes (mínimo 1)</Label>
                <div className="grid grid-cols-2 gap-3">
                  {availableAgents.map((agent) => (
                    <button
                      key={agent.id}
                      onClick={() => toggleAgentSelection(agent.id)}
                      className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                        selectedAgentIds.includes(agent.id)
                          ? "border-purple-500 bg-purple-600/20"
                          : "border-[var(--sidebar-border)] hover:border-purple-500/50"
                      }`}
                    >
                      <div
                        className="flex h-10 w-10 items-center justify-center rounded-lg text-xl"
                        style={{ backgroundColor: `${agent.color}20`, border: `2px solid ${agent.color}40` }}
                      >
                        {agent.icon}
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-sm">{agent.name}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  onClick={() => {
                    setShowCreateModal(false)
                    setNewAgentName("")
                    setNewAgentIcon("👔")
                    setNewAgentTriggerWord("")
                    setSelectedAgentIds([])
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleCreateCustomAgent}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500"
                >
                  Criar Agente
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
