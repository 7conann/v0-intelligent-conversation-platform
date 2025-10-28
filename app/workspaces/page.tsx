"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Star, SettingsIcon, Hash, Plus, Eye, EyeOff, Trash2 } from "lucide-react"
import { useToast } from "@/components/ui/toast"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { EmojiPicker } from "@/components/emoji-picker"
import type { Agent } from "@/types/chat"
import { getAgentPreferences, toggleAgentVisibility } from "@/lib/supabase/agent-preferences"

interface WorkspaceAgent extends Agent {
  is_favorite?: boolean
  is_visible?: boolean
}

const AUTHORIZED_EMAILS = ["kleber.zumiotti@iprocesso.com", "angelomarchi05@gmail.com"]

export default function WorkspacesPage() {
  const router = useRouter()
  const { addToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [agents, setAgents] = useState<WorkspaceAgent[]>([])
  const [selectedAgent, setSelectedAgent] = useState<WorkspaceAgent | null>(null)
  const [showAgentConfig, setShowAgentConfig] = useState(false)
  const [showCreateAgent, setShowCreateAgent] = useState(false)
  const [showManageAgents, setShowManageAgents] = useState(false)
  const [agentVisibility, setAgentVisibility] = useState<Record<string, boolean>>({})
  const [userId, setUserId] = useState<string>("")
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [newAgent, setNewAgent] = useState({
    name: "",
    icon: "",
    color: "#8B5CF6",
    description: "",
    trigger_word: "",
  })

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
          description: "Faça login para acessar workspaces",
          variant: "error",
        })
        router.push("/login")
        return
      }

      const userEmail = session.user.email
      const authorized = AUTHORIZED_EMAILS.includes(userEmail || "")
      setIsAuthorized(authorized)
      setUserId(session.user.id)

      const { data: agentsData, error: agentsError } = await supabase
        .from("agents")
        .select("*")
        .order("created_at", { ascending: true })

      if (agentsError) {
        console.error("Error loading agents:", agentsError)
      } else if (agentsData) {
        setAgents(agentsData as WorkspaceAgent[])
      }

      const preferences = getAgentPreferences(session.user.id)
      setAgentVisibility(preferences)
      console.log("[v0] 👁️ Agent preferences loaded from localStorage:", preferences)

      const { data: favoritesData } = await supabase
        .from("agent_favorites")
        .select("agent_id")
        .eq("user_id", session.user.id)

      if (favoritesData) {
        const favoriteIds = favoritesData.map((f) => f.agent_id)
        setAgents((prev) =>
          prev.map((agent) => ({
            ...agent,
            is_favorite: favoriteIds.includes(agent.id),
          })),
        )
      }

      setLoading(false)
    }

    loadData()
  }, [router, addToast])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showAgentConfig) {
          setShowAgentConfig(false)
          setSelectedAgent(null)
        }
        if (showCreateAgent) {
          setShowCreateAgent(false)
          setNewAgent({
            name: "",
            icon: "",
            color: "#8B5CF6",
            description: "",
            trigger_word: "",
          })
        }
        if (showManageAgents) {
          setShowManageAgents(false)
        }
      }
    }

    window.addEventListener("keydown", handleEscape)
    return () => window.removeEventListener("keydown", handleEscape)
  }, [showAgentConfig, showCreateAgent, showManageAgents])

  const handleToggleFavorite = async (agentId: string) => {
    const supabase = createClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) return

    const agent = agents.find((a) => a.id === agentId)
    if (!agent) return

    if (agent.is_favorite) {
      const { error } = await supabase
        .from("agent_favorites")
        .delete()
        .eq("user_id", session.user.id)
        .eq("agent_id", agentId)

      if (error) {
        addToast({
          title: "Erro",
          description: "Não foi possível remover dos favoritos",
          variant: "error",
        })
        return
      }

      addToast({
        title: "Removido dos favoritos",
        description: `${agent.name} foi removido dos favoritos`,
        variant: "success",
      })
    } else {
      const { error } = await supabase.from("agent_favorites").insert({
        user_id: session.user.id,
        agent_id: agentId,
      })

      if (error) {
        addToast({
          title: "Erro",
          description: "Não foi possível adicionar aos favoritos",
          variant: "error",
        })
        return
      }

      addToast({
        title: "Adicionado aos favoritos",
        description: `${agent.name} foi adicionado aos favoritos`,
        variant: "success",
      })
    }

    setAgents((prev) => prev.map((a) => (a.id === agentId ? { ...a, is_favorite: !a.is_favorite } : a)))
  }

  const handleToggleAgentVisibility = (agentId: string) => {
    const currentVisibility = agentVisibility[agentId] ?? true
    const newVisibility = !currentVisibility

    setAgentVisibility((prev) => ({
      ...prev,
      [agentId]: newVisibility,
    }))

    try {
      toggleAgentVisibility(userId, agentId, newVisibility)
      console.log(`[v0] ✅ Agent ${agentId} visibility saved to localStorage: ${newVisibility}`)

      addToast({
        title: newVisibility ? "Agente ativado" : "Agente desativado",
        description: newVisibility ? "O agente agora aparecerá na sidebar" : "O agente foi ocultado da sidebar",
        variant: "success",
      })
    } catch (error) {
      console.error("[v0] Error saving to localStorage:", error)
      // Revert on error
      setAgentVisibility((prev) => ({
        ...prev,
        [agentId]: currentVisibility,
      }))
      addToast({
        title: "Erro",
        description: "Não foi possível alterar a visibilidade do agente",
        variant: "error",
      })
    }
  }

  const handleSaveAgentConfig = async () => {
    if (!selectedAgent) return

    if (!isAuthorized) {
      addToast({
        title: "Acesso negado",
        description: "Você não tem permissão para editar agentes",
        variant: "error",
      })
      return
    }

    if (!selectedAgent.name || !selectedAgent.icon || !selectedAgent.trigger_word) {
      addToast({
        title: "Campos obrigatórios",
        description: "Preencha nome, ícone e palavra-chave",
        variant: "error",
      })
      return
    }

    console.log("[v0] 💾 Salvando agente:", {
      agentId: selectedAgent.id,
      agentName: selectedAgent.name,
      changes: {
        name: selectedAgent.name,
        icon: selectedAgent.icon,
        color: selectedAgent.color,
        description: selectedAgent.description,
        trigger_word: selectedAgent.trigger_word,
      },
    })

    const supabase = createClient()

    const { data, error, count } = await supabase
      .from("agents")
      .update({
        name: selectedAgent.name,
        icon: selectedAgent.icon,
        color: selectedAgent.color,
        description: selectedAgent.description,
        trigger_word: selectedAgent.trigger_word,
      })
      .eq("id", selectedAgent.id)
      .select()

    console.log("[v0] 📊 Resultado do UPDATE:", {
      error: error,
      data: data,
      count: count,
      rowsAffected: data?.length || 0,
    })

    if (error) {
      console.error("[v0] ❌ Erro ao salvar agente:", error)
      addToast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "error",
      })
      return
    }

    if (!data || data.length === 0) {
      console.error("[v0] ❌ Nenhuma linha foi atualizada. Possível problema de RLS ou ID inválido.")
      addToast({
        title: "Erro ao salvar",
        description: "Nenhuma linha foi atualizada. Verifique as permissões do banco de dados.",
        variant: "error",
      })
      return
    }

    console.log("[v0] ✅ Agente salvo com sucesso no banco de dados")

    addToast({
      title: "Agente atualizado",
      description: `${selectedAgent.name} foi atualizado com sucesso`,
      variant: "success",
    })

    setAgents((prev) => prev.map((a) => (a.id === selectedAgent.id ? selectedAgent : a)))
    setShowAgentConfig(false)
    setSelectedAgent(null)
  }

  const handleCreateAgent = async () => {
    if (!isAuthorized) {
      addToast({
        title: "Acesso negado",
        description: "Você não tem permissão para criar agentes",
        variant: "error",
      })
      return
    }

    if (!newAgent.name || !newAgent.icon || !newAgent.trigger_word) {
      addToast({
        title: "Campos obrigatórios",
        description: "Preencha nome, ícone e palavra-chave",
        variant: "error",
      })
      return
    }

    const supabase = createClient()

    const { data, error } = await supabase
      .from("agents")
      .insert({
        name: newAgent.name,
        icon: newAgent.icon,
        color: newAgent.color,
        description: newAgent.description,
        trigger_word: newAgent.trigger_word,
        is_system: false,
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating agent:", error)
      addToast({
        title: "Erro ao criar agente",
        description: error.message,
        variant: "error",
      })
      return
    }

    addToast({
      title: "Agente criado",
      description: `${newAgent.name} foi criado com sucesso`,
      variant: "success",
    })

    setAgents((prev) => [...prev, data as WorkspaceAgent])
    setShowCreateAgent(false)
    setNewAgent({
      name: "",
      icon: "",
      color: "#8B5CF6",
      description: "",
      trigger_word: "",
    })
  }

  const handleDeleteAgent = async (agentId: string) => {
    if (!isAuthorized) {
      addToast({
        title: "Acesso negado",
        description: "Você não tem permissão para deletar agentes",
        variant: "error",
      })
      return
    }

    const agent = agents.find((a) => a.id === agentId)
    if (!agent) return

    // Check if agent is linked to any custom agents
    const supabase = createClient()
    const { data: linkedCustomAgents } = await supabase
      .from("custom_agents")
      .select("id, name")
      .contains("agent_ids", [agentId])

    if (linkedCustomAgents && linkedCustomAgents.length > 0) {
      const customAgentNames = linkedCustomAgents.map((ca) => ca.name).join(", ")

      if (
        !confirm(
          `Este agente está vinculado aos seguintes agentes customizados: ${customAgentNames}.\n\nAo deletar este agente, os agentes customizados vinculados também serão removidos. Deseja continuar?`,
        )
      ) {
        return
      }

      // Delete linked custom agents
      for (const customAgent of linkedCustomAgents) {
        await supabase.from("custom_agents").delete().eq("id", customAgent.id)
        await supabase.from("agents").delete().eq("id", customAgent.id)
      }
    }

    // Delete the agent
    const { error } = await supabase.from("agents").delete().eq("id", agentId)

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
      description:
        linkedCustomAgents && linkedCustomAgents.length > 0
          ? `${agent.name} e ${linkedCustomAgents.length} agente(s) customizado(s) vinculado(s) foram removidos`
          : `${agent.name} foi removido com sucesso`,
      variant: "success",
    })

    setAgents((prev) => prev.filter((a) => a.id !== agentId))
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--app-bg)]">
        <div className="text-center">
          <div className="mb-4 text-2xl text-foreground">Carregando workspaces...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--app-bg)] text-[var(--text-primary)]">
      {/* Header */}
      <div className="border-b border-[var(--sidebar-border)] bg-[var(--chat-header-bg)] px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push("/chat")}
              className="hover:bg-[var(--agent-bg)]"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-[var(--text-primary)]">Workspaces & Agentes</h1>
              <p className="text-sm text-[var(--text-secondary)]">Configure palavras-chave dos agentes</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={() => setShowManageAgents(true)}
              variant="outline"
              className="border-[var(--sidebar-border)] text-purple-500 hover:text-purple-500 hover:bg-transparent"
            >
              <Eye className="h-4 w-4 mr-2" />
              Gerenciar Agentes
            </Button>
            {isAuthorized && (
              <Button
                onClick={() => setShowCreateAgent(true)}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500"
              >
                <Plus className="h-4 w-4 mr-2" />
                Criar Novo Agente
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-6xl p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.map((agent) => (
            <div
              key={agent.id}
              className="rounded-xl border border-[var(--sidebar-border)] bg-[var(--settings-bg)] p-6 hover:border-purple-500/50 transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-xl text-2xl"
                    style={{ backgroundColor: `${agent.color}20`, border: `2px solid ${agent.color}40` }}
                  >
                    {agent.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-[var(--text-primary)]">{agent.name}</h3>
                    <p className="text-xs text-[var(--text-secondary)]">Agente especializado</p>
                  </div>
                </div>
                <button onClick={() => handleToggleFavorite(agent.id)} className="hover:scale-110 transition-transform">
                  <Star
                    className={`h-5 w-5 ${
                      agent.is_favorite ? "fill-yellow-400 text-yellow-400" : "text-[var(--text-secondary)]"
                    }`}
                  />
                </button>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm">
                  <Hash className="h-4 w-4 text-[var(--text-secondary)]" />
                  <span className="text-[var(--text-secondary)]">
                    Palavra-chave: {agent.trigger_word || "Não configurada"}
                  </span>
                </div>
              </div>

              {isAuthorized && (
                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      setSelectedAgent(agent)
                      setShowAgentConfig(true)
                    }}
                    variant="outline"
                    className="flex-1 border-[var(--sidebar-border)] cursor-pointer text-[var(--text-primary)]"
                  >
                    <SettingsIcon className="h-4 w-4 mr-2" />
                    Configurar
                  </Button>
                  <Button
                    onClick={() => handleDeleteAgent(agent.id)}
                    variant="outline"
                    className="border-red-500/50 text-red-500 hover:bg-red-500/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Manage Agents Visibility Dialog */}
      {showManageAgents && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--settings-bg)] rounded-xl border border-[var(--sidebar-border)] max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-[var(--text-primary)]">Gerenciar Visibilidade dos Agentes</h2>
              <p className="text-sm text-[var(--text-secondary)]">
                Ative ou desative quais agentes aparecem na sua sidebar
              </p>
            </div>

            <div className="space-y-2 mb-6">
              {agents.map((agent) => {
                const isVisible = agentVisibility[agent.id] ?? true
                return (
                  <div
                    key={agent.id}
                    className="flex items-center justify-between p-4 rounded-lg border border-[var(--sidebar-border)] bg-[var(--agent-bg)] hover:border-purple-500/50 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-10 w-10 items-center justify-center rounded-lg text-xl"
                        style={{ backgroundColor: `${agent.color}20`, border: `2px solid ${agent.color}40` }}
                      >
                        {agent.icon}
                      </div>
                      <div>
                        <h3 className="font-medium text-[var(--text-primary)]">{agent.name}</h3>
                        <p className="text-xs text-[var(--text-secondary)]">
                          {agent.trigger_word || "Sem palavra-chave"}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleToggleAgentVisibility(agent.id)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                        isVisible
                          ? "bg-green-500/20 text-green-500 hover:bg-green-500/30"
                          : "bg-gray-500/20 text-gray-500 hover:bg-gray-500/30"
                      }`}
                    >
                      {isVisible ? (
                        <>
                          <Eye className="h-4 w-4" />
                          <span className="text-sm font-medium">Visível</span>
                        </>
                      ) : (
                        <>
                          <EyeOff className="h-4 w-4" />
                          <span className="text-sm font-medium">Oculto</span>
                        </>
                      )}
                    </button>
                  </div>
                )
              })}
            </div>

            
            <div className="flex justify-end">
              <Button
                onClick={() => setShowManageAgents(false)}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500"
              >
                Fechar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Agent Config Modal */}
      {showAgentConfig && selectedAgent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--settings-bg)] rounded-xl border border-[var(--sidebar-border)] max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-3 mb-6">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-xl text-2xl"
                style={{ backgroundColor: `${selectedAgent.color}20`, border: `2px solid ${selectedAgent.color}40` }}
              >
                {selectedAgent.icon}
              </div>
              <div>
                <h2 className="text-xl font-bold text-[var(--text-primary)]">Editar {selectedAgent.name}</h2>
                <p className="text-sm text-[var(--text-secondary)]">Configure todos os dados do agente</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="editAgentName" className="text-[var(--text-primary)]">
                  Nome do Agente *
                </Label>
                <Input
                  id="editAgentName"
                  type="text"
                  value={selectedAgent.name}
                  onChange={(e) => setSelectedAgent({ ...selectedAgent, name: e.target.value })}
                  placeholder="Ex: Vendas"
                  className="bg-[var(--input-bg)] border-[var(--sidebar-border)] text-[var(--text-primary)]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="editAgentIcon" className="text-[var(--text-primary)]">
                  Ícone (Emoji) *
                </Label>
                <EmojiPicker
                  value={selectedAgent.icon}
                  onChange={(emoji) => setSelectedAgent({ ...selectedAgent, icon: emoji })}
                />
                <p className="text-xs text-[var(--text-secondary)]">Use um emoji para representar o agente</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="editAgentColor" className="text-[var(--text-primary)]">
                  Cor
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="editAgentColor"
                    type="color"
                    value={selectedAgent.color}
                    onChange={(e) => setSelectedAgent({ ...selectedAgent, color: e.target.value })}
                    className="w-20 h-10 cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={selectedAgent.color}
                    onChange={(e) => setSelectedAgent({ ...selectedAgent, color: e.target.value })}
                    placeholder="#8B5CF6"
                    className="flex-1 bg-[var(--input-bg)] border-[var(--sidebar-border)] text-[var(--text-primary)]"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="editTriggerWord" className="text-[var(--text-primary)]">
                  Palavra-chave *
                </Label>
                <Input
                  id="editTriggerWord"
                  type="text"
                  value={selectedAgent.trigger_word || ""}
                  onChange={(e) => setSelectedAgent({ ...selectedAgent, trigger_word: e.target.value })}
                  placeholder="#vendas"
                  className="bg-[var(--input-bg)] border-[var(--sidebar-border)] text-[var(--text-primary)]"
                />
                <p className="text-xs text-[var(--text-secondary)]">
                  Palavra-chave que será usada para ativar este agente (ex: #vendas, #suporte)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="editAgentDescription" className="text-[var(--text-primary)]">
                  Descrição
                </Label>
                <Textarea
                  id="editAgentDescription"
                  value={selectedAgent.description || ""}
                  onChange={(e) => setSelectedAgent({ ...selectedAgent, description: e.target.value })}
                  placeholder="Descreva a função do agente..."
                  className="bg-[var(--input-bg)] border-[var(--sidebar-border)] text-[var(--text-primary)] min-h-[100px]"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  onClick={() => {
                    setShowAgentConfig(false)
                    setSelectedAgent(null)
                  }}
                  variant="outline"
                  className="flex-1 text-[var(--text-primary)]"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleSaveAgentConfig}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-[var(--text-primary)]"
                >
                  Salvar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Agent Modal */}
      {showCreateAgent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--settings-bg)] rounded-xl border border-[var(--sidebar-border)] max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-[var(--text-primary)]">Criar Novo Agente</h2>
              <p className="text-sm text-[var(--text-secondary)]">Preencha os dados do novo agente</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="agentName" className="text-[var(--text-primary)]">
                  Nome do Agente *
                </Label>
                <Input
                  id="agentName"
                  type="text"
                  value={newAgent.name}
                  onChange={(e) => setNewAgent({ ...newAgent, name: e.target.value })}
                  placeholder="Ex: Vendas"
                  className="bg-[var(--input-bg)] border-[var(--sidebar-border)] text-[var(--text-primary)]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="agentIcon" className="text-[var(--text-primary)]">
                  Ícone (Emoji) *
                </Label>
                <EmojiPicker value={newAgent.icon} onChange={(emoji) => setNewAgent({ ...newAgent, icon: emoji })} />
                <p className="text-xs text-[var(--text-secondary)]">Use um emoji para representar o agente</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="agentColor" className="text-[var(--text-primary)]">
                  Cor
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="agentColor"
                    type="color"
                    value={newAgent.color}
                    onChange={(e) => setNewAgent({ ...newAgent, color: e.target.value })}
                    className="w-20 h-10 cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={newAgent.color}
                    onChange={(e) => setNewAgent({ ...newAgent, color: e.target.value })}
                    placeholder="#8B5CF6"
                    className="flex-1 bg-[var(--input-bg)] border-[var(--sidebar-border)] text-[var(--text-primary)]"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="agentTrigger" className="text-[var(--text-primary)]">
                  Palavra-chave *
                </Label>
                <Input
                  id="agentTrigger"
                  type="text"
                  value={newAgent.trigger_word}
                  onChange={(e) => setNewAgent({ ...newAgent, trigger_word: e.target.value })}
                  placeholder="Ex: #vendas"
                  className="bg-[var(--input-bg)] border-[var(--sidebar-border)] text-[var(--text-primary)]"
                />
                <p className="text-xs text-[var(--text-secondary)]">Palavra-chave para ativar o agente no chat</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="agentDescription" className="text-[var(--text-primary)]">
                  Descrição
                </Label>
                <Textarea
                  id="agentDescription"
                  value={newAgent.description}
                  onChange={(e) => setNewAgent({ ...newAgent, description: e.target.value })}
                  placeholder="Descreva a função do agente..."
                  className="bg-[var(--input-bg)] border-[var(--sidebar-border)] text-[var(--text-primary)] min-h-[100px]"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  onClick={() => {
                    setShowCreateAgent(false)
                    setNewAgent({
                      name: "",
                      icon: "",
                      color: "#8B5CF6",
                      description: "",
                      trigger_word: "",
                    })
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleCreateAgent}
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
