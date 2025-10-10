"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function LoginPage() {
  const [activeTab, setActiveTab] = useState<"login" | "cadastro">("login")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const router = useRouter()

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()

    // Fixed login credentials
    if (email === "admin@workspace.com" && password === "admin123") {
      localStorage.setItem("authenticated", "true")
      router.push("/chat")
    } else {
      setError("Email ou senha incorretos")
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

          {/* Form */}
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
                className="bg-gray-900/50 border-gray-800 text-white placeholder:text-gray-600 focus:border-purple-500 h-11"
              />
            </div>

            {error && (
              <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3">
                <p className="text-purple-400 text-sm">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white h-11 text-base font-medium cursor-pointer shadow-lg shadow-purple-500/20"
            >
              Entrar
            </Button>
          </form>

          <button className="w-full text-center text-purple-400 hover:text-purple-300 mt-6 text-sm cursor-pointer">
            Esqueci minha senha
          </button>

          {/* Login hint */}
          <div className="mt-8 text-center text-gray-600 text-xs">Use: admin@workspace.com / admin123</div>
        </div>
      </div>

      {/* Right Side - Branding */}
      <div className="w-1/2 bg-gradient-to-br from-purple-900 via-blue-900 to-purple-950 relative overflow-hidden flex items-center justify-center">
        {/* Animated background grid */}
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

        {/* Glowing orbs */}
        <div className="absolute top-20 left-20 w-64 h-64 bg-purple-500 rounded-full blur-3xl opacity-30 animate-pulse" />
        <div className="absolute bottom-20 right-20 w-80 h-80 bg-blue-500 rounded-full blur-3xl opacity-20 animate-pulse delay-1000" />

        {/* Content */}
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

          {/* Feature pills */}
          <div className="flex flex-wrap gap-3 justify-center">
            <div className="px-6 py-3 bg-white/10 backdrop-blur-md rounded-full border border-white/20 text-white text-sm font-medium">
              6 Agentes Especializados
            </div>
            <div className="px-6 py-3 bg-white/10 backdrop-blur-md rounded-full border border-white/20 text-white text-sm font-medium">
              Conversas Interconectadas
            </div>
            <div className="px-6 py-3 bg-white/10 backdrop-blur-md rounded-full border border-white/20 text-white text-sm font-medium">
              Memória Inteligente
            </div>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute top-10 right-10 w-2 h-2 bg-white rounded-full animate-ping" />
        <div className="absolute bottom-32 left-16 w-2 h-2 bg-purple-300 rounded-full animate-ping delay-500" />
        <div className="absolute top-1/3 right-1/4 w-1 h-1 bg-blue-300 rounded-full animate-ping delay-1000" />
      </div>
    </div>
  )
}
