"use client"

import { Button } from "@/components/ui/button"

interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  variant?: "default" | "destructive"
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  variant = "default",
}: ConfirmDialogProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--settings-bg)] rounded-xl border border-[var(--sidebar-border)] max-w-md w-full p-6">
        <h2 className="text-xl font-bold text-[var(--text-primary)] mb-3">{title}</h2>
        <p className="text-sm text-[var(--text-secondary)] mb-6 whitespace-pre-line">{description}</p>
        <div className="flex gap-3">
          <Button onClick={onClose} variant="outline" className="flex-1 bg-transparent">
            {cancelText}
          </Button>
          <Button
            onClick={() => {
              onConfirm()
              onClose()
            }}
            className={`flex-1 ${
              variant === "destructive"
                ? "bg-red-600 hover:bg-red-700"
                : "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500"
            }`}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  )
}
