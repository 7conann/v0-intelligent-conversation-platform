"use client"

import * as React from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

export interface ToastProps {
  id: string
  title?: string
  description?: string
  variant?: "default" | "success" | "error"
  duration?: number
}

interface ToastContextType {
  toasts: ToastProps[]
  addToast: (toast: Omit<ToastProps, "id">) => void
  removeToast: (id: string) => void
}

const ToastContext = React.createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastProps[]>([])

  const addToast = React.useCallback((toast: Omit<ToastProps, "id">) => {
    const id = Math.random().toString(36).substring(7)
    const newToast = { ...toast, id }
    setToasts((prev) => [...prev, newToast])

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, toast.duration || 3000)
  }, [])

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100000] flex flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              "min-w-[300px] rounded-lg border p-4 shadow-lg animate-in slide-in-from-right",
              "bg-gray-900 border-gray-700",
              toast.variant === "success" && "border-green-500/50 bg-green-950/50",
              toast.variant === "error" && "border-red-500/50 bg-red-950/50",
            )}
          >
            <div className="flex items-start gap-3">
              <div className="flex-1">
                {toast.title && <div className="font-semibold text-white mb-1">{toast.title}</div>}
                {toast.description && <div className="text-sm text-gray-300">{toast.description}</div>}
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-gray-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = React.useContext(ToastContext)
  if (!context) {
    throw new Error("useToast must be used within ToastProvider")
  }
  return context
}
