"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Phone, Clock, AlertCircle } from "lucide-react"

export default function TrialExpiredPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkUser = async () => {
      const supabase = createClient()

      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        router.push("/login")
        return
      }

      setLoading(false)
    }

    checkUser()
  }, [router])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--app-bg)]">
        <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex h-screen items-center justify-center bg-[var(--app-bg)] p-4">
      <div className="max-w-md w-full bg-[var(--sidebar-bg)] rounded-lg shadow-xl p-8 text-center border border-[var(--sidebar-border)]">
        <div className="mb-6">
          <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-10 h-10 text-red-500" />
          </div>
          <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2">Período de Teste Expirado</h1>
          <p className="text-[var(--text-secondary)] mb-6">Seu período de teste de 7 dias chegou ao fim.</p>
        </div>

        <div className="bg-[var(--app-bg)] rounded-lg p-6 mb-6 border border-[var(--sidebar-border)]">
          <Clock className="w-8 h-8 text-purple-500 mx-auto mb-3" />
          <p className="text-[var(--text-secondary)] mb-4">
            Para continuar usando nossa plataforma, entre em contato conosco:
          </p>
          <div className="flex items-center justify-center gap-2 text-[var(--text-primary)] font-semibold text-xl">
            <Phone className="w-6 h-6 text-purple-500" />
            <a href="tel:+5511999999999" className="hover:text-purple-500 transition-colors">
              (11) 99999-9999
            </a>
          </div>
        </div>

        <button
          onClick={() => {
            const supabase = createClient()
            supabase.auth.signOut()
            router.push("/login")
          }}
          className="w-full bg-[var(--sidebar-bg)] text-[var(--text-primary)] py-3 rounded-lg hover:bg-[var(--app-bg)] transition-colors border border-[var(--sidebar-border)]"
        >
          Fazer Logout
        </button>
      </div>
    </div>
  )
}
