"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"

interface IconPickerProps {
  value: string
  onChange: (icon: string) => void
  className?: string
}

const EMOJI_OPTIONS = [
  // Business & Office
  "📁",
  "📂",
  "📊",
  "📈",
  "📉",
  "💼",
  "🎯",
  "🚀",
  "💡",
  "⚡",
  "🔥",
  "⭐",
  "🌟",
  "💎",
  "🏆",
  "📋",
  "📌",
  "📍",
  "📎",
  "🖇️",
  "📏",
  "📐",
  "✂️",
  "🗃️",
  "🗄️",
  "🗂️",

  // Technology
  "💻",
  "🖥️",
  "⌨️",
  "🖱️",
  "🖲️",
  "💾",
  "💿",
  "📀",
  "🔌",
  "🔋",
  "📱",
  "📞",
  "☎️",
  "📟",
  "📠",
  "📺",
  "📻",
  "🎙️",
  "🎚️",
  "🎛️",
  "🧭",
  "⏱️",
  "⏲️",
  "⏰",
  "🕰️",
  "⌛",
  "⏳",
  "📡",
  "🛰️",

  // Communication
  "✉️",
  "📧",
  "📨",
  "📩",
  "📤",
  "📥",
  "📦",
  "📫",
  "📪",
  "📬",
  "📭",
  "📮",
  "🗳️",
  "✏️",
  "✒️",
  "🖋️",
  "🖊️",
  "🖌️",
  "🖍️",
  "📝",
  "💬",
  "💭",
  "🗨️",
  "🗯️",

  // Money & Finance
  "💰",
  "💴",
  "💵",
  "💶",
  "💷",
  "💸",
  "💳",
  "🧾",
  "💹",
  "🏦",
  "🏧",
  "📊",
  "📈",
  "📉",

  // Tools & Settings
  "🔧",
  "🔨",
  "⚒️",
  "🛠️",
  "⛏️",
  "🔩",
  "⚙️",
  "🧰",
  "🧲",
  "⚖️",
  "🔗",
  "⛓️",
  "🧱",

  // Security & Protection
  "🔒",
  "🔓",
  "🔐",
  "🔑",
  "🗝️",
  "🛡️",
  "🔰",
  "⚠️",
  "🚸",
  "⛔",
  "🚫",
  "🚳",
  "🚭",
  "🚯",
  "🚱",

  // Navigation & Location
  "🧭",
  "🗺️",
  "🚩",
  "🏁",
  "🚁",
  "✈️",
  "🚀",
  "🛸",
  "🚂",
  "🚃",
  "🚄",
  "🚅",
  "🚆",
  "🚇",
  "🚈",
  "🚉",
  "🚊",
  "🚝",
  "🚞",
  "🚋",
  "🚌",
  "🚍",
  "🚎",
  "🚐",
  "🚑",
  "🚒",
  "🚓",
  "🚔",
  "🚕",
  "🚖",

  // Nature & Weather
  "🌍",
  "🌎",
  "🌏",
  "🌐",
  "🗺️",
  "🏔️",
  "⛰️",
  "🌋",
  "🗻",
  "🏕️",
  "🏖️",
  "🏜️",
  "🏝️",
  "🏞️",
  "☀️",
  "🌤️",
  "⛅",
  "🌥️",
  "☁️",
  "🌦️",
  "🌧️",
  "⛈️",
  "🌩️",
  "🌨️",
  "❄️",
  "☃️",
  "⛄",
  "🌬️",
  "💨",
  "🌪️",
  "🌫️",
  "🌈",
  "☔",
  "⚡",
  "⭐",
  "🌟",
  "✨",
  "💫",
  "🌙",
  "☄️",

  // Plants & Food
  "🌱",
  "🌿",
  "☘️",
  "🍀",
  "🌾",
  "🌵",
  "🌴",
  "🌳",
  "🌲",
  "🌰",
  "🍁",
  "🍂",
  "🍃",
  "🍇",
  "🍈",
  "🍉",
  "🍊",
  "🍋",
  "🍌",
  "🍍",
  "🥭",
  "🍎",
  "🍏",
  "🍐",
  "🍑",
  "🍒",
  "🍓",
  "🥝",
  "🍅",
  "🥥",
  "🥑",
  "🍆",
  "🥔",
  "🥕",
  "🌽",
  "🌶️",
  "🥒",
  "🥬",
  "🥦",

  // Animals
  "🐶",
  "🐱",
  "🐭",
  "🐹",
  "🐰",
  "🦊",
  "🐻",
  "🐼",
  "🐨",
  "🐯",
  "🦁",
  "🐮",
  "🐷",
  "🐸",
  "🐵",
  "🐔",
  "🐧",
  "🐦",
  "🐤",
  "🐣",
  "🐥",
  "🦆",
  "🦅",
  "🦉",
  "🦇",
  "🐺",
  "🐗",
  "🐴",
  "🦄",
  "🐝",
  "🐛",
  "🦋",
  "🐌",
  "🐞",
  "🐜",
  "🦟",
  "🦗",
  "🕷️",
  "🕸️",
  "🦂",
  "🐢",
  "🐍",
  "🦎",
  "🦖",
  "🦕",

  // Sports & Activities
  "⚽",
  "🏀",
  "🏈",
  "⚾",
  "🥎",
  "🎾",
  "🏐",
  "🏉",
  "🥏",
  "🎱",
  "🪀",
  "🏓",
  "🏸",
  "🏒",
  "🏑",
  "🥍",
  "🏏",
  "🥅",
  "⛳",
  "🪁",
  "🏹",
  "🎣",
  "🤿",
  "🥊",
  "🥋",
  "🎽",
  "🛹",
  "🛼",
  "🛷",
  "⛸️",

  // Arts & Entertainment
  "🎨",
  "🎭",
  "🎪",
  "🎬",
  "🎤",
  "🎧",
  "🎼",
  "🎹",
  "🥁",
  "🎷",
  "🎺",
  "🎸",
  "🪕",
  "🎻",
  "🎲",
  "♟️",
  "🎯",
  "🎳",
  "🎮",
  "🎰",
  "🧩",
  "🧸",
  "🪅",
  "🪆",
  "🖼️",
  "🧵",
  "🪡",
  "🧶",
  "🪢",

  // Objects & Items
  "👓",
  "🕶️",
  "🥽",
  "🥼",
  "🦺",
  "👔",
  "👕",
  "👖",
  "🧣",
  "🧤",
  "🧥",
  "🧦",
  "👗",
  "👘",
  "🥻",
  "🩱",
  "🩲",
  "🩳",
  "👙",
  "👚",
  "👛",
  "👜",
  "👝",
  "🎒",
  "👞",
  "👟",
  "🥾",
  "🥿",
  "👠",
  "👡",

  // Symbols & Signs
  "❤️",
  "🧡",
  "💛",
  "💚",
  "💙",
  "💜",
  "🖤",
  "🤍",
  "🤎",
  "💔",
  "❣️",
  "💕",
  "💞",
  "💓",
  "💗",
  "💖",
  "💘",
  "💝",
  "💟",
  "☮️",
  "✝️",
  "☪️",
  "🕉️",
  "☸️",
  "✡️",
  "🔯",
  "🕎",
  "☯️",
  "☦️",
  "🛐",
  "⛎",
  "♈",
  "♉",
  "♊",
  "♋",
  "♌",
  "♍",
  "♎",
  "♏",
  "♐",
  "♑",
  "♒",
  "♓",

  // Arrows & Directions
  "⬆️",
  "↗️",
  "➡️",
  "↘️",
  "⬇️",
  "↙️",
  "⬅️",
  "↖️",
  "↕️",
  "↔️",
  "↩️",
  "↪️",
  "⤴️",
  "⤵️",
  "🔃",
  "🔄",
  "🔙",
  "🔚",
  "🔛",
  "🔜",
  "🔝",

  // Shapes & Patterns
  "🔴",
  "🟠",
  "🟡",
  "🟢",
  "🔵",
  "🟣",
  "🟤",
  "⚫",
  "⚪",
  "🟥",
  "🟧",
  "🟨",
  "🟩",
  "🟦",
  "🟪",
  "🟫",
  "⬛",
  "⬜",
  "◼️",
  "◻️",
  "◾",
  "◽",
  "▪️",
  "▫️",
  "🔶",
  "🔷",
  "🔸",
  "🔹",
  "🔺",
  "🔻",
  "💠",
  "🔘",
  "🔳",
  "🔲",
]

