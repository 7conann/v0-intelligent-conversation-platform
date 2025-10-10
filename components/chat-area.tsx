"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import type { Agent, Message, Chat } from "@/types/chat"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/toast"
import { Send, Plus, X, Sparkles, MessageSquarePlus, Download, Upload, MoreVertical } from "lucide-react"
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
  onDeleteChat: (chatId: string) => void
  onReorderChat: (draggedChatId: string, targetChatId: string) => void
  onImportChat: (chat: Chat, messages: Message[]) => void
  messages: Record<string, Message[]>
  onAddMessage: (chatId: string, message: Message) => void
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
  onDeleteChat,
  onReorderChat,
  onImportChat,
  messages,
  onAddMessage,
}: ChatAreaProps) {
  const [input, setInput] = useState("")
  const [selectedMessages, setSelectedMessages] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [draggedChatId, setDraggedChatId] = useState<string | null>(null)
  const [dialogChatId, setDialogChatId] = useState<string | null>(null)
  const [confirmDeleteChatId, setConfirmDeleteChatId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { addToast } = useToast()

  const currentMessages = messages[currentChatId] || []
  const currentChat = chats.find((c) => c.id === currentChatId)
  const contextMessages = currentChat?.contextMessages

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [currentMessages])

  const exportConversation = () => {
    const csvRows = []

    // CSV Header
    csvRows.push(["Timestamp", "Sender", "Message", "Agents Used"].join(","))

    // CSV Data
    currentMessages.forEach((message) => {
      const timestamp = message.timestamp.toISOString()
      const sender = message.sender
      const content = `"${message.content.replace(/"/g, '""')}"` // Escape quotes
      const agentsUsed = message.usedAgentIds
        ? message.usedAgentIds.map((id) => agents.find((a) => a.id === id)?.name || id).join(";")
        : ""

      csvRows.push([timestamp, sender, content, agentsUsed].join(","))
    })

    const csvContent = csvRows.join("\n")
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `conversa-${currentChat?.name || currentChatId}-${new Date().toISOString().split("T")[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    addToast({
      title: "Conversa exportada",
      description: "A conversa foi exportada em CSV com sucesso",
      variant: "success",
    })
  }

  const importConversation = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string
        const lines = content.split("\n")

        // Skip header row
        const dataLines = lines.slice(1).filter((line) => line.trim())

        const importedMessages: Message[] = []

        dataLines.forEach((line, index) => {
          // Parse CSV line (handle quoted content)
          const regex = /,(?=(?:(?:[^"]*"){2})*[^"]*$)/
          const parts = line.split(regex)

          if (parts.length >= 3) {
            const timestamp = new Date(parts[0].trim())
            const sender = parts[1].trim() as "user" | "assistant"
            const messageContent = parts[2].trim().replace(/^"|"$/g, "").replace(/""/g, '"')
            const agentsUsed = parts[3]
              ? (parts[3]
                  .trim()
                  .split(";")
                  .map((name) => {
                    const agent = agents.find((a) => a.name === name)
                    return agent?.id
                  })
                  .filter(Boolean) as string[])
              : []

            importedMessages.push({
              id: `imported-${Date.now()}-${index}`,
              content: messageContent,
              sender,
              timestamp,
              usedAgentIds: agentsUsed,
            })
          }
        })

        // Create new chat with imported messages
        const newChat: Chat = {
          id: `chat-${Date.now()}`,
          name: `Conversa ${chats.length + 1}`,
          agentHistories: {},
        }

        onImportChat(newChat, importedMessages)
        addToast({
          title: "Conversa importada",
          description: `${importedMessages.length} mensagens foram importadas com sucesso`,
          variant: "success",
        })
      } catch (error) {
        console.error("[v0] Error importing CSV:", error)
        addToast({
          title: "Erro ao importar",
          description: "Verifique se o arquivo CSV está correto",
          variant: "error",
        })
      }
    }
    reader.readAsText(file)

    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const sendMessage = async () => {
    if (!input.trim() || selectedAgents.length === 0) return

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input,
      sender: "user",
      timestamp: new Date(),
      usedAgentIds: selectedAgents,
    }

    onAddMessage(currentChatId, userMessage)

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
      }

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

      const data = await response.json()

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

      onAddMessage(currentChatId, assistantMessage)
    } catch (error) {
      console.error("[v0] Error sending message:", error)

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: "Desculpe, ocorreu um erro ao processar sua mensagem. Por favor, tente novamente.",
        sender: "assistant",
        timestamp: new Date(),
      }

      onAddMessage(currentChatId, assistantMessage)
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

  const handleDragStart = (e: React.DragEvent, chatId: string) => {
    setDraggedChatId(chatId)
    e.dataTransfer.effectAllowed = "move"
    e.dataTransfer.setData("text/plain", chatId)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
  }

  const handleDrop = (e: React.DragEvent, targetChatId: string) => {
    e.preventDefault()
    const draggedId = e.dataTransfer.getData("text/plain")
    if (draggedId && draggedId !== targetChatId) {
      onReorderChat(draggedId, targetChatId)
    }
    setDraggedChatId(null)
  }

  const handleDragEnd = () => {
    setDraggedChatId(null)
  }

  const exportSpecificChat = (chatId: string) => {
    const chat = chats.find((c) => c.id === chatId)
    const chatMessages = messages[chatId] || []

    const csvRows = []

    // CSV Header
    csvRows.push(["Timestamp", "Sender", "Message", "Agents Used"].join(","))

    // CSV Data
    chatMessages.forEach((message) => {
      const timestamp = message.timestamp.toISOString()
      const sender = message.sender
      const content = `"${message.content.replace(/"/g, '""')}"` // Escape quotes
      const agentsUsed = message.usedAgentIds
        ? message.usedAgentIds.map((id) => agents.find((a) => a.id === id)?.name || id).join(";")
        : ""

      csvRows.push([timestamp, sender, content, agentsUsed].join(","))
    })

    const csvContent = csvRows.join("\n")
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `conversa-${chat?.name || chatId}-${new Date().toISOString().split("T")[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    setDialogChatId(null)
    addToast({
      title: "Conversa exportada",
      description: `"${chat?.name}" foi exportada em CSV com sucesso`,
      variant: "success",
    })
  }

  const handleDeleteChat = (chatId: string) => {
    onDeleteChat(chatId)
    setDialogChatId(null)
    setConfirmDeleteChatId(null)
    const chat = chats.find((c) => c.id === chatId)
    addToast({
      title: "Conversa apagada",
      description: `"${chat?.name}" foi apagada com sucesso`,
      variant: "success",
    })
  }

  return (
    <div className="flex-1 flex flex-col bg-[var(--chat-bg)]">
      {/* Chat Tabs */}
      <div className="bg-[var(--chat-header-bg)] border-b border-[var(--chat-border)] px-4 py-2 flex items-center gap-2 overflow-x-auto">
        {chats.map((chat) => (
          <div
            key={chat.id}
            className="flex items-center gap-1 shrink-0 relative"
            draggable
            onDragStart={(e) => handleDragStart(e, chat.id)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, chat.id)}
            onDragEnd={handleDragEnd}
          >
            <button
              onClick={() => onSwitchChat(chat.id)}
              className={cn(
                "!bg-gray-800 px-4 py-2 rounded-lg text-sm font-medium transition-all relative cursor-pointer",
                currentChatId === chat.id
                  ? "bg-[var(--agent-bg)] text-[var(--settings-text)]"
                  : "text-[var(--settings-text-muted)] hover:text-[var(--settings-text)] hover:bg-[var(--agent-bg)]",
                draggedChatId === chat.id && "opacity-50",
              )}
            >
              {chat.name}
              {chat.contextMessages && chat.contextMessages.length > 0 && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full" />
              )}
            </button>

            {/* Dialog Trigger Button */}
            <button
              onClick={(e) => {
                e.stopPropagation()
                setDialogChatId(chat.id)
              }}
              className="w-6 h-6 rounded flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-700 transition-all cursor-pointer"
              title="Opções"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>
        ))}
        <button
          onClick={onCreateNewChat}
          className="w-8 h-8 rounded-lg bg-[var(--agent-bg)] hover:bg-[var(--agent-hover)] flex items-center justify-center text-[var(--settings-text-muted)] hover:text-[var(--settings-text)] transition-all cursor-pointer shrink-0"
          title="Nova conversa"
        >
          <Plus className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-1 ml-auto shrink-0">
          <button
            onClick={exportConversation}
            className="w-8 h-8 rounded-lg bg-[var(--agent-bg)] hover:bg-[var(--agent-hover)] flex items-center justify-center text-[var(--settings-text-muted)] hover:text-[var(--settings-text)] transition-all cursor-pointer"
            title="Exportar conversa atual"
          >
            <Download className="w-4 h-4" />
          </button>
          <input ref={fileInputRef} type="file" accept=".csv" onChange={importConversation} className="hidden" />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-8 h-8 rounded-lg bg-[var(--agent-bg)] hover:bg-[var(--agent-hover)] flex items-center justify-center text-[var(--settings-text-muted)] hover:text-[var(--settings-text)] transition-all cursor-pointer"
            title="Importar conversa"
          >
            <Upload className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Clean Dialog for Chat Options */}
      {dialogChatId && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
          onClick={() => setDialogChatId(null)}
        >
          <div
            className="bg-gray-900 border border-gray-700 rounded-xl p-6 max-w-sm w-full mx-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-white">Opções da Conversa</h3>
              <button
                onClick={() => setDialogChatId(null)}
                className="text-gray-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <button
                onClick={() => exportSpecificChat(dialogChatId)}
                className="w-full px-4 py-3 rounded-lg bg-gray-800 hover:bg-gray-700 text-white transition-all flex items-center gap-3 cursor-pointer"
              >
                <Download className="w-5 h-5 text-purple-400" />
                <span>Exportar conversa</span>
              </button>

              {chats.length > 1 && (
                <button
                  onClick={() => {
                    setDialogChatId(null)
                    setConfirmDeleteChatId(dialogChatId)
                  }}
                  className="w-full px-4 py-3 rounded-lg bg-gray-800 hover:bg-gray-700 text-white transition-all flex items-center gap-3 cursor-pointer"
                >
                  <X className="w-5 h-5 text-red-400" />
                  <span>Apagar conversa</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {confirmDeleteChatId && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
          onClick={() => setConfirmDeleteChatId(null)}
        >
          <div
            className="bg-gray-900 border border-gray-700 rounded-xl p-6 max-w-sm w-full mx-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-white mb-2">Confirmar exclusão</h3>
              <p className="text-gray-400 text-sm">
                Tem certeza que deseja apagar a conversa "{chats.find((c) => c.id === confirmDeleteChatId)?.name}"? Esta
                ação não pode ser desfeita.
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setConfirmDeleteChatId(null)}
                className="flex-1 px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-white transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDeleteChat(confirmDeleteChatId)}
                className="flex-1 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white transition-all cursor-pointer"
              >
                Apagar
              </button>
            </div>
          </div>
        </div>
      )}

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
