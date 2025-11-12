"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, User, Building2, Palette, LogOut, Mail, Users, Trash2, AlertTriangle } from "lucide-react"
import { useToast } from "@/components/ui/toast"
import { createClient } from "@/lib/supabase/client"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

const AUTHORIZED_EMAILS = ["kleber.zumiotti@iprocesso.com", "angelomarchi05@gmail.com"]

export default function ProfilePage() {
  const router = useRouter()
  const { addToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [displayName, setDisplayName] = useState("")
  const [avatarUrl, setAvatarUrl] = useState("")
  const [theme, setTheme] = useState("dark")
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [resetDialogOpen, setResetDialogOpen] = useState(false)

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
        setDisplayName(profile.display_name || "")
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
      display_name: displayName,
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

    window.location.reload()

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
    console.log("[v0] Logout initiated")
    const supabase = createClient()

    sessionStorage.setItem("just_logged_out", "true")

    try {
      const { error } = await supabase.auth.signOut()

      if (error) {
        console.error("[v0] Error during signOut:", error)
      }

      console.log("[v0] SignOut completed, clearing storage")
    } catch (err) {
      console.error("[v0] Exception during signOut:", err)
    }

    try {
      // Clear Supabase auth tokens
      localStorage.removeItem("supabase.auth.token")
      localStorage.removeItem("sb-access-token")
      localStorage.removeItem("sb-refresh-token")

      // Clear all localStorage except the logout flag
      const logoutFlag = sessionStorage.getItem("just_logged_out")
      localStorage.clear()
      sessionStorage.clear()
      sessionStorage.setItem("just_logged_out", logoutFlag || "true")

      console.log("[v0] Storage cleared")
    } catch (err) {
      console.error("[v0] Error clearing storage:", err)
    }

    addToast({
      title: "Logout realizado",
      description: "Até logo!",
      variant: "success",
    })

    console.log("[v0] Redirecting to /login")
    setTimeout(() => {
      window.location.href = "/login"
    }, 300)
  }

  const handleResetDataClick = () => {
    setResetDialogOpen(true)
  }

  const handleResetData = async () => {
    console.log("[v0] 🗑️ Reset data initiated")
    setResetDialogOpen(false)
    const supabase = createClient()

    try {
      // 1. Sign out from Supabase
      await supabase.auth.signOut()
      console.log("[v0] ✅ Signed out from Supabase")
    } catch (err) {
      console.error("[v0] ❌ Error signing out:", err)
    }

    try {
      // 2. Clear all localStorage
      localStorage.clear()
      console.log("[v0] ✅ localStorage cleared")

      // 3. Clear all sessionStorage
      sessionStorage.clear()
      console.log("[v0] ✅ sessionStorage cleared")

      // 4. Clear all cookies
      document.cookie.split(";").forEach((cookie) => {
        const name = cookie.split("=")[0].trim()
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname};`
      })
      console.log("[v0] ✅ Cookies cleared")

      // 5. Clear Service Workers cache if available
      if ("caches" in window) {
        const cacheNames = await caches.keys()
        await Promise.all(cacheNames.map((name) => caches.delete(name)))
        console.log("[v0] ✅ Service Worker cache cleared")
      }

      // 6. Unregister Service Workers
      if ("serviceWorker" in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations()
        await Promise.all(registrations.map((reg) => reg.unregister()))
        console.log("[v0] ✅ Service Workers unregistered")
      }

      addToast({
        title: "Dados resetados",
        description: "Todos os dados locais foram apagados. Redirecionando...",
        variant: "success",
      })

      console.log("[v0] ✅ All data cleared, redirecting to login")

      // 7. Reload and redirect to login
      setTimeout(() => {
        window.location.href = "/login"
      }, 1000)
    } catch (err) {
      console.error("[v0] ❌ Error during reset:", err)
      addToast({
        title: "Erro ao resetar",
        description: "Ocorreu um erro ao limpar os dados",
        variant: "error",
      })
    }
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

  const avatarAlt = displayName || user?.email || "Logo"

  return (
    <div className="min-h-screen bg-[var(--app-bg)] text-[var(--text-primary)]">
      <div className="border-b border-[var(--sidebar-border)] bg-[var(--chat-header-bg)] px-6 py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.push("/chat")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{user?.email}</h1>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
          </div>
          <Avatar className="h-16 w-16">
            <AvatarImage src={avatarUrl || "/iredondo.png"} alt={avatarAlt} />
            <AvatarFallback className="bg-gradient-to-br from-purple-600 to-blue-600 text-white text-xl">
              {(displayName || user?.email || "U").charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>

      <div className="mx-auto max-w-4xl p-6 space-y-6">
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
              <Label htmlFor="displayName">Nome de exibição</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
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

        <div className="rounded-xl border border-orange-500/30 bg-orange-950/20 p-6">
          <button
            onClick={handleResetDataClick}
            className="w-full flex items-center justify-between hover:bg-orange-950/40 rounded-lg p-4 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-600/20 border border-orange-500/30">
                <Trash2 className="h-5 w-5 text-orange-400" />
              </div>
              <div className="text-left">
                <h2 className="text-lg font-semibold text-orange-400">Resetar Dados</h2>
                <p className="text-sm text-orange-400/70">Limpar cache, cookies e localStorage</p>
              </div>
            </div>
          </button>
        </div>

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

      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-orange-600/20 border border-orange-500/30">
                <AlertTriangle className="h-6 w-6 text-orange-400" />
              </div>
              <DialogTitle className="text-xl">Resetar Dados</DialogTitle>
            </div>
          </DialogHeader>
          <div className="text-muted-foreground text-base leading-relaxed pt-2 px-6">
            <p className="mb-3">Esta ação irá:</p>
            <ul className="list-disc list-inside space-y-2 text-orange-400/90">
              <li>Apagar todo o localStorage</li>
              <li>Apagar todo o sessionStorage</li>
              <li>Limpar todos os cookies</li>
              <li>Limpar o cache do navegador</li>
              <li>Deslogar você da conta</li>
            </ul>
            <p className="mt-4 font-semibold text-orange-400">Esta ação não pode ser desfeita!</p>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setResetDialogOpen(false)}
              className="border-[var(--sidebar-border)]"
            >
              Cancelar
            </Button>
            <Button onClick={handleResetData} className="bg-orange-600 hover:bg-orange-500 text-white">
              Confirmar Reset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
