"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, Save } from "lucide-react"
import Link from "next/link"

interface Agent {
  id: string
  name: string
  description: string
  icon: string
  color: string
  trigger_word: string
  is_system: boolean
}

interface Workspace {
  id: string
  name: string
  description: string
  api_url: string
  api_key: string
}

export default function WorkspacePage() {
  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [agents, setAgents] = useState<Agent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.push("/login")
        return
      }

      // Load workspace
      const { data: workspaceData, error: workspaceError } = await supabase
        .from("workspaces")
        .select("*")
        .eq("user_id", user.id)
        .single()

      if (workspaceError && workspaceError.code !== "PGRST116") {
        throw workspaceError
      }

      if (workspaceData) {
        setWorkspace(workspaceData)
      }

      // Load agents
      const { data: agentsData, error: agentsError } = await supabase.from("agents").select("*").order("name")

      if (agentsError) throw agentsError
      setAgents(agentsData || [])
    } catch (error) {
      console.error("Error loading data:", error)
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar as configurações",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const saveWorkspace = async () => {
    setIsSaving(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("Usuário não autenticado")

      const workspaceData = {
        user_id: user.id,
        name: workspace?.name || "Meu Workspace",
        description: workspace?.description || "",
        api_url: workspace?.api_url || "",
        api_key: workspace?.api_key || "",
      }

      if (workspace?.id) {
        // Update existing workspace
        const { error } = await supabase.from("workspaces").update(workspaceData).eq("id", workspace.id)

        if (error) throw error
      } else {
        // Create new workspace
        const { data, error } = await supabase.from("workspaces").insert(workspaceData).select().single()

        if (error) throw error
        setWorkspace(data)
      }

      toast({
        title: "Configurações salvas",
        description: "Suas configurações foram salvas com sucesso",
      })
    } catch (error) {
      console.error("Error saving workspace:", error)
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar as configurações",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando configurações...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/chat">
                <Button variant="ghost" size="icon" className="cursor-pointer">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold">Configurações do Workspace</h1>
                <p className="text-sm text-muted-foreground">Configure sua API e gerencie seus agentes</p>
              </div>
            </div>
            <Button
              onClick={saveWorkspace}
              disabled={isSaving}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 cursor-pointer"
            >
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? "Salvando..." : "Salvar Configurações"}
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8 max-w-6xl">
        <div className="grid gap-8">
          {/* Workspace Configuration */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-6">Configuração da API</h2>
            <div className="space-y-4">
              <div>
                <Label htmlFor="workspace-name">Nome do Workspace</Label>
                <Input
                  id="workspace-name"
                  value={workspace?.name || ""}
                  onChange={(e) => setWorkspace({ ...workspace!, name: e.target.value })}
                  placeholder="Meu Workspace"
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="workspace-description">Descrição</Label>
                <Textarea
                  id="workspace-description"
                  value={workspace?.description || ""}
                  onChange={(e) => setWorkspace({ ...workspace!, description: e.target.value })}
                  placeholder="Descrição do workspace"
                  className="mt-2"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="api-url">URL da API</Label>
                <Input
                  id="api-url"
                  value={workspace?.api_url || ""}
                  onChange={(e) => setWorkspace({ ...workspace!, api_url: e.target.value })}
                  placeholder="https://n8n.grupobeely.com.br/webhook/..."
                  className="mt-2"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  URL do webhook que receberá as mensagens dos agentes
                </p>
              </div>

              <div>
                <Label htmlFor="api-key">Chave da API (opcional)</Label>
                <Input
                  id="api-key"
                  type="password"
                  value={workspace?.api_key || ""}
                  onChange={(e) => setWorkspace({ ...workspace!, api_key: e.target.value })}
                  placeholder="Chave de autenticação"
                  className="mt-2"
                />
              </div>
            </div>
          </div>

          {/* Agents Configuration */}
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Agentes do Sistema</h2>
              <p className="text-sm text-muted-foreground">{agents.length} agentes disponíveis</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {agents.map((agent) => (
                <div
                  key={agent.id}
                  className="border border-border rounded-lg p-4 hover:border-purple-500/50 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-semibold"
                      style={{ backgroundColor: agent.color }}
                    >
                      {agent.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">{agent.name}</h3>
                      <p className="text-xs text-muted-foreground line-clamp-2">{agent.description}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-xs px-2 py-1 bg-purple-500/10 text-purple-400 rounded">
                          {agent.trigger_word}
                        </span>
                        {agent.is_system && (
                          <span className="text-xs px-2 py-1 bg-blue-500/10 text-blue-400 rounded">Sistema</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>Palavra-passe:</strong> Cada agente possui uma palavra-passe única que será enviada para a API
                para identificar qual agente deve processar a mensagem.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
