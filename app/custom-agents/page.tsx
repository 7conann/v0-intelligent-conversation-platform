"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Plus, Trash2, Users, Pencil } from "lucide-react"
import { useToast } from "@/components/ui/toast"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { EmojiPicker } from "@/components/emoji-picker"
import type { Agent } from "@/types/database"

const AUTHORIZED_EMAILS = ["kleber.zumiotti@iprocesso.com", "angelomarchi05@gmail.com"]

export default function CustomAgentsPage() {
  const router = useRouter()
  const { addToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [customAgents, setCustomAgents] = useState<any[]>([])
  const [availableAgents, setAvailableAgents] = useState<Agent[]>([])
  const [groups, setGroups] = useState<any[]>([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingAgent, setEditingAgent] = useState<any | null>(null)
  const [newAgentName, setNewAgentName] = useState("")
  const [newAgentDescription, setNewAgentDescription] = useState("")
  const [newAgentIcon, setNewAgentIcon] = useState("👔")
  const [newAgentColor, setNewAgentColor] = useState("#8b5cf6")
  const [newAgentTriggerWord, setNewAgentTriggerWord] = useState("")
  const [newAgentGroupName, setNewAgentGroupName] = useState("")
  const [newAgentGroupId, setNewAgentGroupId] = useState<string | null>(null)
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>([])
  const [workspaceId, setWorkspaceId] = useState<string | null>(null)

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

      const userEmail = session.user.email
      const authorized = userEmail ? AUTHORIZED_EMAILS.includes(userEmail) : false
      setIsAuthorized(authorized)

      if (!authorized) {
        addToast({
          title: "Acesso negado",
          description: "Você não tem permissão para acessar esta página",
          variant: "error",
        })
        router.push("/chat")
        return
      }

      const { data: workspaces } = await supabase.from("workspaces").select("*").eq("user_id", session.user.id).limit(1)

      let workspace = workspaces?.[0]

      if (!workspace) {
        const { data: newWorkspace } = await supabase
          .from("workspaces")
          .insert({
            user_id: session.user.id,
            name: "Workspace Padrão",
          })
          .select()
          .single()

        workspace = newWorkspace
      }

      if (workspace) {
        setWorkspaceId(workspace.id)
      }

      const { data: groupsData } = await supabase.from("groups").select("*").order("display_order")
      if (groupsData) {
        setGroups(groupsData)
      }

      const { data: agentsData } = await supabase.from("agents").select("*").order("order")

      if (agentsData) {
        setAvailableAgents(agentsData as Agent[])
      }

      const { data: customAgentsData } = workspace
        ? await supabase
            .from("custom_agents")
            .select("*, group:groups(id, name, icon, display_order)")
            .eq("workspace_id", workspace.id)
            .order("created_at", { ascending: false })
        : { data: null }

      if (customAgentsData) {
        setCustomAgents(customAgentsData as any[])
      }

      setLoading(false)
    }

    loadData()
  }, [router, addToast])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showCreateModal) {
          setShowCreateModal(false)
          setNewAgentName("")
          setNewAgentDescription("")
          setNewAgentIcon("👔")
          setNewAgentColor("#8b5cf6")
          setNewAgentTriggerWord("")
          setNewAgentGroupName("")
          setNewAgentGroupId(null)
          setSelectedAgentIds([])
        }
        if (showEditModal) {
          setShowEditModal(false)
          setEditingAgent(null)
          setNewAgentName("")
          setNewAgentDescription("")
          setNewAgentIcon("👔")
          setNewAgentColor("#8b5cf6")
          setNewAgentTriggerWord("")
          setNewAgentGroupName("")
          setNewAgentGroupId(null)
          setSelectedAgentIds([])
        }
      }
    }

    window.addEventListener("keydown", handleEscape)
    return () => window.removeEventListener("keydown", handleEscape)
  }, [showCreateModal, showEditModal])

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

    if (!workspaceId) {
      addToast({
        title: "Erro",
        description: "Workspace não encontrado. Tente recarregar a página.",
        variant: "error",
      })
      return
    }

    const supabase = createClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) return

    const agentId = crypto.randomUUID()

    const { error: agentsError } = await supabase.from("agents").insert({
      id: agentId,
      name: newAgentName,
      description: newAgentDescription,
      trigger_word: newAgentTriggerWord,
      is_system: false,
      order: 100, // High order number so custom agents appear after default ones
      color: newAgentColor,
      icon: newAgentIcon,
    })

    if (agentsError) {
      console.error("[v0] Error creating agent in agents table:", agentsError)
      addToast({
        title: "Erro ao criar",
        description: agentsError.message,
        variant: "error",
      })
      return
    }

    const { data, error } = await supabase
      .from("custom_agents")
      .insert({
        id: agentId, // Use the same ID
        name: newAgentName,
        description: newAgentDescription,
        icon: newAgentIcon,
        color: newAgentColor,
        trigger_word: newAgentTriggerWord,
        group_id: newAgentGroupId || null,
        user_id: session.user.id,
        workspace_id: workspaceId,
        agent_ids: selectedAgentIds,
      })
      .select("*, group:groups(id, name, icon, display_order)")
      .single()

    if (error) {
      console.error("[v0] Error creating custom agent:", error)
      await supabase.from("agents").delete().eq("id", agentId)
      addToast({
        title: "Erro ao criar",
        description: error.message,
        variant: "error",
      })
      return
    }

    addToast({
      title: "Agente criado",
      description: `${newAgentName} foi criado com sucesso e está visível para todos os usuários`,
      variant: "success",
    })

    setCustomAgents((prev) => [data as any, ...prev])
    setShowCreateModal(false)
    setNewAgentName("")
    setNewAgentDescription("")
    setNewAgentIcon("👔")
    setNewAgentColor("#8b5cf6")
    setNewAgentTriggerWord("")
    setNewAgentGroupName("")
    setNewAgentGroupId(null)
    setSelectedAgentIds([])
  }

  const handleEditCustomAgent = (agent: any) => {
    setEditingAgent(agent)
    setNewAgentName(agent.name)
    setNewAgentDescription(agent.description || "")
    setNewAgentIcon(agent.icon)
    setNewAgentColor(agent.color)
    setNewAgentTriggerWord(agent.trigger_word)
    setNewAgentGroupId(agent.group_id || null)
    setNewAgentGroupName(agent.group?.name || "")
    setSelectedAgentIds(agent.agent_ids || [])
    setShowEditModal(true)
  }

  const handleUpdateCustomAgent = async () => {
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

    if (!editingAgent) return

    const supabase = createClient()

    const { error: agentsError } = await supabase
      .from("agents")
      .update({
        name: newAgentName,
        description: newAgentDescription,
        trigger_word: newAgentTriggerWord,
        color: newAgentColor,
        icon: newAgentIcon,
      })
      .eq("id", editingAgent.id)

    if (agentsError) {
      console.error("[v0] Error updating agent in agents table:", agentsError)
      addToast({
        title: "Erro ao atualizar agente normal",
        description: agentsError.message,
        variant: "error",
      })
      return
    }

    const { data, error } = await supabase
      .from("custom_agents")
      .update({
        name: newAgentName,
        description: newAgentDescription,
        icon: newAgentIcon,
        color: newAgentColor,
        trigger_word: newAgentTriggerWord,
        group_id: newAgentGroupId || null,
        agent_ids: selectedAgentIds,
        updated_at: new Date().toISOString(),
      })
      .eq("id", editingAgent.id)
      .select("*, group:groups(id, name, icon, display_order)")
      .single()

    if (error) {
      console.error("[v0] Error updating custom agent:", error)
      addToast({
        title: "Erro ao atualizar",
        description: error.message,
        variant: "error",
      })
      return
    }

    addToast({
      title: "Agente atualizado",
      description: `${newAgentName} foi atualizado com sucesso em ambas as tabelas`,
      variant: "success",
    })

    setCustomAgents((prev) => prev.map((a) => (a.id === editingAgent.id ? (data as any) : a)))
    setShowEditModal(false)
    setEditingAgent(null)
    setNewAgentName("")
    setNewAgentDescription("")
    setNewAgentIcon("👔")
    setNewAgentColor("#8b5cf6")
    setNewAgentTriggerWord("")
    setNewAgentGroupName("")
    setNewAgentGroupId(null)
    setSelectedAgentIds([])
  }

  const handleDeleteCustomAgent = async (id: string) => {
    const supabase = createClient()

    const { error: agentsError } = await supabase.from("agents").delete().eq("id", id)

    if (agentsError) {
      console.error("[v0] Error deleting from agents table:", agentsError)
    }

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
      description: "Agente customizado foi removido para todos os usuários",
      variant: "success",
    })

    setCustomAgents((prev) => prev.filter((a) => a.id !== id))
  }

  const toggleAgentSelection = (agentId: string) => {
    setSelectedAgentIds((prev) => {
      if (prev.includes(agentId)) {
        return prev.filter((id) => id !== agentId)
      } else {
        return [...prev, agentId]
      }
    })
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

  if (!isAuthorized) {
    return null
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
              <h1 className="text-2xl  text-[var(--settings-text)] font-bold">Agentes Customizados</h1>
              <p className="text-sm text-muted-foreground">Crie agentes especializados para seu workspace</p>
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
            <h2 className="text-2xl font-bold mb-2 text-[var(--settings-text)]">Nenhum agente customizado</h2>
            <p className="text-muted-foreground mb-6 text-center max-w-md">
              Crie agentes especializados para seu workspace
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
            {customAgents.map((customAgent) => (
              <div
                key={customAgent.id}
                className="rounded-xl border border-[var(--sidebar-border)] bg-[var(--settings-bg)] p-6 hover:border-purple-500/50 transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-12 w-12 items-center justify-center rounded-xl text-2xl border"
                      style={{
                        backgroundColor: `${customAgent.color}20`,
                        borderColor: `${customAgent.color}40`,
                      }}
                    >
                      {customAgent.icon}
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{customAgent.name}</h3>
                      <p className="text-xs text-muted-foreground">{customAgent.trigger_word}</p>
                      {customAgent.group && (
                        <p className="text-xs text-purple-400 mt-1">
                          {customAgent.group.icon} {customAgent.group.name}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditCustomAgent(customAgent)}
                      className="hover:scale-110 transition-transform text-purple-400 hover:text-purple-300"
                    >
                      <Pencil className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDeleteCustomAgent(customAgent.id)}
                      className="hover:scale-110 transition-transform text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                {customAgent.description && (
                  <p className="text-sm text-muted-foreground mb-3">{customAgent.description}</p>
                )}

                {customAgent.agent_ids && customAgent.agent_ids.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-[var(--sidebar-border)]">
                    <p className="text-xs text-muted-foreground mb-2">Agentes vinculados:</p>
                    <div className="flex flex-wrap gap-1">
                      {customAgent.agent_ids.map((agentId: string) => {
                        const agent = availableAgents.find((a) => a.id === agentId)
                        return agent ? (
                          <span
                            key={agentId}
                            className="text-xs px-2 py-1 rounded-md bg-[var(--agent-bg)] border border-[var(--sidebar-border)]"
                          >
                            {agent.name}
                          </span>
                        ) : null
                      })}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--settings-bg)] rounded-xl border border-[var(--sidebar-border)] max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6 text-[var(--text-primary)]">Criar Agente Customizado</h2>

            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="agentName" className="text-[var(--text-primary)]">
                  Nome do Agente *
                </Label>
                <Input
                  id="agentName"
                  value={newAgentName}
                  onChange={(e) => setNewAgentName(e.target.value)}
                  placeholder="Ex: Diretor Executivo, Consultor Estratégico..."
                  className="bg-[var(--input-bg)] border-[var(--sidebar-border)] text-[var(--text-primary)]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="agentDescription" className="text-[var(--text-primary)]">
                  Descrição (opcional)
                </Label>
                <Input
                  id="agentDescription"
                  value={newAgentDescription}
                  onChange={(e) => setNewAgentDescription(e.target.value)}
                  placeholder="Descreva o propósito deste agente..."
                  className="bg-[var(--input-bg)] border-[var(--sidebar-border)] text-[var(--text-primary)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="agentIcon" className="text-[var(--text-primary)]">
                    Ícone (Emoji) *
                  </Label>
                  <EmojiPicker value={newAgentIcon} onChange={setNewAgentIcon} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="agentColor" className="text-[var(--text-primary)]">
                    Cor
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="agentColor"
                      type="color"
                      value={newAgentColor}
                      onChange={(e) => setNewAgentColor(e.target.value)}
                      className="h-10 w-20 cursor-pointer"
                    />
                    <Input
                      value={newAgentColor}
                      onChange={(e) => setNewAgentColor(e.target.value)}
                      placeholder="#8b5cf6"
                      className="flex-1 bg-[var(--input-bg)] border-[var(--sidebar-border)] text-[var(--text-primary)]"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="triggerWord" className="text-[var(--text-primary)]">
                  Palavra-chave *
                </Label>
                <Input
                  id="triggerWord"
                  value={newAgentTriggerWord}
                  onChange={(e) => setNewAgentTriggerWord(e.target.value)}
                  placeholder="Ex: #vendas, #suporte, #estrategia..."
                  className="bg-[var(--input-bg)] border-[var(--sidebar-border)] text-[var(--text-primary)]"
                />
                <p className="text-xs text-[var(--text-secondary)]">
                  Esta palavra-chave será adicionada automaticamente ao selecionar o agente no chat
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="groupName" className="text-[var(--text-primary)]">
                  Grupo
                </Label>
                <select
                  id="groupName"
                  value={newAgentGroupId || ""}
                  onChange={(e) => {
                    setNewAgentGroupId(e.target.value || null)
                    const selectedGroup = groups.find((g) => g.id === e.target.value)
                    setNewAgentGroupName(selectedGroup?.name || "")
                  }}
                  className="w-full h-10 px-3 rounded-md bg-[var(--input-bg)] border border-[var(--sidebar-border)] text-[var(--text-primary)]"
                >
                  <option value="">Selecione um grupo (opcional)</option>
                  {groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.icon} {group.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-[var(--text-secondary)]">Escolha o grupo ao qual este agente pertence</p>
              </div>

              <div className="space-y-2">
                <Label className="text-[var(--text-primary)]">Vincular Agentes (opcional)</Label>
                <p className="text-xs text-[var(--text-secondary)] mb-3">
                  Selecione os agentes que deseja vincular a este agente customizado
                </p>
                <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto p-2 border border-[var(--sidebar-border)] rounded-lg bg-[var(--input-bg)]">
                  {availableAgents.map((agent) => (
                    <label
                      key={agent.id}
                      className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all ${
                        selectedAgentIds.includes(agent.id)
                          ? "bg-purple-500/20 border border-purple-500/50"
                          : "bg-[var(--agent-bg)] border border-[var(--sidebar-border)] hover:border-purple-500/30"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedAgentIds.includes(agent.id)}
                        onChange={() => toggleAgentSelection(agent.id)}
                        className="rounded border-[var(--sidebar-border)]"
                      />
                      <span className="text-sm text-[var(--text-primary)]">{agent.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  onClick={() => {
                    setShowCreateModal(false)
                    setNewAgentName("")
                    setNewAgentDescription("")
                    setNewAgentIcon("👔")
                    setNewAgentColor("#8b5cf6")
                    setNewAgentTriggerWord("")
                    setNewAgentGroupName("")
                    setNewAgentGroupId(null)
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

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--settings-bg)] rounded-xl border border-[var(--sidebar-border)] max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6 text-[var(--text-primary)]">Editar {editingAgent?.name}</h2>
            <p className="text-sm text-muted-foreground mb-6">Configure todos os dados do agente</p>

            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="editAgentName" className="text-[var(--text-primary)]">
                  Nome do Agente *
                </Label>
                <Input
                  id="editAgentName"
                  value={newAgentName}
                  onChange={(e) => setNewAgentName(e.target.value)}
                  placeholder="Ex: Diretor Executivo, Consultor Estratégico..."
                  className="bg-[var(--input-bg)] border-[var(--sidebar-border)] text-[var(--text-primary)]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="editAgentDescription" className="text-[var(--text-primary)]">
                  Descrição
                </Label>
                <Input
                  id="editAgentDescription"
                  value={newAgentDescription}
                  onChange={(e) => setNewAgentDescription(e.target.value)}
                  placeholder="Descreva o propósito deste agente..."
                  className="bg-[var(--input-bg)] border-[var(--sidebar-border)] text-[var(--text-primary)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="editAgentIcon" className="text-[var(--text-primary)]">
                    Ícone (Emoji) *
                  </Label>
                  <EmojiPicker value={newAgentIcon} onChange={setNewAgentIcon} />
                  <p className="text-xs text-muted-foreground">Use um emoji para representar o agente</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="editAgentColor" className="text-[var(--text-primary)]">
                    Cor
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="editAgentColor"
                      type="color"
                      value={newAgentColor}
                      onChange={(e) => setNewAgentColor(e.target.value)}
                      className="h-10 w-20 cursor-pointer"
                    />
                    <Input
                      value={newAgentColor}
                      onChange={(e) => setNewAgentColor(e.target.value)}
                      placeholder="#8b5cf6"
                      className="flex-1 bg-[var(--input-bg)] border-[var(--sidebar-border)] text-[var(--text-primary)]"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="editTriggerWord" className="text-[var(--text-primary)]">
                  Palavra-chave *
                </Label>
                <Input
                  id="editTriggerWord"
                  value={newAgentTriggerWord}
                  onChange={(e) => setNewAgentTriggerWord(e.target.value)}
                  placeholder="Ex: #vendas, #suporte, #estrategia..."
                  className="bg-[var(--input-bg)] border-[var(--sidebar-border)] text-[var(--text-primary)]"
                />
                <p className="text-xs text-[var(--text-secondary)]">
                  Palavra-chave que será usada para ativar este agente (ex: #vendas, #suporte)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="editGroupName" className="text-[var(--text-primary)]">
                  Grupo
                </Label>
                <select
                  id="editGroupName"
                  value={newAgentGroupId || ""}
                  onChange={(e) => {
                    setNewAgentGroupId(e.target.value || null)
                    const selectedGroup = groups.find((g) => g.id === e.target.value)
                    setNewAgentGroupName(selectedGroup?.name || "")
                  }}
                  className="w-full h-10 px-3 rounded-md bg-[var(--input-bg)] border border-[var(--sidebar-border)] text-[var(--text-primary)]"
                >
                  <option value="">Nenhum grupo</option>
                  {groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.icon} {group.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-[var(--text-secondary)]">Escolha o grupo ao qual este agente pertence</p>
              </div>

              <div className="space-y-2">
                <Label className="text-[var(--text-primary)]">Vincular Agentes (opcional)</Label>
                <p className="text-xs text-[var(--text-secondary)] mb-3">
                  Selecione os agentes que deseja vincular a este agente customizado
                </p>
                <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto p-2 border border-[var(--sidebar-border)] rounded-lg bg-[var(--input-bg)]">
                  {availableAgents.map((agent) => (
                    <label
                      key={agent.id}
                      className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all ${
                        selectedAgentIds.includes(agent.id)
                          ? "bg-purple-500/20 border border-purple-500/50"
                          : "bg-[var(--agent-bg)] border border-[var(--sidebar-border)] hover:border-purple-500/30"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedAgentIds.includes(agent.id)}
                        onChange={() => toggleAgentSelection(agent.id)}
                        className="rounded border-[var(--sidebar-border)]"
                      />
                      <span className="text-sm text-[var(--text-primary)]">{agent.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  onClick={() => {
                    setShowEditModal(false)
                    setEditingAgent(null)
                    setNewAgentName("")
                    setNewAgentDescription("")
                    setNewAgentIcon("👔")
                    setNewAgentColor("#8b5cf6")
                    setNewAgentTriggerWord("")
                    setNewAgentGroupName("")
                    setNewAgentGroupId(null)
                    setSelectedAgentIds([])
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleUpdateCustomAgent}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500"
                >
                  Salvar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
