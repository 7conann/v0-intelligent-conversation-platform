"use client"

import { useState, useRef, useEffect } from "react"
import type { Agent, Message, Chat } from "@/types/chat"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Send, Plus, X, Sparkles, MessageSquarePlus } from "lucide-react"
import { cn } from "@/lib/utils"

interface ChatAreaProps {
  agents: Agent[]
  selectedAgents: string[]
  currentChatId: string
  chats: Chat[]
  onCreateNewChat: () => void
  onSwitchChat: (chatId: string) => void
  onMarkAgentAsUsed: (agentId: string) => void
  onCreateChatWithMessages: (messages: Message[]) => void
}

export function ChatArea({
  agents,
  selectedAgents,
  currentChatId,
  chats,
  onCreateNewChat,
  onSwitchChat,
  onMarkAgentAsUsed,
  onCreateChatWithMessages,
}: ChatAreaProps) {
  const [messages, setMessages] = useState<Record<string, Message[]>>({
    "1": [],
  })
  const [input, setInput] = useState("")
  const [selectedMessages, setSelectedMessages] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const currentMessages = messages[currentChatId] || []
  const currentChat = chats.find((c) => c.id === currentChatId)
  const contextMessages = currentChat?.contextMessages

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [currentMessages])

  const sendMessage = async () => {
    if (!input.trim() || selectedAgents.length === 0) return

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input,
      sender: "user",
      timestamp: new Date(),
      usedAgentIds: selectedAgents,
    }

    setMessages((prev) => ({
      ...prev,
      [currentChatId]: [...(prev[currentChatId] || []), userMessage],
    }))
    setInput("")
    setIsLoading(true)

    selectedAgents.forEach((agentId) => onMarkAgentAsUsed(agentId))

    try {
      const isFirstMessage = currentMessages.length === 0
      let messageToSend = input

      if (isFirstMessage && contextMessages && contextMessages.length > 0) {
        const contextText = contextMessages
          .map((m) => `[${m.sender === "user" ? "Usuário" : "Assistente"}]: ${m.content}`)
          .join("\n\n")
        messageToSend = `Contexto das mensagens anteriores:\n\n${contextText}\n\n---\n\nMinha pergunta: ${input}`
        console.log("[v0] Including context messages in first message")
      }

      console.log("[v0] Sending message to webhook:", messageToSend)

      const response = await fetch("https://n8n.grupobeely.com.br/webhook/7a3701eb-f5ad-4d08-8698-6aba69a379ed", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: messageToSend,
          agents: selectedAgents.map((id) => agents.find((a) => a.id === id)?.name),
          chatId: currentChatId,
          timestamp: new Date().toISOString(),
          hasContext: isFirstMessage && contextMessages && contextMessages.length > 0,
          contextMessages: isFirstMessage && contextMessages ? contextMessages : undefined,
        }),
      })

      console.log("[v0] Webhook response status:", response.status)

      const data = await response.json()
      console.log("[v0] Webhook response data:", JSON.stringify(data, null, 2))

      let responseContent = ""

      if (typeof data === "string") {
        responseContent = data
      } else if (data.response && typeof data.response === "string") {
        responseContent = data.response
      } else if (data.content && typeof data.content === "string") {
        responseContent = data.content
      } else if (data.message) {
        if (typeof data.message === "string") {
          responseContent = data.message
        } else if (data.message.content && typeof data.message.content === "string") {
          responseContent = data.message.content
        } else {
          responseContent = JSON.stringify(data.message)
        }
      } else if (data.choices && data.choices[0]?.message?.content) {
        responseContent = data.choices[0].message.content
      } else if (data.output && typeof data.output === "string") {
        responseContent = data.output
      } else if (data.text && typeof data.text === "string") {
        responseContent = data.text
      } else {
        responseContent = JSON.stringify(data, null, 2)
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: responseContent,
        sender: "assistant",
        timestamp: new Date(),
        usedAgentIds: selectedAgents,
      }

      setMessages((prev) => ({
        ...prev,
        [currentChatId]: [...(prev[currentChatId] || []), assistantMessage],
      }))
    } catch (error) {
      console.error("[v0] Error sending message:", error)

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: "Desculpe, ocorreu um erro ao processar sua mensagem. Por favor, tente novamente.",
        sender: "assistant",
        timestamp: new Date(),
      }

      setMessages((prev) => ({
        ...prev,
        [currentChatId]: [...(prev[currentChatId] || []), assistantMessage],
      }))
    } finally {
      setIsLoading(false)
    }
  }

  const toggleMessageSelection = (messageId: string) => {
    setSelectedMessages((prev) =>
      prev.includes(messageId) ? prev.filter((id) => id !== messageId) : [...prev, messageId],
    )
  }

  const useSelectedMessages = () => {
    const selected = currentMessages.filter((m) => selectedMessages.includes(m.id))
    const combinedText = selected.map((m) => m.content).join("\n\n")
    setInput(combinedText)
    setSelectedMessages([])
  }

  const createNewChatWithSelected = () => {
    const selected = currentMessages.filter((m) => selectedMessages.includes(m.id))
    onCreateChatWithMessages(selected)
    setSelectedMessages([])
  }

  return (
    <div className="flex-1 flex flex-col bg-[var(--chat-bg)]">
      {/* Chat Tabs */}
      <div className="bg-[var(--chat-header-bg)] border-b border-[var(--chat-border)] px-4 py-2 flex items-center gap-2">
        {chats.map((chat) => (
          <button
            key={chat.id}
            onClick={() => onSwitchChat(chat.id)}
            className={cn(
              "!bg-gray-800 px-4 py-2 rounded-lg text-sm font-medium transition-all relative cursor-pointer",
              currentChatId === chat.id
                ? "bg-[var(--agent-bg)] text-[var(--settings-text)]"
                : "text-[var(--settings-text-muted)] hover:text-[var(--settings-text)] hover:bg-[var(--agent-bg)]",
            )}
          >
            {chat.name}
            {chat.contextMessages && chat.contextMessages.length > 0 && (
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full" />
            )}
          </button>
        ))}
        <button
          onClick={onCreateNewChat}
          className="w-8 h-8 rounded-lg bg-[var(--agent-bg)] hover:bg-[var(--agent-hover)] flex items-center justify-center text-[var(--settings-text-muted)] hover:text-[var(--settings-text)] transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {selectedMessages.length > 0 && (
        <div className="bg-purple-900/20 border-b border-purple-500/30 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span className="text-purple-300 text-sm">
              {selectedMessages.length} mensagem{selectedMessages.length > 1 ? "s" : ""} selecionada
              {selectedMessages.length > 1 ? "s" : ""}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={createNewChatWithSelected}
              className="bg-green-600 hover:bg-green-500 text-white text-sm flex items-center gap-2 cursor-pointer"
            >
              <MessageSquarePlus className="w-4 h-4" />
              Novo Chat
            </Button>
            <Button
              onClick={useSelectedMessages}
              className="bg-purple-600 hover:bg-purple-500 text-white text-sm cursor-pointer"
            >
              Usar Mensagens
            </Button>
            <button onClick={() => setSelectedMessages([])} className="text-gray-400 hover:text-white cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {contextMessages && contextMessages.length > 0 && currentMessages.length === 0 && (
        <div className="bg-green-900/20 border-b border-green-500/30 px-4 py-3">
          <div className="flex items-center gap-2 text-green-300 text-sm">
            <Sparkles className="w-4 h-4" />
            <span>
              Este chat foi criado com {contextMessages.length} mensagem{contextMessages.length > 1 ? "s" : ""} de
              contexto. Elas serão incluídas na sua primeira mensagem.
            </span>
          </div>
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {currentMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-900/50 to-blue-900/50 flex items-center justify-center mb-6 border border-purple-500/30">
              <svg viewBox="0 0 24 24" fill="none" className="w-12 h-12">
                <path
                  d="M12 2L2 7L12 12L22 7L12 2Z"
                  stroke="url(#gradient2)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M2 17L12 22L22 17"
                  stroke="url(#gradient2)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M2 12L12 17L22 12"
                  stroke="url(#gradient2)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <defs>
                  <linearGradient id="gradient2" x1="2" y1="2" x2="22" y2="22">
                    <stop offset="0%" stopColor="#a78bfa" />
                    <stop offset="100%" stopColor="#60a5fa" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-[var(--settings-text)] mb-2 flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-green-400" />
              {contextMessages && contextMessages.length > 0 ? "Continuar conversa" : "Criar nova conversa"}
            </h2>
            <p className="text-[var(--settings-text-muted)] max-w-md">
              {contextMessages && contextMessages.length > 0
                ? "Digite sua mensagem para continuar a conversa com o contexto das mensagens anteriores"
                : "Comece uma nova conversa selecionando agentes na barra lateral e clicando no botão +"}
            </p>
            {selectedAgents.length > 0 && (
              <Button
                onClick={() => setInput("Olá!")}
                className="mt-6 bg-purple-600 hover:bg-purple-500 text-white cursor-pointer"
              >
                Iniciar Conversa
              </Button>
            )}
          </div>
        ) : (
          currentMessages.map((message) => (
            <div
              key={message.id}
              className={cn("flex gap-3 group", message.sender === "user" ? "justify-end" : "justify-start")}
            >
              <div
                className={cn(
                  "max-w-[70%] rounded-2xl px-4 py-3 cursor-pointer transition-all !bg-gray-800",
                  message.sender === "user"
                    ? "bg-[var(--message-user-bg)] text-white"
                    : "bg-[var(--message-assistant-bg)] text-[var(--settings-text)] border border-[var(--chat-border)]",
                  selectedMessages.includes(message.id) && "ring-2 ring-purple-500",
                )}
                onClick={() => toggleMessageSelection(message.id)}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium opacity-70">
                    {message.sender === "user" ? "Você" : "Assistente"}
                  </span>
                  <span className="text-xs opacity-50">
                    {message.timestamp.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                <p className="text-sm leading-relaxed">{message.content}</p>
              </div>
            </div>
          ))
        )}
        {isLoading && (
          <div className="flex gap-3">
            <div className="max-w-[70%] rounded-2xl px-4 py-3 bg-[var(--message-assistant-bg)] border border-[var(--chat-border)]">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce [animation-delay:0.4s]" />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-[var(--chat-border)] bg-[var(--chat-header-bg)] p-4">
        {selectedAgents.length === 0 && (
          <div className="mb-3 text-center text-sm text-purple-400">
            Selecione pelo menos um agente na barra lateral para começar
          </div>
        )}
        <div className="flex gap-3 items-end">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                sendMessage()
              }
            }}
            placeholder="Digite sua mensagem..."
            className="flex-1 bg-[var(--input-bg)] border-[var(--chat-border)] text-[var(--settings-text)] placeholder:text-[var(--settings-text-muted)] focus:border-purple-500 resize-none min-h-[60px] max-h-[200px]"
            disabled={selectedAgents.length === 0}
          />
          <Button
            onClick={sendMessage}
            disabled={!input.trim() || selectedAgents.length === 0 || isLoading}
            className="bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white h-[60px] px-6 cursor-pointer disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  )
}
