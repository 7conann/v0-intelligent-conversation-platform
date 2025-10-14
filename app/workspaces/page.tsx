"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Star, SettingsIcon, Hash } from "lucide-react"
import { useToast } from "@/components/ui/toast"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { Agent } from "@/types/chat"

interface WorkspaceAgent extends Agent {
  is_favorite?: boolean
}

export default function WorkspacesPage() {
  const router = useRouter()
  const { addToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [agents, setAgents] = useState<WorkspaceAgent[]>([])
  const [selectedAgent, setSelectedAgent] = useState<WorkspaceAgent | null>(null)
  const [showAgentConfig, setShowAgentConfig] = useState(false)

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

      const { data: agentsData, error: agentsError } = await supabase
        .from("agents")
        .select("*")
        .order("created_at", { ascending: true })

      if (agentsError) {
        console.error("Error loading agents:", agentsError)
      } else if (agentsData) {
        setAgents(agentsData as WorkspaceAgent[])
      }

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

  const handleToggleFavorite = async (agentId: string) => {
    const supabase = createClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) return

    const agent = agents.find((a) => a.id === agentId)
    if (!agent) return

    if (agent.is_favorite) {
      // Remove from favorites
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
      // Add to favorites
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

  const handleSaveAgentConfig = async () => {
    if (!selectedAgent) return

    console.log("[v0] 💾 Salvando palavra-chave:", {
      agentId: selectedAgent.id,
      agentName: selectedAgent.name,
      oldTriggerWord: agents.find((a) => a.id === selectedAgent.id)?.trigger_word,
      newTriggerWord: selectedAgent.trigger_word,
    })

    const supabase = createClient()

    const { data, error, count } = await supabase
      .from("agents")
      .update({
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
      console.error("[v0] ❌ Erro ao salvar palavra-chave:", error)
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

    console.log("[v0] ✅ Palavra-chave salva com sucesso no banco de dados")

    const { data: verifyData, error: verifyError } = await supabase
      .from("agents")
      .select("trigger_word")
      .eq("id", selectedAgent.id)
      .single()

    if (verifyError) {
      console.error("[v0] ❌ Erro ao verificar salvamento:", verifyError)
    } else {
      console.log("[v0] 🔍 Verificação do banco de dados:", {
        agentId: selectedAgent.id,
        triggerWordNoBanco: verifyData.trigger_word,
        triggerWordEsperada: selectedAgent.trigger_word,
        match: verifyData.trigger_word === selectedAgent.trigger_word,
      })
    }

    addToast({
      title: "Configuração salva",
      description: `Palavra-chave do ${selectedAgent.name} foi atualizada`,
      variant: "success",
    })

    setAgents((prev) => prev.map((a) => (a.id === selectedAgent.id ? selectedAgent : a)))
    setShowAgentConfig(false)
    setSelectedAgent(null)
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
              <h1 className="text-2xl font-bold">Workspaces & Agentes</h1>
              <p className="text-sm text-muted-foreground">Configure palavras-chave dos agentes</p>
            </div>
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
                    <h3 className="font-semibold text-lg">{agent.name}</h3>
                    <p className="text-xs text-muted-foreground">Agente especializado</p>
                  </div>
                </div>
                <button onClick={() => handleToggleFavorite(agent.id)} className="hover:scale-110 transition-transform">
                  <Star
                    className={`h-5 w-5 ${
                      agent.is_favorite ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"
                    }`}
                  />
                </button>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm">
                  <Hash className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    Palavra-chave: {agent.trigger_word || "Não configurada"}
                  </span>
                </div>
              </div>

              <Button
                onClick={() => {
                  setSelectedAgent(agent)
                  setShowAgentConfig(true)
                }}
                variant="outline"
                className="w-full"
              >
                <SettingsIcon className="h-4 w-4 mr-2" />
                Configurar
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Agent Config Modal */}
      {showAgentConfig && selectedAgent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--settings-bg)] rounded-xl border border-[var(--sidebar-border)] max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-6">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-xl text-2xl"
                style={{ backgroundColor: `${selectedAgent.color}20`, border: `2px solid ${selectedAgent.color}40` }}
              >
                {selectedAgent.icon}
              </div>
              <div>
                <h2 className="text-xl font-bold">Configurar {selectedAgent.name}</h2>
                <p className="text-sm text-muted-foreground">Configure a palavra-chave do agente</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="triggerWord">Palavra-chave</Label>
                <Input
                  id="triggerWord"
                  type="text"
                  value={selectedAgent.trigger_word || ""}
                  onChange={(e) => setSelectedAgent({ ...selectedAgent, trigger_word: e.target.value })}
                  placeholder="#vendas"
                  className="bg-[var(--input-bg)] border-[var(--sidebar-border)]"
                />
                <p className="text-xs text-muted-foreground">
                  Palavra-chave que será usada para ativar este agente (ex: #vendas, #suporte)
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  onClick={() => {
                    setShowAgentConfig(false)
                    setSelectedAgent(null)
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleSaveAgentConfig}
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
