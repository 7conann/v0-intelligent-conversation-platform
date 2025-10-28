"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Smile } from "lucide-react"

interface EmojiPickerProps {
  value: string
  onChange: (emoji: string) => void
  className?: string
}

const EMOJI_CATEGORIES = {
  Pessoas: ["😀", "😃", "😄", "😁", "😅", "😂", "🤣", "😊", "😇", "🙂", "🙃", "😉", "😌", "😍", "🥰", "😘"],
  Objetos: ["💼", "📱", "💻", "⌚", "📷", "💡", "🔧", "🔨", "⚙️", "🔬", "🔭", "📡", "🎯", "🎨", "🎭", "🎪"],
  Símbolos: ["❤️", "💙", "💚", "💛", "🧡", "💜", "🖤", "🤍", "🤎", "💔", "❣️", "💕", "💞", "💓", "💗", "💖"],
  Negócios: ["💰", "💵", "💴", "💶", "💷", "💳", "💎", "⚖️", "🔑", "🗝️", "🔒", "🔓", "📊", "📈", "📉", "💹"],
  Comunicação: ["📧", "📨", "📩", "📤", "📥", "📦", "📫", "📪", "📬", "📭", "📮", "🗳️", "✉️", "📜", "📃", "📄"],
}

export function EmojiPicker({ value, onChange, className }: EmojiPickerProps) {
  const [showPicker, setShowPicker] = useState(false)

  return (
    <div className="relative">
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="👔"
          maxLength={2}
          className={`flex-1 px-3 py-2 rounded-lg bg-[var(--input-bg)] border border-[var(--sidebar-border)] text-[var(--text-primary)] ${className}`}
        />
        <Button
          type="button"
          onClick={() => setShowPicker(!showPicker)}
          variant="outline"
          className="border-[var(--sidebar-border)]"
        >
          <Smile className="h-4 w-4" />
        </Button>
      </div>

      {showPicker && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowPicker(false)} />
          <div className="absolute z-50 mt-2 p-4 bg-[var(--settings-bg)] border border-[var(--sidebar-border)] rounded-xl shadow-xl max-h-96 overflow-y-auto w-80">
            {Object.entries(EMOJI_CATEGORIES).map(([category, emojis]) => (
              <div key={category} className="mb-4">
                <h3 className="text-xs font-semibold text-[var(--text-secondary)] mb-2">{category}</h3>
                <div className="grid grid-cols-8 gap-2">
                  {emojis.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => {
                        onChange(emoji)
                        setShowPicker(false)
                      }}
                      className="text-2xl hover:bg-[var(--agent-hover)] rounded-lg p-2 transition-all hover:scale-110"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
