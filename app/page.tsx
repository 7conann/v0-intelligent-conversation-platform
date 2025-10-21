"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Users, MessageSquare, Zap } from "lucide-react"

export default function LandingPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-6xl">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-900/50 to-blue-900/50 flex items-center justify-center border border-purple-500/30">
            <div className="w-14 h-14 relative">
              <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
                <path
                  d="M12 2L2 7L12 12L22 7L12 2Z"
                  stroke="url(#gradient1)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M2 17L12 22L22 17"
                  stroke="url(#gradient1)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M2 12L12 17L22 12"
                  stroke="url(#gradient1)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <defs>
                  <linearGradient id="gradient1" x1="2" y1="2" x2="22" y2="22">
                    <stop offset="0%" stopColor="#a78bfa" />
                    <stop offset="100%" stopColor="#60a5fa" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </div>
        </div>

        <h1 className="text-6xl md:text-7xl font-bold text-center mb-4 bg-gradient-to-r from-blue-400 via-purple-400 to-blue-500 bg-clip-text text-transparent">
          WORKSPACE AI
        </h1>
        <p className="text-center text-gray-300 text-xl mb-2">Plataforma de conversas inteligentes, multiagente</p>
        <p className="text-center text-purple-400 text-lg mb-6 font-semibold">Empresas mais inteligentes.</p>

        <p className="text-center text-gray-400 max-w-3xl mx-auto mb-12 text-lg leading-relaxed">
          Transforme conhecimento em decisões estratégicas com inteligência artificial. Uma plataforma onde pessoas e
          IAs trabalham juntas para gerar conhecimento, fortalecer a cultura e evoluir no compartilhamento do
          conhecimento e na prática organizacional.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-20">
          <Button
            onClick={() => router.push("/login")}
            className="bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white px-8 py-6 text-lg font-medium cursor-pointer"
          >
            Começar Agora
          </Button>
          <Button
            onClick={() => router.push("/login")}
            variant="outline"
            className="border-2 border-gray-700 bg-transparent hover:bg-gray-800/50 text-white hover:text-white px-8 py-6 text-lg font-medium cursor-pointer"
          >
            Fazer Login
          </Button>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {/* Card 1 */}
          <div className="border border-gray-800 rounded-2xl p-8 bg-gradient-to-b from-gray-900/50 to-gray-950/50 backdrop-blur text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-900/50 to-purple-800/50 flex items-center justify-center mx-auto mb-6 border border-purple-500/30">
              <Users className="w-8 h-8 text-purple-400" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-4">Mais de 40 Agentes Especializados</h3>
            <p className="text-gray-400 leading-relaxed">
              Clones personalizados, conversas interconectadas e memória inteligente trabalhando em conjunto
            </p>
          </div>

          {/* Card 2 */}
          <div className="border border-gray-800 rounded-2xl p-8 bg-gradient-to-b from-gray-900/50 to-gray-950/50 backdrop-blur text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-900/50 to-cyan-800/50 flex items-center justify-center mx-auto mb-6 border border-cyan-500/30">
              <MessageSquare className="w-8 h-8 text-cyan-400" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-4">Conversas Interconectadas</h3>
            <p className="text-gray-400 leading-relaxed">
              Reuse contextos entre conversas e construa conhecimento incremental
            </p>
          </div>

          {/* Card 3 */}
          <div className="border border-gray-800 rounded-2xl p-8 bg-gradient-to-b from-gray-900/50 to-gray-950/50 backdrop-blur text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-900/50 to-pink-900/50 flex items-center justify-center mx-auto mb-6 border border-purple-500/30">
              <Zap className="w-8 h-8 text-purple-400" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-4">Memória Inteligente</h3>
            <p className="text-gray-400 leading-relaxed">
              Histórico organizacional que evolui e se expande a cada interação
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
