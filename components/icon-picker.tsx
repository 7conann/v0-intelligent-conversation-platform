"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ChevronDown, Search } from "lucide-react"
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
  "💬",

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
  const dropdownRef = useRef<HTMLDivElement>(null)

  const filteredEmojis = searchQuery
    ? EMOJI_OPTIONS.filter((emoji) => {
        // Simple filtering - you could enhance this with emoji names/descriptions
        return emoji.includes(searchQuery)
      })
    : EMOJI_OPTIONS

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setSearchQuery("") // Reset search when closing
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isOpen])

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          setIsOpen(!isOpen)
        }}
        variant="outline"
        className={`w-full justify-between ${className}`}
      >
        <span className="text-2xl">{value || "📁"}</span>
        <ChevronDown className="h-4 w-4 opacity-50" />
      </Button>

      {isOpen && (
        <div
className="absolute z-50 mt-2 w-max max-w-[90vw] bg-[var(--settings-bg)] border border-[var(--sidebar-border)] rounded-lg shadow-lg p-3"
          onClick={(e) => e.stopPropagation()} // Prevent clicks inside dropdown from bubbling
        >
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Buscar emoji..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-[var(--agent-hover)] border-[var(--sidebar-border)] text-white placeholder:text-gray-400"
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          <div className="max-h-64 overflow-y-auto">
            <div className="grid grid-cols-8 gap-2">
              {filteredEmojis.length > 0 ? (
                filteredEmojis.map((emoji, index) => (
                  <button
                    key={`${emoji}-${index}`}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onChange(emoji)
                      setIsOpen(false)
                      setSearchQuery("")
                    }}
                    className={`w-10 h-10 flex items-center justify-center text-2xl rounded-lg hover:bg-[var(--agent-hover)] transition-all ${
                      value === emoji ? "bg-purple-500/20 ring-2 ring-purple-500" : ""
                    }`}
                  >
                    {emoji}
                  </button>
                ))
              ) : (
                <div className="col-span-8 text-center py-4 text-gray-400">Nenhum emoji encontrado</div>
              )}
            </div>
          </div>

          <div className="mt-2 text-xs text-gray-400 text-center">
            {filteredEmojis.length} de {EMOJI_OPTIONS.length} emojis
          </div>
        </div>
      )}
    </div>
  )
}
