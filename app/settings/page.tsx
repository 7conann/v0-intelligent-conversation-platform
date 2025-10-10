"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Moon, Sun, ArrowLeft, LogOut, Mail, Lock } from "lucide-react"

export default function SettingsPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [theme, setTheme] = useState("dark")

  useEffect(() => {
    const isAuthenticated = localStorage.getItem("authenticated")
    if (!isAuthenticated) {
      router.push("/")
      return
    }

    setEmail(localStorage.getItem("userEmail") || "admin@workspace.com")
    setTheme(localStorage.getItem("theme") || "dark")
  }, [router])

  const handleSaveEmail = () => {
    if (!email || !email.includes("@")) {
      alert("Por favor, insira um email válido!")
      return
    }
    localStorage.setItem("userEmail", email)
    alert("Email atualizado com sucesso!")
  }

  const handleSavePassword = () => {
    if (newPassword !== confirmPassword) {
      alert("As senhas não coincidem!")
      return
    }
    if (newPassword.length < 6) {
      alert("A senha deve ter pelo menos 6 caracteres!")
      return
    }
    localStorage.setItem("userPassword", newPassword)
    setCurrentPassword("")
    setNewPassword("")
    setConfirmPassword("")
    alert("Senha atualizada com sucesso!")
  }

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme)
    localStorage.setItem("theme", newTheme)
    document.documentElement.classList.toggle("light", newTheme === "light")
  }

  const handleLogout = () => {
    localStorage.removeItem("authenticated")
    router.push("/login")
  }

  return (
    <div className="min-h-screen bg-[var(--app-bg)] p-8">
<div class="w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-12">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/chat")}
              className="w-10 h-10 rounded-lg bg-[var(--sidebar-bg)] border border-[var(--border-color)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-purple-500/50 transition-all cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-[var(--text-primary)]">Configurações</h1>
              <p className="text-sm text-[var(--text-secondary)]">Gerencie suas preferências e conta</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[var(--sidebar-bg)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:border-purple-500/50 hover:text-purple-400 transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </div>

        {/* Theme Section */}
        <section className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            {theme === "dark" ? (
              <Moon className="w-5 h-5 text-purple-400" />
            ) : (
              <Sun className="w-5 h-5 text-purple-400" />
            )}
            <div>
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">Aparência</h2>
              <p className="text-sm text-[var(--text-secondary)]">Escolha o tema da interface</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => handleThemeChange("dark")}
              className={`flex-1 py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer border ${
                theme === "dark"
                  ? "bg-purple-600/20 border-purple-500 text-purple-400"
                  : "bg-[var(--sidebar-bg)] border-[var(--border-color)] text-[var(--text-secondary)] hover:border-purple-500/30"
              }`}
            >
              <Moon className="w-5 h-5" />
              Modo Escuro
            </button>
            <button
              onClick={() => handleThemeChange("light")}
              className={`flex-1 py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer border ${
                theme === "light"
                  ? "bg-purple-600/20 border-purple-500 text-purple-400"
                  : "bg-[var(--sidebar-bg)] border-[var(--border-color)] text-[var(--text-secondary)] hover:border-purple-500/30"
              }`}
            >
              <Sun className="w-5 h-5" />
              Modo Claro
            </button>
          </div>
        </section>

        <div className="h-px bg-[var(--border-color)] mb-8" />

        {/* Email Section */}
        <section className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Mail className="w-5 h-5 text-blue-400" />
            <div>
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">Email</h2>
              <p className="text-sm text-[var(--text-secondary)]">Atualize seu endereço de email</p>
            </div>
          </div>
          <div className="space-y-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-[var(--sidebar-bg)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-purple-500 transition-all"
              placeholder="seu@email.com"
            />
            <button
              onClick={handleSaveEmail}
              className="px-6 py-2.5 rounded-lg bg-purple-600/20 border border-purple-500 text-purple-400 hover:bg-purple-600/30 transition-all cursor-pointer"
            >
              Salvar Email
            </button>
          </div>
        </section>

        <div className="h-px bg-[var(--border-color)] mb-8" />

        {/* Password Section */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <Lock className="w-5 h-5 text-purple-400" />
            <div>
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">Senha</h2>
              <p className="text-sm text-[var(--text-secondary)]">Altere sua senha de acesso</p>
            </div>
          </div>
          <div className="space-y-3">
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-[var(--sidebar-bg)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-purple-500 transition-all"
              placeholder="Senha atual"
            />
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-[var(--sidebar-bg)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-purple-500 transition-all"
              placeholder="Nova senha"
            />
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-[var(--sidebar-bg)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-purple-500 transition-all"
              placeholder="Confirmar nova senha"
            />
            <button
              onClick={handleSavePassword}
              className="px-6 py-2.5 rounded-lg bg-purple-600/20 border border-purple-500 text-purple-400 hover:bg-purple-600/30 transition-all cursor-pointer"
            >
              Alterar Senha
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}
