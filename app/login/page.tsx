"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"

export default function LoginPage() {
  const [activeTab, setActiveTab] = useState<"login" | "cadastro">("login")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      toast({
        title: "Login realizado com sucesso!",
        description: "Redirecionando para o chat...",
      })

      router.push("/chat")
    } catch (error: unknown) {
      toast({
        title: "Erro ao fazer login",
        description: error instanceof Error ? error.message : "Email ou senha incorretos",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || `${window.location.origin}/chat`,
          data: {
            display_name: displayName || email.split("@")[0],
          },
        },
      })

      if (error) throw error

      toast({
        title: "Conta criada com sucesso!",
        description: "Verifique seu email para confirmar sua conta.",
      })

      router.push("/auth/verify-email")
    } catch (error: unknown) {
      toast({
        title: "Erro ao criar conta",
        description: error instanceof Error ? error.message : "Ocorreu um erro",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Login Form */}
      <div className="w-1/2 bg-[#0a0a0f] flex items-center justify-center p-12">
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
                <path
                  d="M2 17L12 22L22 17"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M2 12L12 17L22 12"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-4xl font-bold text-center mb-2 bg-gradient-to-r from-blue-400 via-purple-400 to-blue-500 bg-clip-text text-transparent">
            WORKSPACE E+I
          </h1>
          <p className="text-center text-gray-400 mb-12 text-sm">Plataforma de Conversas Inteligentes Multiagente</p>

          {/* Tabs */}
          <div className="flex gap-2 mb-8 bg-gray-900/50 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab("login")}
              className={`flex-1 py-2.5 rounded-md font-medium transition-all cursor-pointer text-sm ${
                activeTab === "login"
                  ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg"
                  : "text-gray-400 hover:text-gray-300"
              }`}
            >
              Login
            </button>
            <button
              onClick={() => setActiveTab("cadastro")}
              className={`flex-1 py-2.5 rounded-md font-medium transition-all cursor-pointer text-sm ${
                activeTab === "cadastro"
                  ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg"
                  : "text-gray-400 hover:text-gray-300"
              }`}
            >
              Cadastro
            </button>
          </div>

          {activeTab === "login" ? (
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <Label htmlFor="email" className="text-gray-300 mb-2 block text-sm font-medium">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-gray-900/50 border-gray-800 text-white placeholder:text-gray-600 focus:border-purple-500 h-11"
                />
              </div>

              <div>
                <Label htmlFor="password" className="text-gray-300 mb-2 block text-sm font-medium">
                  Senha
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="bg-gray-900/50 border-gray-800 text-white placeholder:text-gray-600 focus:border-purple-500 h-11"
                />
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white h-11 text-base font-medium cursor-pointer shadow-lg shadow-purple-500/20"
              >
                {isLoading ? "Entrando..." : "Entrar"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleSignUp} className="space-y-5">
              <div>
                <Label htmlFor="displayName" className="text-gray-300 mb-2 block text-sm font-medium">
                  Nome
                </Label>
                <Input
                  id="displayName"
                  type="text"
                  placeholder="Seu nome"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="bg-gray-900/50 border-gray-800 text-white placeholder:text-gray-600 focus:border-purple-500 h-11"
                />
              </div>

              <div>
                <Label htmlFor="signup-email" className="text-gray-300 mb-2 block text-sm font-medium">
                  Email
                </Label>
                <Input
                  id="signup-email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-gray-900/50 border-gray-800 text-white placeholder:text-gray-600 focus:border-purple-500 h-11"
                />
              </div>

              <div>
                <Label htmlFor="signup-password" className="text-gray-300 mb-2 block text-sm font-medium">
                  Senha
                </Label>
                <Input
                  id="signup-password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="bg-gray-900/50 border-gray-800 text-white placeholder:text-gray-600 focus:border-purple-500 h-11"
                />
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white h-11 text-base font-medium cursor-pointer shadow-lg shadow-purple-500/20"
              >
                {isLoading ? "Criando conta..." : "Criar Conta"}
              </Button>
            </form>
          )}

          <button className="w-full text-center text-purple-400 hover:text-purple-300 mt-6 text-sm cursor-pointer">
            Esqueci minha senha
          </button>
        </div>
      </div>

      {/* Right Side - Branding */}
      <div className="w-1/2 bg-gradient-to-br from-purple-900 via-blue-900 to-purple-950 relative overflow-hidden flex items-center justify-center">
        <div className="absolute inset-0 opacity-20">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `
                linear-gradient(to right, rgba(139, 92, 246, 0.3) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(139, 92, 246, 0.3) 1px, transparent 1px)
              `,
              backgroundSize: "40px 40px",
            }}
          />
        </div>

        <div className="absolute top-20 left-20 w-64 h-64 bg-purple-500 rounded-full blur-3xl opacity-30 animate-pulse" />
        <div className="absolute bottom-20 right-20 w-80 h-80 bg-blue-500 rounded-full blur-3xl opacity-20 animate-pulse delay-1000" />

        <div className="relative z-10 text-center px-12 max-w-2xl">
          {/* Large logo */}
          <div className="flex justify-center mb-8">
            <div className="w-32 h-32 rounded-3xl bg-white/10 backdrop-blur-xl flex items-center justify-center border border-white/20 shadow-2xl">
              <svg viewBox="0 0 24 24" fill="none" className="w-20 h-20">
                <path
                  d="M12 2L2 7L12 12L22 7L12 2Z"
                  stroke="white"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M2 17L12 22L22 17"
                  stroke="white"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M2 12L12 17L22 12"
                  stroke="white"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>

          <h2 className="text-5xl font-bold text-white mb-6 leading-tight">
            Transforme decisões com inteligência artificial
          </h2>
          <p className="text-xl text-purple-200 leading-relaxed mb-12">
            Uma plataforma onde pessoas e IAs trabalham juntas para gerar, reusar e evoluir conhecimento organizacional.
          </p>

          <div className="flex flex-wrap gap-3 justify-center">
            <div className="px-6 py-3 bg-white/10 backdrop-blur-md rounded-full border border-white/20 text-white text-sm font-medium">
              12 Agentes Especializados
            </div>
            <div className="px-6 py-3 bg-white/10 backdrop-blur-md rounded-full border border-white/20 text-white text-sm font-medium">
              Conversas Interconectadas
            </div>
            <div className="px-6 py-3 bg-white/10 backdrop-blur-md rounded-full border border-white/20 text-white text-sm font-medium">
              Memória Inteligente
            </div>
          </div>
        </div>

        <div className="absolute top-10 right-10 w-2 h-2 bg-white rounded-full animate-ping" />
        <div className="absolute bottom-32 left-16 w-2 h-2 bg-purple-300 rounded-full animate-ping delay-500" />
        <div className="absolute top-1/3 right-1/4 w-1 h-1 bg-blue-300 rounded-full animate-ping delay-1000" />
      </div>
    </div>
  )
}
