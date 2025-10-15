"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, User, Building2, Palette, LogOut, Mail, Users } from "lucide-react"
import { useToast } from "@/components/ui/toast"
import { createClient } from "@/lib/supabase/client"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const AUTHORIZED_EMAILS = ["kleber.zumiotti@iprocesso.com", "angelomarchi05@gmail.com"]

export default function ProfilePage() {
  const router = useRouter()
  const { addToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [fullName, setFullName] = useState("")
  const [avatarUrl, setAvatarUrl] = useState("")
  const [theme, setTheme] = useState("dark")
  const [isAuthorized, setIsAuthorized] = useState(false)

  useEffect(() => {
    const loadProfile = async () => {
      const supabase = createClient()

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession()

      if (sessionError || !session) {
        addToast({
          title: "Não autenticado",
          description: "Faça login para acessar seu perfil",
          variant: "error",
        })
        router.push("/login")
        return
      }

      setUser(session.user)
      setIsAuthorized(AUTHORIZED_EMAILS.includes(session.user.email || ""))

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single()

      if (profile) {
        setFullName(profile.full_name || "")
        setAvatarUrl(profile.avatar_url || "")
      }

      const savedTheme = localStorage.getItem("theme") || "dark"
      setTheme(savedTheme)
      setLoading(false)
    }

    loadProfile()
  }, [router, addToast])

  const handleSaveProfile = async () => {
    if (!user) return

    const supabase = createClient()

    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      email: user.email,
      full_name: fullName,
      avatar_url: avatarUrl,
      updated_at: new Date().toISOString(),
    })

    if (error) {
      addToast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "error",
      })
      return
    }

    addToast({
      title: "Perfil atualizado",
      description: "Suas informações foram salvas com sucesso",
      variant: "success",
    })
  }

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme)
    localStorage.setItem("theme", newTheme)
    document.documentElement.classList.toggle("light", newTheme === "light")

    addToast({
      title: "Tema alterado",
      description: `Tema ${newTheme === "dark" ? "escuro" : "claro"} ativado`,
      variant: "success",
    })
  }

  const handleLogout = async () => {
    const supabase = createClient()

    await supabase.auth.signOut()

    // Limpar sessionStorage (credenciais do Supabase)
    sessionStorage.clear()

    // Limpar localStorage (remember me, tema, etc)
    localStorage.clear()

    addToast({
      title: "Logout realizado",
      description: "Até logo!",
      variant: "success",
    })

    router.push("/login")
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--app-bg)]">
        <div className="text-center">
          <div className="mb-4 text-2xl text-[var(--text-primary)]">Carregando perfil...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--app-bg)] text-[var(--text-primary)]">
      {/* Header */}
      <div className="border-b border-[var(--sidebar-border)] bg-[var(--chat-header-bg)] px-6 py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
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
              <h1 className="text-2xl font-bold">{user?.email}</h1>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
          </div>
          <Avatar className="h-16 w-16">
            <AvatarImage src={avatarUrl || "/placeholder.svg"} alt={fullName || user?.email} />
            <AvatarFallback className="bg-gradient-to-br from-purple-600 to-blue-600 text-white text-xl">
              {(fullName || user?.email || "U").charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-4xl p-6 space-y-6">
        {/* Profile Section */}
        <div className="rounded-xl border border-[var(--sidebar-border)] bg-[var(--settings-bg)] p-6">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-purple-600/20 to-blue-600/20 border border-purple-500/30">
              <User className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Perfil</h2>
              <p className="text-sm text-muted-foreground">Gerencie suas informações pessoais</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Nome completo</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Seu nome"
                className="bg-[var(--input-bg)] border-[var(--sidebar-border)]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  value={user?.email || ""}
                  disabled
                  className="bg-[var(--input-bg)] border-[var(--sidebar-border)] opacity-60"
                />
              </div>
              <p className="text-xs text-muted-foreground">O email não pode ser alterado</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="avatarUrl">URL do Avatar</Label>
              <Input
                id="avatarUrl"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://exemplo.com/avatar.jpg"
                className="bg-[var(--input-bg)] border-[var(--sidebar-border)]"
              />
            </div>

            <Button
              onClick={handleSaveProfile}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500"
            >
              Salvar Perfil
            </Button>
          </div>
        </div>

        {isAuthorized && (
          <div className="rounded-xl border border-[var(--sidebar-border)] bg-[var(--settings-bg)] p-6">
            <button
              onClick={() => router.push("/workspaces")}
              className="w-full flex items-center justify-between hover:bg-[var(--agent-bg)] rounded-lg p-4 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-600/20 to-blue-600/20 border border-cyan-500/30">
                  <Building2 className="h-5 w-5 text-cyan-400" />
                </div>
                <div className="text-left">
                  <h2 className="text-lg font-semibold">Workspaces</h2>
                  <p className="text-sm text-muted-foreground">Configure APIs e agentes</p>
                </div>
              </div>
              <ArrowLeft className="h-5 w-5 rotate-180 text-muted-foreground" />
            </button>
          </div>
        )}

        {isAuthorized && (
          <div className="rounded-xl border border-[var(--sidebar-border)] bg-[var(--settings-bg)] p-6">
            <button
              onClick={() => router.push("/custom-agents")}
              className="w-full flex items-center justify-between hover:bg-[var(--agent-bg)] rounded-lg p-4 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-purple-600/20 to-pink-600/20 border border-purple-500/30">
                  <Users className="h-5 w-5 text-purple-400" />
                </div>
                <div className="text-left">
                  <h2 className="text-lg font-semibold">Agentes Customizados</h2>
                  <p className="text-sm text-muted-foreground">Crie composições de agentes</p>
                </div>
              </div>
              <ArrowLeft className="h-5 w-5 rotate-180 text-muted-foreground" />
            </button>
          </div>
        )}

        {/* Theme Section */}
        <div className="rounded-xl border border-[var(--sidebar-border)] bg-[var(--settings-bg)] p-6">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-purple-600/20 to-pink-600/20 border border-purple-500/30">
              <Palette className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Tema</h2>
              <p className="text-sm text-muted-foreground">Escolha a aparência da interface</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => handleThemeChange("dark")}
              className={`flex flex-col items-center gap-2 rounded-lg border p-4 transition-all ${
                theme === "dark"
                  ? "border-purple-500 bg-purple-600/20"
                  : "border-[var(--sidebar-border)] hover:border-purple-500/50"
              }`}
            >
              <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700" />
              <span className="text-sm font-medium">Escuro</span>
            </button>

            <button
              onClick={() => handleThemeChange("light")}
              className={`flex flex-col items-center gap-2 rounded-lg border p-4 transition-all ${
                theme === "light"
                  ? "border-purple-500 bg-purple-600/20"
                  : "border-[var(--sidebar-border)] hover:border-purple-500/50"
              }`}
            >
              <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-300" />
              <span className="text-sm font-medium">Claro</span>
            </button>

            <button
              onClick={() => handleThemeChange("system")}
              className={`flex flex-col items-center gap-2 rounded-lg border p-4 transition-all ${
                theme === "system"
                  ? "border-purple-500 bg-purple-600/20"
                  : "border-[var(--sidebar-border)] hover:border-purple-500/50"
              }`}
            >
              <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-gray-900 via-gray-500 to-gray-50 border border-gray-500" />
              <span className="text-sm font-medium">Sistema</span>
            </button>
          </div>
        </div>

        {/* Logout Section */}
        <div className="rounded-xl border border-red-500/30 bg-red-950/20 p-6">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-between hover:bg-red-950/40 rounded-lg p-4 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-600/20 border border-red-500/30">
                <LogOut className="h-5 w-5 text-red-400" />
              </div>
              <div className="text-left">
                <h2 className="text-lg font-semibold text-red-400">Sair</h2>
                <p className="text-sm text-red-400/70">Encerrar sua sessão</p>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}
