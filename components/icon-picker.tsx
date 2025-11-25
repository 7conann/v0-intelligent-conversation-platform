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

const EMOJI_MAP: Record<string, string[]> = {
  "📁": ["pasta", "folder", "arquivo", "file"],
  "📂": ["pasta aberta", "open folder"],
  "📊": ["grafico", "chart", "dados", "data", "estatistica"],
  "📈": ["crescimento", "growth", "alta", "subindo", "up"],
  "📉": ["queda", "down", "baixa", "descendo"],
  "💼": ["maleta", "briefcase", "trabalho", "work", "negocio", "business"],
  "🎯": ["alvo", "target", "meta", "objetivo", "goal"],
  "🚀": ["foguete", "rocket", "lancamento", "launch", "rapido", "fast"],
  "💡": ["lampada", "bulb", "ideia", "idea", "luz", "light"],
  "⚡": ["raio", "lightning", "energia", "energy", "rapido", "fast"],
  "🔥": ["fogo", "fire", "quente", "hot", "trending"],
  "⭐": ["estrela", "star", "favorito", "favorite"],
  "🌟": ["estrela brilhante", "bright star", "destaque"],
  "💎": ["diamante", "diamond", "joia", "gem", "premium"],
  "🏆": ["trofeu", "trophy", "premio", "award", "vencedor", "winner"],
  "📋": ["prancheta", "clipboard", "lista", "list"],
  "📌": ["alfinete", "pin", "fixar"],
  "📍": ["localizacao", "location", "pin", "lugar", "place"],
  "💻": ["computador", "computer", "laptop", "notebook", "pc"],
  "🖥️": ["desktop", "monitor", "tela", "screen"],
  "📱": ["celular", "phone", "mobile", "smartphone"],
  "💰": ["dinheiro", "money", "grana", "cash"],
  "💵": ["dolar", "dollar", "nota", "bill"],
  "💳": ["cartao", "card", "credito", "credit"],
  "📧": ["email", "correio", "mail", "mensagem"],
  "✉️": ["carta", "letter", "envelope"],
  "🔒": ["cadeado", "lock", "seguro", "secure", "privado", "private"],
  "🔓": ["aberto", "unlock", "desbloqueado"],
  "🔑": ["chave", "key", "senha", "password"],
  "🛡️": ["escudo", "shield", "protecao", "protection"],
  "⚙️": ["engrenagem", "gear", "configuracao", "settings"],
  "🔧": ["chave inglesa", "wrench", "ferramenta", "tool"],
  "🔨": ["martelo", "hammer", "construir", "build"],
  "🎨": ["paleta", "palette", "arte", "art", "design"],
  "🎭": ["teatro", "theater", "mascara", "mask"],
  "🎬": ["cinema", "movie", "filme", "video"],
  "🎤": ["microfone", "microphone", "audio", "voz", "voice"],
  "🎧": ["fone", "headphone", "audio", "musica", "music"],
  "📷": ["camera", "foto", "photo", "imagem", "image"],
  "🏠": ["casa", "home", "inicio"],
  "🏢": ["predio", "building", "empresa", "company", "escritorio", "office"],
  "🏭": ["fabrica", "factory", "industria", "industry"],
  "🏪": ["loja", "store", "comercio", "shop"],
  "🏦": ["banco", "bank", "financeiro", "financial"],
  "🚗": ["carro", "car", "veiculo", "vehicle"],
  "🚕": ["taxi", "cab"],
  "✈️": ["aviao", "airplane", "plane", "viagem", "travel"],
  "🚢": ["navio", "ship", "barco", "boat"],
  "🌍": ["terra", "earth", "mundo", "world", "global"],
  "🌎": ["americas", "mundo", "world"],
  "🌏": ["asia", "mundo", "world"],
  "🌐": ["globo", "globe", "internet", "web", "mundial"],
  "☀️": ["sol", "sun", "dia", "day", "luz", "light"],
  "🌙": ["lua", "moon", "noite", "night"],
  "⭐": ["estrela", "star"],
  "✨": ["brilho", "sparkle", "magic", "magico"],
  "🔔": ["sino", "bell", "notificacao", "notification", "alerta", "alert"],
  "📞": ["telefone", "telephone", "phone", "ligar", "call"],
  "📝": ["nota", "note", "escrever", "write", "documento", "document"],
  "✅": ["check", "correto", "certo", "ok", "confirmado", "confirmed"],
  "❌": ["x", "errado", "erro", "error", "cancelar", "cancel"],
  "⚠️": ["aviso", "warning", "alerta", "alert", "atencao", "attention"],
  ℹ️: ["info", "informacao", "information"],
  "❓": ["pergunta", "question", "duvida", "help", "ajuda"],
  "❤️": ["coracao", "heart", "amor", "love", "curtir", "like"],
  "👍": ["positivo", "thumbs up", "curtir", "like", "aprovar"],
  "👎": ["negativo", "thumbs down", "nao curtir", "dislike"],
  "👤": ["usuario", "user", "pessoa", "person", "perfil", "profile"],
  "👥": ["usuarios", "users", "pessoas", "people", "grupo", "group"],
  "🔍": ["lupa", "search", "buscar", "procurar", "pesquisar"],
  "🔎": ["lupa", "zoom", "buscar", "search"],
  "📦": ["caixa", "box", "pacote", "package", "produto", "product"],
  "🎁": ["presente", "gift", "bonus"],
  "🔗": ["link", "corrente", "chain", "conectar", "connect"],
  "📅": ["calendario", "calendar", "data", "date", "agenda"],
  "⏰": ["relogio", "clock", "alarme", "alarm", "hora", "time"],
  "⌚": ["relogio pulso", "watch", "tempo", "time"],
  "⏱️": ["cronometro", "stopwatch", "timer"],
  "🔋": ["bateria", "battery", "energia", "energy", "carga", "charge"],
  "🔌": ["tomada", "plug", "energia", "power"],
  "💾": ["disquete", "save", "salvar", "disco", "disk"],
  "💿": ["cd", "disco", "disk"],
  "📀": ["dvd", "disco", "disk"],
  "🖨️": ["impressora", "printer", "imprimir", "print"],
  "🖱️": ["mouse", "rato", "cursor"],
  "⌨️": ["teclado", "keyboard", "digitar", "type"],
  "🖼️": ["quadro", "frame", "imagem", "picture"],
  "🗂️": ["divisor", "divider", "organizar", "organize"],
  "🗃️": ["arquivo", "file box", "arquivar"],
  "🗄️": ["armario", "cabinet", "arquivo", "storage"],
  "🗑️": ["lixo", "trash", "deletar", "delete", "remover"],
  "📮": ["caixa correio", "mailbox", "correio", "mail"],
  "📬": ["caixa correio cheia", "mailbox full"],
  "📭": ["caixa correio vazia", "mailbox empty"],
  "✏️": ["lapis", "pencil", "escrever", "write", "editar", "edit"],
  "✒️": ["caneta", "pen", "escrever", "write"],
  "🖊️": ["caneta", "pen", "escrever", "write"],
  "🖋️": ["caneta tinteiro", "fountain pen"],
  "🖍️": ["giz cera", "crayon", "colorir"],
  "📐": ["triangulo", "triangle", "regua", "ruler", "geometria"],
  "📏": ["regua", "ruler", "medir", "measure"],
  "✂️": ["tesoura", "scissors", "cortar", "cut"],
  "🗓️": ["calendario folhas", "calendar", "agenda"],
  "📆": ["calendario data", "calendar"],
  "🗒️": ["bloco notas", "notepad", "nota", "note"],
  "🗞️": ["jornal", "newspaper", "noticia", "news"],
  "📰": ["jornal", "newspaper", "noticia", "news"],
  "📑": ["marcador", "bookmark", "marcar"],
  "🔖": ["etiqueta", "tag", "marcador", "bookmark"],
  "💬": ["balao fala", "speech bubble", "mensagem", "message", "chat"],
  "💭": ["balao pensamento", "thought bubble", "pensar", "think"],
  "🗨️": ["balao fala esquerda", "left speech bubble"],
  "🗯️": ["balao raiva", "anger bubble", "raiva"],
  "🏷️": ["etiqueta", "label", "tag", "preco", "price"],
  "3": ["tres", "three", "ponto", "dot", "menu", "opcoes", "options"],
  "...": ["tres pontos", "ellipsis", "mais", "more", "opcoes", "options", "menu"],
  "⋮": ["tres pontos vertical", "vertical ellipsis", "menu", "opcoes"],
}

const EMOJI_OPTIONS = Object.keys(EMOJI_MAP)

export function IconPicker({ value, onChange, className }: IconPickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const dropdownRef = useRef<HTMLDivElement>(null)

  const filteredEmojis = searchQuery
    ? EMOJI_OPTIONS.filter((emoji) => {
        const query = searchQuery.toLowerCase().trim()
        const names = EMOJI_MAP[emoji] || []

        // Match if query is contained in any of the emoji names
        return names.some((name) => name.toLowerCase().includes(query))
      })
    : EMOJI_OPTIONS

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setSearchQuery("")
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
          onClick={(e) => e.stopPropagation()}
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
