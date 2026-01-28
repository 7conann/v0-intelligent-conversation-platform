"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/components/ui/toast"
import { Eye, EyeOff, Sparkles, Brain, Zap } from "lucide-react"
import Image from "next/image"

export default function WhitelabelLoginPage() {
  const [activeTab, setActiveTab] = useState<"login" | "cadastro">("login")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [rememberMe, setRememberMe] = useState(true)
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isCheckingSession, setIsCheckingSession] = useState(true)
  const [emailNotConfirmed, setEmailNotConfirmed] = useState(false)
  const [pendingEmail, setPendingEmail] = useState("")
  const [isResendingEmail, setIsResendingEmail] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [displayName, setDisplayName] = useState("")
  const [phone, setPhone] = useState("")
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("")
  const [isSendingResetEmail, setIsSendingResetEmail] = useState(false)
  const router = useRouter()
  const { addToast } = useToast()

  useEffect(() => {
    const checkSession = async () => {
      try {
        const justLoggedOut = sessionStorage.getItem("just_logged_out")
        if (justLoggedOut === "true") {
          sessionStorage.removeItem("just_logged_out")
          setIsCheckingSession(false)
          return
        }

        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()

        if (session) {
          addToast({
            title: "Bem-vindo de volta!",
            description: "Redirecionando para o painel...",
            variant: "success",
          })
          window.location.href = "/chat/whitelabel"
        }
      } catch (error) {
        console.error("[v0] Error checking session:", error)
      } finally {
        setIsCheckingSession(false)
      }
    }

    checkSession()
  }, [addToast])

  if (isCheckingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#071209] via-[#0a1810] to-[#071209]">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Brain className="w-10 h-10 text-white" />
          </div>
          <p className="text-emerald-300">Verificando sessao...</p>
        </div>
      </div>
    )
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)
    setEmailNotConfirmed(false)

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      addToast({
        title: "Erro de configuracao",
        description: "Variaveis de ambiente nao configuradas.",
        variant: "error",
      })
      setIsLoading(false)
      return
    }

    addToast({
      title: "Autenticando...",
      description: "Verificando suas credenciais",
      variant: "default",
    })

    try {
      const supabase = createClient()
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })

      if (error) {
        if (error.message.includes("Email not confirmed") || error.message.includes("email_not_confirmed")) {
          setEmailNotConfirmed(true)
          setPendingEmail(email)
          addToast({
            title: "Email nao confirmado",
            description: "Verifique sua caixa de entrada e confirme seu email.",
            variant: "error",
          })
        } else {
          addToast({
            title: "Erro ao fazer login",
            description: error.message === "Invalid login credentials" ? "Email ou senha incorretos" : error.message,
            variant: "error",
          })
        }
        return
      }

      if (!data.user) {
        addToast({
          title: "Erro ao fazer login",
          description: "Nao foi possivel autenticar. Tente novamente.",
          variant: "error",
        })
        return
      }

      await supabase.from("profiles").update({ last_access: new Date().toISOString() }).eq("id", data.user.id)

      if (rememberMe) {
        localStorage.setItem("rememberMe", "true")
      } else {
        localStorage.removeItem("rememberMe")
      }

      addToast({
        title: "Login realizado!",
        description: "Redirecionando para o painel...",
        variant: "success",
      })

      sessionStorage.setItem("just_logged_out", "false")
      setTimeout(() => { window.location.href = "/chat/whitelabel" }, 500)
    } catch (err: any) {
      addToast({
        title: "Erro inesperado",
        description: err.message || "Ocorreu um erro ao fazer login.",
        variant: "error",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (password !== confirmPassword) {
      addToast({ title: "Senhas nao coincidem", description: "As senhas digitadas sao diferentes", variant: "error" })
      return
    }

    if (password.length < 6) {
      addToast({ title: "Senha muito curta", description: "A senha deve ter pelo menos 6 caracteres", variant: "error" })
      return
    }

    if (!email.includes("@")) {
      addToast({ title: "Email invalido", description: "Digite um email valido", variant: "error" })
      return
    }

    if (!phone || phone.length < 10) {
      addToast({ title: "Telefone invalido", description: "Digite um telefone valido com DDD", variant: "error" })
      return
    }

    setIsLoading(true)

    addToast({ title: "Criando conta...", description: "Aguarde enquanto processamos seu cadastro", variant: "default" })

    try {
      const supabase = createClient()
      const isLocalhost = typeof window !== "undefined" && window.location.hostname === "localhost"
      const productionUrl = "https://www.workspaceai.digital"
      const redirectUrl = isLocalhost
        ? process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || `${window.location.origin}/chat/whitelabel`
        : `${productionUrl}/chat/whitelabel`

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: { display_name: displayName || email.split("@")[0], phone: phone },
        },
      })

      if (error) {
        addToast({
          title: "Erro ao criar conta",
          description: error.message === "User already registered" ? "Este email ja esta cadastrado" : error.message,
          variant: "error",
        })
        return
      }

      if (data.user) {
        await supabase.from("profiles").update({ phone: phone, display_name: displayName || email.split("@")[0] }).eq("id", data.user.id)
      }

      addToast({ title: "Cadastro realizado!", description: "Verifique seu email para confirmar a conta.", variant: "success" })
      setActiveTab("login")
      setEmail("")
      setPassword("")
      setConfirmPassword("")
      setDisplayName("")
      setPhone("")
    } catch (err: any) {
      addToast({ title: "Erro inesperado", description: err.message || "Ocorreu um erro ao criar a conta.", variant: "error" })
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendConfirmation = async () => {
    if (!pendingEmail) return
    setIsResendingEmail(true)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.resend({ type: "signup", email: pendingEmail })

      if (error) {
        addToast({ title: "Erro ao reenviar email", description: error.message, variant: "error" })
      } else {
        addToast({ title: "Email reenviado!", description: "Verifique sua caixa de entrada e spam.", variant: "success" })
      }
    } catch (err: any) {
      addToast({ title: "Erro inesperado", description: err.message || "Nao foi possivel reenviar o email.", variant: "error" })
    } finally {
      setIsResendingEmail(false)
    }
  }

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!forgotPasswordEmail || !forgotPasswordEmail.includes("@")) {
      addToast({ title: "Email invalido", description: "Digite um email valido", variant: "error" })
      return
    }

    setIsSendingResetEmail(true)

    try {
      const supabase = createClient()
      const isLocalhost = typeof window !== "undefined" && window.location.hostname === "localhost"
      const productionUrl = "https://www.workspaceai.digital"
      const redirectUrl = isLocalhost
        ? process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || `${window.location.origin}/reset-password`
        : `${productionUrl}/reset-password`

      const { error } = await supabase.auth.resetPasswordForEmail(forgotPasswordEmail, { redirectTo: redirectUrl })

      if (error) {
        addToast({ title: "Erro ao enviar email", description: error.message, variant: "error" })
        return
      }

      addToast({ title: "Email enviado!", description: "Verifique sua caixa de entrada para redefinir sua senha.", variant: "success" })
      setShowForgotPassword(false)
      setForgotPasswordEmail("")
    } catch (err: any) {
      addToast({ title: "Erro inesperado", description: err.message || "Nao foi possivel enviar o email.", variant: "error" })
    } finally {
      setIsSendingResetEmail(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Left Side - Login Form */}
      <div className="w-full md:w-1/2 bg-[#071209] flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="flex justify-center mb-6 md:mb-8">
            <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center overflow-hidden">
              <Brain className="w-8 h-8 md:w-10 md:h-10 text-white" />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-2xl md:text-4xl font-bold text-center mb-2 bg-gradient-to-r from-emerald-400 via-emerald-400 to-emerald-500 bg-clip-text text-transparent">
            SUA MARCA AI
          </h1>
          <p className="text-center text-gray-400 mb-2 text-xs md:text-sm">
            Plataforma de IA personalizada para sua empresa
          </p>
          <p className="text-center text-emerald-400 mb-8 md:mb-12 text-xs md:text-sm font-semibold">
            Sua marca, sua inteligencia.
          </p>

          {/* Whitelabel Notice */}
          <div className="mb-6 bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-emerald-400 font-semibold mb-1">Versao Whitelabel</h3>
                <p className="text-emerald-200/80 text-sm">
                  Esta e uma demonstracao de como sua empresa pode ter uma plataforma de IA totalmente personalizada com sua marca, cores e logo.
                </p>
              </div>
            </div>
          </div>

          {/* Email confirmation banner */}
          {emailNotConfirmed && (
            <div className="mb-6 bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div className="flex-1">
                  <h3 className="text-amber-400 font-semibold mb-1">Email nao confirmado</h3>
                  <p className="text-amber-200/80 text-sm mb-3">
                    Confirme seu email antes de fazer login: <span className="font-medium">{pendingEmail}</span>
                  </p>
                  <button onClick={handleResendConfirmation} disabled={isResendingEmail} className="text-sm text-amber-400 hover:text-amber-300 underline disabled:opacity-50">
                    {isResendingEmail ? "Reenviando..." : "Reenviar email de confirmacao"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-2 mb-6 md:mb-8 bg-gray-900/50 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab("login")}
              className={`flex-1 py-2 md:py-2.5 rounded-md font-medium transition-all cursor-pointer text-xs md:text-sm ${
                activeTab === "login"
                  ? "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg"
                  : "text-gray-400 hover:text-gray-300"
              }`}
            >
              Login
            </button>
            <button
              onClick={() => setActiveTab("cadastro")}
              className={`flex-1 py-2 md:py-2.5 rounded-md font-medium transition-all cursor-pointer text-xs md:text-sm ${
                activeTab === "cadastro"
                  ? "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg"
                  : "text-gray-400 hover:text-gray-300"
              }`}
            >
              Cadastro
            </button>
          </div>

          {activeTab === "login" ? (
            <form onSubmit={handleLogin} className="space-y-4 md:space-y-5">
              <div>
                <Label htmlFor="email" className="text-gray-300 mb-1.5 md:mb-2 block text-xs md:text-sm font-medium">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-gray-900/50 border-gray-800 text-white placeholder:text-gray-600 focus:border-emerald-500 h-10 md:h-11 text-sm md:text-base"
                  required
                />
              </div>

              <div>
                <Label htmlFor="password" className="text-gray-300 mb-1.5 md:mb-2 block text-xs md:text-sm font-medium">Senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="********"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-gray-900/50 border-gray-800 text-white placeholder:text-gray-600 focus:border-emerald-500 h-10 md:h-11 text-sm md:text-base pr-10"
                    required
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300 transition-colors">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="remember"
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                  className="border-gray-700 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                />
                <Label htmlFor="remember" className="text-xs md:text-sm text-gray-300 cursor-pointer select-none">Manter conectado</Label>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-2.5 md:p-3">
                  <p className="text-red-400 text-xs md:text-sm">{error}</p>
                </div>
              )}

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white h-10 md:h-11 text-sm md:text-base font-medium cursor-pointer shadow-lg shadow-emerald-500/20"
              >
                {isLoading ? "Entrando..." : "Entrar"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4 md:space-y-5">
              <div>
                <Label htmlFor="register-email" className="text-gray-300 mb-1.5 md:mb-2 block text-xs md:text-sm font-medium">Email</Label>
                <Input
                  id="register-email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-gray-900/50 border-gray-800 text-white placeholder:text-gray-600 focus:border-emerald-500 h-10 md:h-11 text-sm md:text-base"
                  required
                />
              </div>

              <div>
                <Label htmlFor="display-name" className="text-gray-300 mb-1.5 md:mb-2 block text-xs md:text-sm font-medium">Nome</Label>
                <Input
                  id="display-name"
                  type="text"
                  placeholder="Seu nome"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="bg-gray-900/50 border-gray-800 text-white placeholder:text-gray-600 focus:border-emerald-500 h-10 md:h-11 text-sm md:text-base"
                />
              </div>

              <div>
                <Label htmlFor="phone" className="text-gray-300 mb-1.5 md:mb-2 block text-xs md:text-sm font-medium">Telefone</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="(11) 99999-9999"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="bg-gray-900/50 border-gray-800 text-white placeholder:text-gray-600 focus:border-emerald-500 h-10 md:h-11 text-sm md:text-base"
                  required
                />
              </div>

              <div>
                <Label htmlFor="register-password" className="text-gray-300 mb-1.5 md:mb-2 block text-xs md:text-sm font-medium">Senha</Label>
                <div className="relative">
                  <Input
                    id="register-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="********"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-gray-900/50 border-gray-800 text-white placeholder:text-gray-600 focus:border-emerald-500 h-10 md:h-11 text-sm md:text-base pr-10"
                    required
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300 transition-colors">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <Label htmlFor="confirm-password" className="text-gray-300 mb-1.5 md:mb-2 block text-xs md:text-sm font-medium">Confirmar Senha</Label>
                <div className="relative">
                  <Input
                    id="confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="********"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="bg-gray-900/50 border-gray-800 text-white placeholder:text-gray-600 focus:border-emerald-500 h-10 md:h-11 text-sm md:text-base pr-10"
                    required
                  />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300 transition-colors">
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-2.5 md:p-3">
                  <p className="text-red-400 text-xs md:text-sm">{error}</p>
                </div>
              )}

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white h-10 md:h-11 text-sm md:text-base font-medium cursor-pointer shadow-lg shadow-emerald-500/20"
              >
                {isLoading ? "Criando conta..." : "Criar Conta"}
              </Button>
            </form>
          )}

          <button onClick={() => setShowForgotPassword(true)} type="button" className="w-full text-center text-emerald-400 hover:text-emerald-300 mt-4 md:mt-6 text-xs md:text-sm cursor-pointer">
            Esqueci minha senha
          </button>
        </div>
      </div>

      {/* Right Side - Branding */}
      <div className="hidden md:flex md:w-1/2 bg-gradient-to-br from-emerald-900 via-emerald-800 to-emerald-950 relative overflow-hidden items-center justify-center">
        {/* Animated background grid */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `linear-gradient(to right, rgba(16, 185, 129, 0.3) 1px, transparent 1px), linear-gradient(to bottom, rgba(16, 185, 129, 0.3) 1px, transparent 1px)`,
            backgroundSize: "40px 40px",
            }}
          />
        </div>

        {/* Glowing orbs */}
        <div className="absolute top-20 left-20 w-64 h-64 bg-emerald-500 rounded-full blur-3xl opacity-30 animate-pulse" />
        <div className="absolute bottom-32 left-16 w-80 h-80 bg-cyan-500 rounded-full blur-3xl opacity-20 animate-pulse delay-500" />
        <div className="absolute top-1/3 right-1/4 w-1 h-1 bg-cyan-300 rounded-full animate-ping delay-1000" />

        {/* Content */}
        <div className="relative z-10 text-center px-12 max-w-2xl">
          {/* Large logo */}
          <div className="flex justify-center mb-8">
            <div className="w-32 h-32 rounded-3xl bg-white/10 backdrop-blur-xl flex items-center justify-center border border-white/20 shadow-2xl overflow-hidden">
              <Image src="/whitelabel-logo.jpg" alt="Whitelabel Logo" width={128} height={128} className="w-full h-full object-cover" />
            </div>
          </div>

          <h2 className="text-5xl font-bold text-white mb-6 leading-tight">
            Sua plataforma de IA com a identidade da sua empresa
          </h2>
          <p className="text-xl text-blue-200 leading-relaxed mb-12">
            Tenha sua propria versao da plataforma com cores, logos e dominio personalizados. Oferea uma experiencia unica aos seus colaboradores.
          </p>

          <div className="flex flex-wrap gap-3 justify-center">
            <div className="px-6 py-3 bg-white/10 backdrop-blur-md rounded-full border border-white/20 text-white text-sm font-medium flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-300" />
              Marca Personalizada
            </div>
            <div className="px-6 py-3 bg-white/10 backdrop-blur-md rounded-full border border-white/20 text-white text-sm font-medium flex items-center gap-2">
              <Brain className="w-4 h-4 text-cyan-300" />
              Agentes Exclusivos
            </div>
            <div className="px-6 py-3 bg-white/10 backdrop-blur-md rounded-full border border-white/20 text-white text-sm font-medium flex items-center gap-2">
              <Zap className="w-4 h-4 text-emerald-300" />
              Dominio Proprio
            </div>
          </div>
        </div>
      </div>

      {showForgotPassword && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#071209] border border-gray-800 rounded-2xl p-6 md:p-8 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl md:text-2xl font-bold text-white">Recuperar Senha</h2>
              <button onClick={() => { setShowForgotPassword(false); setForgotPasswordEmail("") }} className="text-gray-400 hover:text-gray-300 transition-colors">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="text-gray-400 text-sm mb-6">Digite seu email e enviaremos um link para redefinir sua senha.</p>

            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <Label htmlFor="forgot-email" className="text-gray-300 mb-2 block text-sm font-medium">Email</Label>
                <Input
                  id="forgot-email"
                  type="email"
                  placeholder="seu@email.com"
                  value={forgotPasswordEmail}
                  onChange={(e) => setForgotPasswordEmail(e.target.value)}
                  className="bg-gray-900/50 border-gray-800 text-white placeholder:text-gray-600 focus:border-emerald-500 h-11"
                  required
                  autoFocus
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="button" onClick={() => { setShowForgotPassword(false); setForgotPasswordEmail("") }} className="flex-1 bg-gray-800 hover:bg-gray-700 text-white h-11 cursor-pointer">
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSendingResetEmail} className="flex-1 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white h-11 cursor-pointer shadow-lg shadow-emerald-500/20">
                  {isSendingResetEmail ? "Enviando..." : "Enviar Link"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
