"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Star,
  SettingsIcon,
  Hash,
  Plus,
  Eye,
  EyeOff,
  Trash2,
  GripVertical,
  Filter,
  AlertCircle,
  FolderOpen,
  Edit2,
} from "lucide-react"
import { useToast } from "@/components/ui/toast"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { EmojiPicker } from "@/components/emoji-picker"
import { IconPicker } from "@/components/icon-picker"
import { ConfirmDialog } from "@/components/confirm-dialog"
import type { Agent } from "@/types/chat"
import { getAgentPreferences, toggleAgentVisibility } from "@/lib/supabase/agent-preferences"
import { runAgentManagementMigration } from "@/app/actions/run-migration"

interface WorkspaceAgent extends Agent {
  is_favorite?: boolean
  is_visible?: boolean
  is_active?: boolean
  group?: {
    id: string
    name: string
    icon: string
    display_order: number
  }
  group_id?: string
  display_order?: number
}

interface Group {
  id: string
  name: string
  icon: string
  display_order: number
  created_at?: string
}

const AUTHORIZED_EMAILS = ["kleber.zumiotti@iprocesso.com", "angelomarchi05@gmail.com"]

export default function WorkspacesPage() {
  const router = useRouter()
  const { addToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [agents, setAgents] = useState<WorkspaceAgent[]>([])
  const [filteredAgents, setFilteredAgents] = useState<WorkspaceAgent[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [selectedAgent, setSelectedAgent] = useState<WorkspaceAgent | null>(null)
  const [showAgentConfig, setShowAgentConfig] = useState(false)
  const [showCreateAgent, setShowCreateAgent] = useState(false)
  const [showManageAgents, setShowManageAgents] = useState(false)
  const [showCreateGroup, setShowCreateGroup] = useState(false)
  const [showManageGroups, setShowManageGroups] = useState(false)
  const [editingGroup, setEditingGroup] = useState<{ id: string; name: string; icon: string } | null>(null)
  const [createGroupName, setCreateGroupName] = useState("")
  const [createGroupIcon, setCreateGroupIcon] = useState("📁")
  const [selectedAgentsForGroup, setSelectedAgentsForGroup] = useState<Set<string>>(new Set())
  const [agentVisibility, setAgentVisibility] = useState<Record<string, boolean>>({})
  const [userId, setUserId] = useState<string>("")
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("active")
  const [filterGroup, setFilterGroup] = useState<string>("all")
  const [draggedAgent, setDraggedAgent] = useState<WorkspaceAgent | null>(null)
  const [dragOverAgent, setDragOverAgent] = useState<WorkspaceAgent | null>(null)
  const [draggedGroup, setDraggedGroup] = useState<Group | null>(null)
  const [dragOverGroup, setDragOverGroup] = useState<Group | null>(null)
  const [newAgent, setNewAgent] = useState({
    name: "",
    icon: "",
    color: "#8B5CF6",
    description: "",
    trigger_word: "",
    group_name: "", // Initialize as empty, will be set by group selection logic
  })
  const [newGroupName, setNewGroupName] = useState("")
  const [isCreatingNewGroup, setIsCreatingNewGroup] = useState(false)
  const [inactiveAgents, setInactiveAgents] = useState<Set<string>>(new Set())
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean
    title: string
    description: string
    onConfirm: () => void
    variant?: "default" | "destructive"
  }>({
    isOpen: false,
    title: "",
    description: "",
    onConfirm: () => {},
  })
  const [showMigrationModal, setShowMigrationModal] = useState(false)
  const [isMigrating, setIsMigrating] = useState(false)

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

      const storedInactive = localStorage.getItem(`inactive_agents_${session.user.id}`)
      if (storedInactive) {
        setInactiveAgents(new Set(JSON.parse(storedInactive)))
      }

      const { data: groupsData, error: groupsError } = await supabase
        .from("groups")
        .select("*")
        .order("display_order", { ascending: true })

      if (groupsError) {
        console.error("[v0] Error loading groups:", groupsError)
        // If groups table doesn't exist, show migration modal
        if (groupsError.message.includes('relation "public.groups" does not exist')) {
          setShowMigrationModal(true)
        }
      } else if (groupsData) {
        setGroups(groupsData as Group[])
      }

      const { data: agentsData, error: agentsError } = await supabase
        .from("agents")
        .select(`
          *,
          group:groups!group_id (
            id,
            name,
            icon,
            display_order
          )
        `)
        .order("order", { ascending: true })

      if (agentsError) {
        console.error("Error loading agents:", agentsError)
      } else if (agentsData) {
        const mappedAgents = agentsData.map((agent: any) => ({
          ...agent,
          display_order: agent.display_order ?? agent.order ?? 0,
          is_active: agent.is_active ?? true,
        }))
        setAgents(mappedAgents as WorkspaceAgent[])
      }

      const preferences = getAgentPreferences(session.user.id)
      setAgentVisibility(preferences)

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
    let filtered = [...agents]

    if (filterStatus === "active") {
      filtered = filtered.filter((a) => !inactiveAgents.has(a.id))
    } else if (filterStatus === "inactive") {
      filtered = filtered.filter((a) => inactiveAgents.has(a.id))
    }

    if (filterGroup !== "all") {
      filtered = filtered.filter((a) => a.group?.name === filterGroup)
    }

    setFilteredAgents(filtered)
  }, [agents, filterStatus, filterGroup, inactiveAgents])

  const groupNames = groups.map((g) => g.name)

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
            group_name: "", // Reset to empty
          })
        }
        if (showManageAgents) {
          setShowManageAgents(false)
        }
        if (showCreateGroup) {
          setShowCreateGroup(false)
          setCreateGroupName("")
          setCreateGroupIcon("📁")
          setSelectedAgentsForGroup(new Set())
        }
        if (showManageGroups) {
          setShowManageGroups(false)
          setEditingGroup(null)
        }
        if (showMigrationModal) {
          setShowMigrationModal(false)
        }
      }
    }

    window.addEventListener("keydown", handleEscape)
    return () => window.removeEventListener("keydown", handleEscape)
  }, [showAgentConfig, showCreateAgent, showManageAgents, showCreateGroup, showManageGroups, showMigrationModal])

  const handleDragStart = (agent: WorkspaceAgent) => {
    setDraggedAgent(agent)
  }

  const handleDragOver = (e: React.DragEvent, agent: WorkspaceAgent) => {
    e.preventDefault()
    setDragOverAgent(agent)
  }

  const handleDragLeave = () => {
    setDragOverAgent(null)
  }

  const handleDrop = async (targetAgent: WorkspaceAgent) => {
    if (!draggedAgent || draggedAgent.id === targetAgent.id) {
      setDragOverAgent(null)
      return
    }

    const supabase = createClient()
    const draggedIndex = agents.findIndex((a) => a.id === draggedAgent.id)
    const targetIndex = agents.findIndex((a) => a.id === targetAgent.id)

    // Reorder locally
    const newAgents = [...agents]
    newAgents.splice(draggedIndex, 1)
    newAgents.splice(targetIndex, 0, draggedAgent)

    const reorderedAgents = newAgents.map((agent, index) => ({
      ...agent,
      order: index,
      display_order: index,
    }))

    setAgents(reorderedAgents)

    // Update in database
    const updates = reorderedAgents.map((agent, index) => ({
      id: agent.id,
      order: index,
    }))

    for (const update of updates) {
      await supabase.from("agents").update({ order: update.order }).eq("id", update.id)
    }

    setDraggedAgent(null)
    setDragOverAgent(null)

    addToast({
      title: "Ordem atualizada",
      description: "A ordem dos agentes foi atualizada na sidebar",
      variant: "success",
    })
  }

  const handleGroupDragStart = (group: Group) => {
    setDraggedGroup(group)
  }

  const handleGroupDragOver = (e: React.DragEvent, group: Group) => {
    e.preventDefault()
    setDragOverGroup(group)
  }

  const handleGroupDragLeave = () => {
    setDragOverGroup(null)
  }

  const handleGroupDrop = async (targetGroup: Group) => {
    if (!draggedGroup || draggedGroup.id === targetGroup.id) {
      setDragOverGroup(null)
      return
    }

    const supabase = createClient()
    const draggedIndex = groups.findIndex((g) => g.id === draggedGroup.id)
    const targetIndex = groups.findIndex((g) => g.id === targetGroup.id)

    // Reorder locally
    const newGroups = [...groups]
    newGroups.splice(draggedIndex, 1)
    newGroups.splice(targetIndex, 0, draggedGroup)

    const reorderedGroups = newGroups.map((group, index) => ({
      ...group,
      display_order: index,
    }))

    setGroups(reorderedGroups)

    // Update in database
    const updates = reorderedGroups.map((group) =>
      supabase.from("groups").update({ display_order: group.display_order }).eq("id", group.id),
    )

    try {
      await Promise.all(updates)

      addToast({
        title: "Ordem atualizada",
        description: "A ordem dos grupos foi atualizada para todos os usuários",
        variant: "success",
      })
    } catch (error) {
      console.error("[v0] Error updating group order:", error)
      addToast({
        title: "Erro",
        description: "Não foi possível atualizar a ordem dos grupos",
        variant: "error",
      })
    }

    setDraggedGroup(null)
    setDragOverGroup(null)
  }

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

      addToast({
        title: newVisibility ? "Agente ativado" : "Agente desativado",
        description: newVisibility ? "O agente agora aparecerá na sidebar" : "O agente foi ocultado da sidebar",
        variant: "success",
      })
    } catch (error) {
      console.error("[v0] Error saving to localStorage:", error)
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

    const supabase = createClient()

    const { data, error } = await supabase
      .from("agents")
      .update({
        name: selectedAgent.name,
        icon: selectedAgent.icon,
        color: selectedAgent.color,
        description: selectedAgent.description,
        group_id: selectedAgent.group_id,
      })
      .eq("id", selectedAgent.id)
      .select(`
        *,
        group:groups!group_id (
          id,
          name,
          icon,
          display_order
        )
      `)

    if (error) {
      addToast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "error",
      })
      return
    }

    addToast({
      title: "Agente atualizado",
      description: `${selectedAgent.name} foi atualizado com sucesso`,
      variant: "success",
    })

    setAgents((prev) => prev.map((a) => (a.id === selectedAgent.id ? (data[0] as WorkspaceAgent) : a)))
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

    const { data: maxOrderData } = await supabase
      .from("agents")
      .select("order")
      .order("order", { ascending: false })
      .limit(1)

    const maxOrder = maxOrderData?.[0]?.order || 0

    const { data, error } = await supabase
      .from("agents")
      .insert({
        name: newAgent.name,
        icon: newAgent.icon,
        color: newAgent.color,
        description: newAgent.description,
        trigger_word: newAgent.trigger_word,
        is_system: false,
        order: maxOrder + 1,
        group_id: newAgent.group_name, // This will be the group_id now
      })
      .select(`
        *,
        group:groups!group_id (
          id,
          name,
          icon,
          display_order
        )
      `)
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

    const mappedAgent = {
      ...data,
      display_order: data.order,
      is_active: true,
    }

    setAgents((prev) => [...prev, mappedAgent as WorkspaceAgent])
    setShowCreateAgent(false)
    setNewAgent({
      name: "",
      icon: "",
      color: "#8B5CF6",
      description: "",
      trigger_word: "",
      group_name: "", // Reset to empty
    })
  }

  const handleDeleteAgent = async (agentId: string) => {
    if (!isAuthorized) {
      addToast({
        title: "Acesso negado",
        description: "Você não tem permissão para desativar agentes",
        variant: "error",
      })
      return
    }

    const agent = agents.find((a) => a.id === agentId)
    if (!agent) return

    const supabase = createClient()

    const { data: linkedCustomAgents } = await supabase
      .from("custom_agents")
      .select("id, name")
      .contains("agent_ids", [agentId])

    if (linkedCustomAgents && linkedCustomAgents.length > 0) {
      const customAgentNames = linkedCustomAgents.map((ca) => ca.name).join(", ")

      setConfirmDialog({
        isOpen: true,
        title: "Desativar agente vinculado",
        description: `Este agente está vinculado aos seguintes agentes customizados: ${customAgentNames}.\n\nAo desativar este agente, os agentes customizados vinculados também serão desativados. Deseja continuar?`,
        variant: "destructive",
        onConfirm: () => {
          const newInactive = new Set(inactiveAgents)
          linkedCustomAgents.forEach((ca) => newInactive.add(ca.id))
          newInactive.add(agentId)
          setInactiveAgents(newInactive)
          localStorage.setItem(`inactive_agents_${userId}`, JSON.JSON.stringify(Array.from(newInactive)))

          addToast({
            title: "Agente desativado",
            description: `${agent.name} e ${linkedCustomAgents.length} agente(s) customizado(s) vinculado(s) foram movidos para a lixeira`,
            variant: "success",
          })
        },
      })
    } else {
      setConfirmDialog({
        isOpen: true,
        title: "Desativar agente",
        description: `Deseja desativar o agente "${agent.name}"?\n\nO agente será movido para a lixeira e não aparecerá mais na sidebar.\nVocê poderá restaurá-lo a qualquer momento usando o filtro "Inativos (Lixeira)".`,
        variant: "destructive",
        onConfirm: () => {
          const newInactive = new Set(inactiveAgents)
          newInactive.add(agentId)
          setInactiveAgents(newInactive)
          localStorage.setItem(`inactive_agents_${userId}`, JSON.JSON.stringify(Array.from(newInactive)))

          addToast({
            title: "Agente desativado",
            description: `${agent.name} foi movido para a lixeira. Use o filtro "Inativos" para restaurá-lo.`,
            variant: "success",
          })
        },
      })
    }
  }

  const handleRestoreAgent = async (agentId: string) => {
    const agent = agents.find((a) => a.id === agentId)
    if (!agent) return

    setConfirmDialog({
      isOpen: true,
      title: "Restaurar agente",
      description: `Deseja restaurar o agente "${agent.name}"?\n\nO agente voltará a aparecer na sidebar e ficará ativo novamente.`,
      onConfirm: () => {
        const newInactive = new Set(inactiveAgents)
        newInactive.delete(agentId)
        setInactiveAgents(newInactive)
        localStorage.setItem(`inactive_agents_${userId}`, JSON.JSON.stringify(Array.from(newInactive)))

        addToast({
          title: "Agente restaurado",
          description: `${agent.name} foi restaurado e voltará a aparecer na sidebar`,
          variant: "success",
        })
      },
    })
  }

  const handleCreateGroup = async () => {
    if (!isAuthorized) {
      addToast({
        title: "Acesso negado",
        description: "Você não tem permissão para criar grupos",
        variant: "error",
      })
      return
    }

    if (!createGroupName.trim()) {
      addToast({
        title: "Nome obrigatório",
        description: "Digite um nome para o grupo",
        variant: "error",
      })
      return
    }

    if (selectedAgentsForGroup.size === 0) {
      addToast({
        title: "Selecione agentes",
        description: "Selecione pelo menos um agente para o grupo",
        variant: "error",
      })
      return
    }

    const supabase = createClient()

    const { data: existingGroups, error: checkError } = await supabase.from("groups").select("id").limit(1)

    if (checkError && checkError.message.includes('relation "public.groups" does not exist')) {
      console.error("[v0] Groups table does not exist:", checkError)
      setShowMigrationModal(true)
      return
    }

    const { data: newGroup, error: groupError } = await supabase
      .from("groups")
      .insert({
        name: createGroupName.trim(),
        icon: createGroupIcon,
        display_order: groups.length,
      })
      .select()
      .single()

    if (groupError) {
      console.error("[v0] Error creating group:", groupError)
      addToast({
        title: "Erro ao criar grupo",
        description: groupError.message || "Não foi possível criar o grupo",
        variant: "error",
      })
      return
    }

    const updates = Array.from(selectedAgentsForGroup).map(async (agentId) => {
      return await supabase.from("agents").update({ group_id: newGroup.id }).eq("id", agentId)
    })

    try {
      const results = await Promise.all(updates)

      const errors = results.filter((r) => r.error)
      if (errors.length > 0) {
        console.error("[v0] Errors updating agents:", errors)
        addToast({
          title: "Erro ao atribuir agentes",
          description: "Não foi possível atribuir os agentes ao grupo",
          variant: "error",
        })
        return
      }

      setGroups((prev) => [...prev, newGroup as Group])

      setAgents((prev) =>
        prev.map((agent) =>
          selectedAgentsForGroup.has(agent.id)
            ? {
                ...agent,
                group_id: newGroup.id,
                group: {
                  id: newGroup.id,
                  name: newGroup.name,
                  icon: newGroup.icon,
                  display_order: newGroup.display_order,
                },
              }
            : agent,
        ),
      )

      addToast({
        title: "Grupo criado",
        description: `Grupo "${createGroupName}" criado com ${selectedAgentsForGroup.size} agente(s)`,
        variant: "success",
      })

      setShowCreateGroup(false)
      setCreateGroupName("")
      setCreateGroupIcon("📁")
      setSelectedAgentsForGroup(new Set())
    } catch (error) {
      console.error("[v0] Error creating group:", error)
      addToast({
        title: "Erro ao criar grupo",
        description: "Ocorreu um erro ao criar o grupo",
        variant: "error",
      })
    }
  }

  const handleToggleAgentForGroup = (agentId: string) => {
    setSelectedAgentsForGroup((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(agentId)) {
        newSet.delete(agentId)
      } else {
        newSet.add(agentId)
      }
      return newSet
    })
  }

  const handleRunMigration = async () => {
    setIsMigrating(true)

    try {
      const result = await runAgentManagementMigration()

      if (result.success) {
        addToast({
          title: "Migração concluída",
          description: result.message,
          variant: "success",
        })

        // Wait a bit then reload the page
        setTimeout(() => {
          window.location.reload()
        }, 1500)
      } else {
        addToast({
          title: "Erro na migração",
          description: result.message,
          variant: "error",
        })
        setIsMigrating(false)
      }
    } catch (error) {
      console.error("[v0] Error running migration:", error)
      addToast({
        title: "Erro na migração",
        description: "Ocorreu um erro ao executar a migração. Tente executar o script manualmente.",
        variant: "error",
      })
      setIsMigrating(false)
    }
  }

  const handleEditGroup = async (groupId: string, newName: string, newIcon: string) => {
    if (!isAuthorized) {
      addToast({
        title: "Acesso negado",
        description: "Você não tem permissão para editar grupos",
        variant: "error",
      })
      return
    }

    if (!newName.trim()) {
      addToast({
        title: "Nome obrigatório",
        description: "Digite um nome para o grupo",
        variant: "error",
      })
      return
    }

    const group = groups.find((g) => g.id === groupId)
    if (!group) return

    const oldName = group.name

    if (newName.trim() === oldName && newIcon === group.icon) {
      setEditingGroup(null)
      return
    }

    const supabase = createClient()

    const { error: groupError } = await supabase
      .from("groups")
      .update({ name: newName.trim(), icon: newIcon })
      .eq("id", groupId)

    if (groupError) {
      console.error("[v0] Error updating group:", groupError)
      addToast({
        title: "Erro ao editar grupo",
        description: groupError.message,
        variant: "error",
      })
      return
    }

    setGroups((prev) => prev.map((g) => (g.id === groupId ? { ...g, name: newName.trim(), icon: newIcon } : g)))

    setAgents((prev) =>
      prev.map((agent) =>
        agent.group_id === groupId
          ? {
              ...agent,
              group: {
                id: groupId,
                name: newName.trim(),
                icon: newIcon,
                display_order: group.display_order,
              },
            }
          : agent,
      ),
    )

    addToast({
      title: "Grupo atualizado",
      description: `Grupo "${oldName}" foi atualizado com sucesso`,
      variant: "success",
    })

    setEditingGroup(null)
  }

  const handleDeleteGroup = async (groupId: string) => {
    if (!isAuthorized) {
      addToast({
        title: "Acesso negado",
        description: "Você não tem permissão para excluir grupos",
        variant: "error",
      })
      return
    }

    const group = groups.find((g) => g.id === groupId)
    if (!group) return

    const agentsInGroup = agents.filter((a) => a.group_id === groupId)

    setConfirmDialog({
      isOpen: true,
      title: "Excluir grupo",
      description: `Deseja excluir o grupo "${group.name}"?\n\n${agentsInGroup.length} agente(s) terão seus grupos removidos automaticamente.`,
      variant: "destructive",
      onConfirm: async () => {
        const supabase = createClient()

        // The foreign key constraint will automatically set group_id to NULL for all agents in this group

        const { error: deleteError } = await supabase.from("groups").delete().eq("id", groupId)

        if (deleteError) {
          console.error("[v0] Error deleting group:", deleteError)
          addToast({
            title: "Erro ao excluir grupo",
            description: deleteError.message,
            variant: "error",
          })
          return
        }

        setGroups((prev) => prev.filter((g) => g.id !== groupId))
        setAgents((prev) =>
          prev.map((agent) =>
            agent.group_id === groupId ? { ...agent, group_id: undefined, group: undefined } : agent,
          ),
        )

        addToast({
          title: "Grupo excluído",
          description: `Grupo "${group.name}" foi excluído e ${agentsInGroup.length} agente(s) tiveram seus grupos removidos`,
          variant: "success",
        })
      },
    })
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
      <div className="sticky top-0 z-50 border-b border-[var(--sidebar-border)] bg-[var(--chat-header-bg)] px-6 py-4">
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
              <p className="text-sm text-[var(--text-secondary)]">Configure, organize e gerencie seus agentes</p>
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
              <>
                <Button
                  onClick={() => setShowManageGroups(true)}
                  variant="outline"
                  className="border-[var(--sidebar-border)] text-blue-500 hover:text-blue-500 hover:bg-transparent"
                >
                  <FolderOpen className="h-4 w-4 mr-2" />
                  Gerenciar Grupos
                </Button>
                <Button
                  onClick={() => setShowCreateGroup(true)}
                  variant="outline"
                  className="border-[var(--sidebar-border)] text-blue-500 hover:text-blue-500 hover:bg-transparent"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Grupo
                </Button>
                <Button
                  onClick={() => setShowCreateAgent(true)}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Novo Agente
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 pb-6 pt-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-[var(--text-secondary)]" />
            <span className="text-sm text-[var(--text-secondary)]">Filtros:</span>
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as "all" | "active" | "inactive")}
            className="px-3 py-1.5 rounded-lg bg-[var(--input-bg)] border border-[var(--sidebar-border)] text-[var(--text-primary)] text-sm"
          >
            <option value="all">Todos os status</option>
            <option value="active">Ativos</option>
            <option value="inactive">Inativos (Lixeira)</option>
          </select>
          <select
            value={filterGroup}
            onChange={(e) => setFilterGroup(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-[var(--input-bg)] border border-[var(--sidebar-border)] text-[var(--text-primary)] text-sm"
          >
            <option value="all">Todos os grupos</option>
            {groupNames.map((group) => (
              <option key={group} value={group}>
                {group}
              </option>
            ))}
          </select>
          <div className="ml-auto text-sm text-[var(--text-secondary)]">
            {filteredAgents.length} agente(s) encontrado(s)
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-6xl px-6 pb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAgents.map((agent) => {
            const isInactive = inactiveAgents.has(agent.id)

            return (
              <div
                key={agent.id}
                draggable={isAuthorized && !isInactive}
                onDragStart={() => handleDragStart(agent)}
                onDragOver={(e) => handleDragOver(e, agent)}
                onDragLeave={handleDragLeave}
                onDrop={() => handleDrop(agent)}
                className={`rounded-xl border border-[var(--sidebar-border)] bg-[var(--settings-bg)] p-6 hover:border-purple-500/50 transition-all ${
                  isInactive ? "opacity-50" : ""
                } ${isAuthorized && !isInactive ? "cursor-move" : ""} ${
                  dragOverAgent?.id === agent.id ? "border-purple-500 scale-105" : ""
                } ${draggedAgent?.id === agent.id ? "opacity-50" : ""}`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3 flex-1">
                    {isAuthorized && !isInactive && (
                      <GripVertical className="h-5 w-5 text-[var(--text-secondary)] flex-shrink-0" />
                    )}
                    <div
                      className="flex h-12 w-12 items-center justify-center rounded-xl text-2xl flex-shrink-0"
                      style={{ backgroundColor: `${agent.color}20`, border: `2px solid ${agent.color}40` }}
                    >
                      {agent.icon}
                    </div>
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <h3
                        className="font-semibold text-lg text-[var(--text-primary)] line-clamp-2 break-words"
                        title={agent.name}
                      >
                        {agent.name}
                      </h3>
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-[var(--text-secondary)] truncate">
                          {agent.group?.name || "Sem grupo"}
                        </p>
                        {isInactive && (
                          <span className="text-xs px-2 py-0.5 rounded bg-red-500/20 text-red-500 whitespace-nowrap">
                            Inativo
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleToggleFavorite(agent.id)}
                    className="hover:scale-110 transition-transform flex-shrink-0"
                  >
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
                    {isInactive ? (
                      <Button
                        onClick={() => handleRestoreAgent(agent.id)}
                        variant="outline"
                        className="flex-1 border-green-500/50 text-green-500 hover:bg-green-500/10"
                      >
                        Restaurar
                      </Button>
                    ) : (
                      <>
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
                      </>
                    )}
                  </div>
                )}
              </div>
            )
          })}
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

              <div className="space-y-2">
                <Label htmlFor="editAgentGroup" className="text-[var(--text-primary)]">
                  Grupo
                </Label>
                <select
                  id="editAgentGroup"
                  value={selectedAgent.group_id || ""}
                  onChange={(e) => setSelectedAgent({ ...selectedAgent, group_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-[var(--input-bg)] border border-[var(--sidebar-border)] text-[var(--text-primary)]"
                >
                  <option value="">📁 Sem grupo</option>
                  {groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.icon} {group.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-[var(--text-secondary)]">Escolha o grupo ao qual este agente pertence</p>
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

              <div className="space-y-2">
                <Label htmlFor="agentGroup" className="text-[var(--text-primary)]">
                  Grupo
                </Label>
                <select
                  id="agentGroup"
                  value={isCreatingNewGroup ? "__new__" : newAgent.group_name}
                  onChange={(e) => {
                    if (e.target.value === "__new__") {
                      setIsCreatingNewGroup(true)
                      setNewGroupName("")
                    } else {
                      setIsCreatingNewGroup(false)
                      setNewAgent({ ...newAgent, group_name: e.target.value })
                    }
                  }}
                  className="w-full px-3 py-2 rounded-lg bg-[var(--input-bg)] border border-[var(--sidebar-border)] text-[var(--text-primary)]"
                >
                  <option value="">📁 Sem grupo</option>
                  {groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.icon} {group.name}
                    </option>
                  ))}
                  <option value="__new__">+ Novo Grupo</option>
                </select>
                {isCreatingNewGroup && (
                  <Input
                    type="text"
                    placeholder="Nome do novo grupo"
                    value={newGroupName}
                    onChange={(e) => {
                      setNewGroupName(e.target.value)
                      setNewAgent({ ...newAgent, group_name: e.target.value })
                    }}
                    onBlur={() => {
                      if (!newGroupName.trim()) {
                        setIsCreatingNewGroup(false)
                        setNewAgent({ ...newAgent, group_name: "" }) // Reset to empty
                      }
                    }}
                    autoFocus
                    className="mt-2 bg-[var(--input-bg)] border-[var(--sidebar-border)] text-[var(--text-primary)]"
                  />
                )}
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
                      group_name: "", // Reset to empty
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
      {showCreateGroup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--settings-bg)] rounded-xl border border-[var(--sidebar-border)] max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-[var(--text-primary)]">Criar Novo Grupo</h2>
              <p className="text-sm text-[var(--text-secondary)]">
                Digite o nome do grupo, escolha um ícone e selecione os agentes que farão parte dele
              </p>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="groupName" className="text-[var(--text-primary)]">
                    Nome do Grupo *
                  </Label>
                  <Input
                    id="groupName"
                    type="text"
                    value={createGroupName}
                    onChange={(e) => setCreateGroupName(e.target.value)}
                    placeholder="Ex: Marketing, Vendas, Suporte..."
                    className="bg-[var(--input-bg)] border-[var(--sidebar-border)] text-[var(--text-primary)]"
                    autoFocus
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="groupIcon" className="text-[var(--text-primary)]">
                    Ícone do Grupo *
                  </Label>
                  <IconPicker value={createGroupIcon} onChange={(emoji) => setCreateGroupIcon(emoji)} />
                  <p className="text-xs text-[var(--text-secondary)]">Escolha um emoji para representar o grupo</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-[var(--text-primary)]">Selecione os Agentes *</Label>
                  <span className="text-sm text-[var(--text-secondary)]">
                    {selectedAgentsForGroup.size} agente(s) selecionado(s)
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto p-1">
                  {agents
                    .filter((a) => !inactiveAgents.has(a.id))
                    .map((agent) => {
                      const isSelected = selectedAgentsForGroup.has(agent.id)
                      return (
                        <div
                          key={agent.id}
                          onClick={() => handleToggleAgentForGroup(agent.id)}
                          className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-all ${
                            isSelected
                              ? "border-purple-500 bg-purple-500/10"
                              : "border-[var(--sidebar-border)] bg-[var(--agent-bg)] hover:border-purple-500/50"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="h-5 w-5 rounded border-[var(--sidebar-border)] text-purple-600 focus:ring-purple-500 cursor-pointer"
                          />
                          <div
                            className="flex h-10 w-10 items-center justify-center rounded-lg text-xl"
                            style={{ backgroundColor: `${agent.color}20`, border: `2px solid ${agent.color}40` }}
                          >
                            {agent.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-[var(--text-primary)] truncate">{agent.name}</h3>
                            <p className="text-xs text-[var(--text-secondary)] truncate">
                              {agent.group?.name || "Sem grupo"}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-[var(--sidebar-border)]">
                <Button
                  onClick={() => {
                    setShowCreateGroup(false)
                    setCreateGroupName("")
                    setCreateGroupIcon("📁")
                    setSelectedAgentsForGroup(new Set())
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleCreateGroup}
                  disabled={!createGroupName.trim() || selectedAgentsForGroup.size === 0}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Criar Grupo ({selectedAgentsForGroup.size})
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manage Groups Modal */}
      {showManageGroups && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--settings-bg)] rounded-xl border border-[var(--sidebar-border)] max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-[var(--text-primary)]">Gerenciar Grupos</h2>
              <p className="text-sm text-[var(--text-secondary)]">
                Edite ícones, nomes ou exclua grupos. Arraste para reordenar. As alterações afetam todos os usuários.
              </p>
            </div>

            <div className="space-y-3 mb-6">
              {groups.map((group) => {
                const agentsInGroup = agents.filter((a) => a.group_id === group.id)
                const isEditing = editingGroup?.id === group.id

                return (
                  <div
                    key={group.id}
                    draggable={isAuthorized && !isEditing}
                    onDragStart={() => handleGroupDragStart(group)}
                    onDragOver={(e) => handleGroupDragOver(e, group)}
                    onDragLeave={handleGroupDragLeave}
                    onDrop={() => handleGroupDrop(group)}
                    className={`flex items-center justify-between p-4 rounded-lg border transition-all ${
                      isAuthorized && !isEditing ? "cursor-move" : ""
                    } ${
                      dragOverGroup?.id === group.id
                        ? "border-purple-500 bg-purple-500/10 scale-105"
                        : "border-[var(--sidebar-border)] bg-[var(--agent-bg)] hover:border-purple-500/50"
                    } ${draggedGroup?.id === group.id ? "opacity-50" : ""}`}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      {isAuthorized && !isEditing && (
                        <GripVertical className="h-5 w-5 text-[var(--text-secondary)] flex-shrink-0" />
                      )}
                      {isEditing ? (
                        <div className="flex items-center gap-3 flex-1">
                          <IconPicker
                            value={editingGroup.icon}
                            onChange={(emoji) => setEditingGroup({ ...editingGroup, icon: emoji })}
                          />
                          <Input
                            type="text"
                            value={editingGroup.name}
                            onChange={(e) => setEditingGroup({ ...editingGroup, name: e.target.value })}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && editingGroup.name.trim()) {
                                handleEditGroup(editingGroup.id, editingGroup.name, editingGroup.icon)
                              } else if (e.key === "Escape") {
                                setEditingGroup(null)
                              }
                            }}
                            autoFocus
                            className="flex-1 bg-[var(--input-bg)] border-[var(--sidebar-border)] text-[var(--text-primary)]"
                          />

                          {/* Ações explícitas (não fecham quando clicar no ícone) */}
                          <Button
                            size="sm"
                            className="border-blue-500/50 text-blue-500 hover:bg-blue-500/10 bg-transparent"
                            variant="outline"
                            onClick={() => {
                              if (editingGroup.name.trim()) {
                                handleEditGroup(editingGroup.id, editingGroup.name, editingGroup.icon)
                              }
                            }}
                          >
                            Salvar
                          </Button>
                          <Button
                            size="sm"
                            className="border-[var(--sidebar-border)] bg-transparent"
                            variant="outline"
                            onClick={() => setEditingGroup(null)}
                          >
                            Cancelar
                          </Button>
                        </div>
                      ) : (
                        <>
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/30 text-xl">
                            {group.icon}
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-[var(--text-primary)]">{group.name}</h3>
                            <p className="text-xs text-[var(--text-secondary)]">{agentsInGroup.length} agente(s)</p>
                          </div>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {!isEditing && (
                        <>
                          <Button
                            onClick={() => setEditingGroup({ id: group.id, name: group.name, icon: group.icon })}
                            variant="outline"
                            size="sm"
                            className="border-blue-500/50 text-blue-500 hover:bg-blue-500/10"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            onClick={() => handleDeleteGroup(group.id)}
                            variant="outline"
                            size="sm"
                            className="border-red-500/50 text-red-500 hover:bg-red-500/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="flex justify-end">
              <Button
                onClick={() => {
                  setShowManageGroups(false)
                  setEditingGroup(null)
                }}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500"
              >
                Fechar
              </Button>
            </div>
          </div>
        </div>
      )}
      {showMigrationModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--settings-bg)] rounded-xl border border-[var(--sidebar-border)] max-w-2xl w-full p-6">
            <div className="flex items-start gap-4 mb-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-500/20">
                <AlertCircle className="h-6 w-6 text-yellow-500" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">
                  Atualização do Banco de Dados Necessária
                </h2>
                <p className="text-sm text-[var(--text-secondary)] mb-4">
                  Para usar o recurso de grupos, você precisa executar um script de migração que adiciona as colunas
                  necessárias ao banco de dados.
                </p>
              </div>
            </div>

            <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-lg p-4 mb-4 border border-purple-500/30">
              <h3 className="font-semibold text-[var(--text-primary)] mb-2 flex items-center gap-2">
                <span className="text-purple-500">✨</span>
                Opção Automática (Recomendado)
              </h3>
              <p className="text-sm text-[var(--text-secondary)] mb-3">
                Clique no botão abaixo para executar a migração automaticamente. O sistema irá adicionar as colunas
                necessárias ao banco de dados.
              </p>
              <Button
                onClick={handleRunMigration}
                disabled={isMigrating}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 disabled:opacity-50"
              >
                {isMigrating ? (
                  <>
                    <div className="h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Executando migração...
                  </>
                ) : (
                  <>Executar Migração Automaticamente</>
                )}
              </Button>
            </div>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[var(--sidebar-border)]"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-[var(--settings-bg)] text-[var(--text-secondary)]">
                  ou execute manualmente
                </span>
              </div>
            </div>

            <div className="bg-[var(--agent-bg)] rounded-lg p-4 mb-6 border border-[var(--sidebar-border)]">
              <h3 className="font-semibold text-[var(--text-primary)] mb-3">Como executar manualmente:</h3>
              <ol className="space-y-2 text-sm text-[var(--text-secondary)]">
                <li className="flex gap-2">
                  <span className="font-bold text-purple-500">1.</span>
                  <span>
                    Abra a pasta{" "}
                    <code className="px-2 py-0.5 bg-[var(--input-bg)] rounded text-purple-400">scripts</code> no
                    explorador de arquivos
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-purple-500">2.</span>
                  <span>
                    Localize o arquivo{" "}
                    <code className="px-2 py-0.5 bg-[var(--input-bg)] rounded text-purple-400">
                      022_add_agent_management_fields.sql
                    </code>
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-purple-500">3.</span>
                  <span>Clique no arquivo para abri-lo e execute o script SQL</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-purple-500">4.</span>
                  <span>Após a execução bem-sucedida, recarregue esta página</span>
                </li>
              </ol>
            </div>

            <div className="bg-blue-500/10 rounded-lg p-4 mb-6 border border-blue-500/30">
              <p className="text-sm text-blue-400">
                <strong>O que este script faz:</strong> Adiciona as colunas{" "}
                <code className="px-1 py-0.5 bg-blue-500/20 rounded">group_id</code>,{" "}
                <code className="px-1 py-0.5 bg-blue-500/20 rounded">is_active</code> e{" "}
                <code className="px-1 py-0.5 bg-blue-500/20 rounded">display_order</code> à tabela de agentes,
                permitindo agrupar, desativar e reordenar agentes.
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => setShowMigrationModal(false)}
                variant="outline"
                className="flex-1"
                disabled={isMigrating}
              >
                Fechar
              </Button>
            </div>
          </div>
        </div>
      )}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        description={confirmDialog.description}
        variant={confirmDialog.variant}
        confirmText={confirmDialog.variant === "destructive" ? "Desativar" : "Confirmar"}
      />
    </div>
  )
}
