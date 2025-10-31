"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/components/ui/toast"
import { Eye, EyeOff } from "lucide-react"

export default function ResetPasswordPage() {
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isValidToken, setIsValidToken] = useState(false)
  const [isCheckingToken, setIsCheckingToken] = useState(true)
  const router = useRouter()
  const { addToast } = useToast()

  useEffect(() => {
    const checkToken = async () => {
      try {
        const supabase = createClient()
        const {
          data: { session },
        } = await supabase.auth.getSession()

        console.log("[v0] Reset password - checking session:", { hasSession: !!session })

        if (session) {
          setIsValidToken(true)
        } else {
          console.log("[v0] No valid session found for password reset")
          addToast({
            title: "Link inválido ou expirado",
            description: "Por favor, solicite um novo link de recuperação de senha.",
            variant: "error",
          })
          setTimeout(() => {
            router.push("/login")
          }, 3000)
        }
      } catch (error) {
        console.error("[v0] Error checking reset token:", error)
        addToast({
          title: "Erro ao verificar link",
          description: "Ocorreu um erro ao verificar o link de recuperação.",
          variant: "error",
        })
        setTimeout(() => {
          router.push("/login")
        }, 3000)
      } finally {
        setIsCheckingToken(false)
      }
    }

    checkToken()
  }, [router, addToast])

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()

    if (newPassword !== confirmPassword) {
      addToast({
        title: "Senhas não coincidem",
        description: "As senhas digitadas são diferentes",
        variant: "error",
      })
      return
    }

    if (newPassword.length < 6) {
      addToast({
        title: "Senha muito curta",
        description: "A senha deve ter pelo menos 6 caracteres",
        variant: "error",
      })
      return
    }

    setIsLoading(true)

    try {
      const supabase = createClient()

      console.log("[v0] Updating password...")

      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (error) {
        console.error("[v0] Error updating password:", error)
        addToast({
          title: "Erro ao redefinir senha",
          description: error.message,
          variant: "error",
        })
        return
      }

      console.log("[v0] Password updated successfully")
      addToast({
        title: "Senha redefinida!",
        description: "Sua senha foi alterada com sucesso. Redirecionando para o login...",
        variant: "success",
      })

      // Sign out the user after password reset
      await supabase.auth.signOut()

      setTimeout(() => {
        router.push("/login")
      }, 2000)
    } catch (err: any) {
      console.error("[v0] Unexpected error resetting password:", err)
      addToast({
        title: "Erro inesperado",
        description: err.message || "Ocorreu um erro ao redefinir a senha.",
        variant: "error",
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (isCheckingToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center mx-auto mb-4 animate-pulse">
            <svg viewBox="0 0 24 24" fill="none" className="w-10 h-10">
              <path
                d="M12 2L2 7L12 12L22 7L12 2Z"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path d="M2 17L12 22L22 17" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M2 12L12 17L22 12" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <p className="text-gray-400">Verificando link de recuperação...</p>
        </div>
      </div>
    )
  }

  if (!isValidToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
        <div className="text-center max-w-md px-6">
          <div className="w-16 h-16 rounded-2xl bg-red-500/20 flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Link Inválido</h1>
          <p className="text-gray-400 mb-4">
            Este link de recuperação de senha é inválido ou expirou. Por favor, solicite um novo link.
          </p>
          <Button
            onClick={() => router.push("/login")}
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white cursor-pointer"
          >
            Voltar para o Login
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f] p-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" className="w-10 h-10">
              <path
                d="M12 2L2 7L12 12L22 7L12 2Z"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path d="M2 17L12 22L22 17" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M2 12L12 17L22 12" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-center mb-2 text-white">Redefinir Senha</h1>
        <p className="text-center text-gray-400 mb-8">Digite sua nova senha abaixo</p>

        {/* Form */}
        <form onSubmit={handleResetPassword} className="space-y-5">
          <div>
            <Label htmlFor="new-password" className="text-gray-300 mb-2 block text-sm font-medium">
              Nova Senha
            </Label>
            <div className="relative">
              <Input
                id="new-password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="bg-gray-900/50 border-gray-800 text-white placeholder:text-gray-600 focus:border-purple-500 h-11 pr-10"
                required
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300 transition-colors"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div>
            <Label htmlFor="confirm-new-password" className="text-gray-300 mb-2 block text-sm font-medium">
              Confirmar Nova Senha
            </Label>
            <div className="relative">
              <Input
                id="confirm-new-password"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="bg-gray-900/50 border-gray-800 text-white placeholder:text-gray-600 focus:border-purple-500 h-11 pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300 transition-colors"
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white h-11 font-medium cursor-pointer shadow-lg shadow-purple-500/20"
          >
            {isLoading ? "Redefinindo..." : "Redefinir Senha"}
          </Button>
        </form>

        <button
          onClick={() => router.push("/login")}
          className="w-full text-center text-purple-400 hover:text-purple-300 mt-6 text-sm cursor-pointer"
        >
          Voltar para o login
        </button>
      </div>
    </div>
  )
}