export function IconPicker({ value, onChange, className }: IconPickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  const filteredEmojis = searchQuery ? EMOJI_OPTIONS.filter((emoji) => emoji.includes(searchQuery)) : EMOJI_OPTIONS

  const handleSelect = (emoji: string) => {
    onChange(emoji)
    setIsOpen(false)
    setSearchQuery("")
  }

  return (
    <>
      <Button
        type="button"
        onClick={() => setIsOpen(true)}
        variant="outline"
        className={`w-full justify-center ${className}`}
      >
        <span className="text-2xl">{value || "📁"}</span>
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl bg-[var(--settings-bg)] border-[var(--sidebar-border)]">
          <DialogHeader>
            <DialogTitle className="text-white">Escolher Ícone</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Buscar emoji..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-[var(--agent-hover)] border-[var(--sidebar-border)] text-white placeholder:text-gray-400"
                autoFocus
              />
            </div>

            <div className="max-h-96 overflow-y-auto">
              <div className="grid grid-cols-10 gap-2">
                {filteredEmojis.length > 0 ? (
                  filteredEmojis.map((emoji, index) => (
                    <button
                      key={`${emoji}-${index}`}
                      type="button"
                      onClick={() => handleSelect(emoji)}
                      className={`w-12 h-12 flex items-center justify-center text-2xl rounded-lg hover:bg-[var(--agent-hover)] transition-all ${
                        value === emoji ? "bg-purple-500/20 ring-2 ring-purple-500" : ""
                      }`}
                    >
                      {emoji}
                    </button>
                  ))
                ) : (
                  <div className="col-span-10 text-center py-8 text-gray-400">Nenhum emoji encontrado</div>
                )}
              </div>
            </div>

            <div className="text-sm text-gray-400 text-center border-t border-[var(--sidebar-border)] pt-3">
              {filteredEmojis.length} de {EMOJI_OPTIONS.length} emojis disponíveis
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
