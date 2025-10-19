"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { X } from "lucide-react"

interface PhoneModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (phone: string) => Promise<void>
}

export function PhoneModal({ isOpen, onClose, onSubmit }: PhoneModalProps) {
  const [phone, setPhone] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!phone || phone.length < 10) {
      alert("Digite um telefone válido com DDD")
      return
    }

    setIsSubmitting(true)
    try {
      await onSubmit(phone)
      onClose()
    } catch (error) {
      console.error("[v0] Error submitting phone:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-[var(--sidebar-bg)] border border-[var(--sidebar-border)] rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-[var(--text-primary)]">Atualize seu cadastro</h2>
          <button
            onClick={onClose}
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-[var(--text-secondary)] mb-6">
          Para continuar usando a plataforma, precisamos que você cadastre seu número de telefone.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="phone-modal" className="text-[var(--text-primary)] mb-2 block">
              Telefone
            </Label>
            <Input
              id="phone-modal"
              type="tel"
              placeholder="(11) 99999-9999"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="bg-[var(--app-bg)] border-[var(--sidebar-border)] text-[var(--text-primary)]"
              required
            />
          </div>

          <Button type="submit" disabled={isSubmitting} className="w-full bg-purple-600 hover:bg-purple-700 text-white">
            {isSubmitting ? "Salvando..." : "Salvar"}
          </Button>
        </form>
      </div>
    </div>
  )
}
