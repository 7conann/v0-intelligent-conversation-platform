"use client"

import { useState } from "react"
import { X, Moon, Sun } from "lucide-react"

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [email, setEmail] = useState(localStorage.getItem("userEmail") || "admin@workspace.com")
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "dark")

  if (!isOpen) return null

  const handleSaveEmail = () => {
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

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[var(--settings-bg)] border border-[var(--settings-border)] rounded-2xl w-full max-w-md p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-[var(--settings-text)]">Configurações</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-[var(--settings-button-bg)] hover:bg-[var(--settings-button-hover)] flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 text-[var(--settings-text)]" />
          </button>
        </div>

        {/* Theme Section */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-[var(--settings-text)] mb-3">Tema</h3>
          <div className="flex gap-2">
            <button
              onClick={() => handleThemeChange("dark")}
              className={`flex-1 py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-all ${
                theme === "dark"
                  ? "bg-purple-600 text-white"
                  : "bg-[var(--settings-button-bg)] text-[var(--settings-text-muted)] hover:bg-[var(--settings-button-hover)]"
              }`}
            >
              <Moon className="w-4 h-4" />
              Escuro
            </button>
            <button
              onClick={() => handleThemeChange("light")}
              className={`flex-1 py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-all ${
                theme === "light"
                  ? "bg-purple-600 text-white"
                  : "bg-[var(--settings-button-bg)] text-[var(--settings-text-muted)] hover:bg-[var(--settings-button-hover)]"
              }`}
            >
              <Sun className="w-4 h-4" />
              Claro
            </button>
          </div>
        </div>

        <div className="h-px bg-[var(--settings-border)] mb-6" />

        {/* Email Section */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-[var(--settings-text)] mb-3">Email</h3>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-2 rounded-lg bg-[var(--settings-input-bg)] border border-[var(--settings-border)] text-[var(--settings-text)] focus:outline-none focus:ring-2 focus:ring-purple-500"
            placeholder="seu@email.com"
          />
          <button
            onClick={handleSaveEmail}
            className="mt-2 w-full py-2 px-4 rounded-lg bg-purple-600 hover:bg-purple-700 text-white transition-colors"
          >
            Salvar Email
          </button>
        </div>

        <div className="h-px bg-[var(--settings-border)] mb-6" />

        {/* Password Section */}
        <div>
          <h3 className="text-sm font-medium text-[var(--settings-text)] mb-3">Alterar Senha</h3>
          <div className="space-y-3">
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-4 py-2 rounded-lg bg-[var(--settings-input-bg)] border border-[var(--settings-border)] text-[var(--settings-text)] focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Senha atual"
            />
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-4 py-2 rounded-lg bg-[var(--settings-input-bg)] border border-[var(--settings-border)] text-[var(--settings-text)] focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Nova senha"
            />
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2 rounded-lg bg-[var(--settings-input-bg)] border border-[var(--settings-border)] text-[var(--settings-text)] focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Confirmar nova senha"
            />
            <button
              onClick={handleSavePassword}
              className="w-full py-2 px-4 rounded-lg bg-purple-600 hover:bg-purple-700 text-white transition-colors"
            >
              Alterar Senha
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
