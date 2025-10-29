"use client"

import type React from "react"
import { Badge } from "@/components/ui/badge"
import { useState, useRef, useEffect } from "react"
import type { Agent, Message, Chat } from "@/types/chat"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/toast"
import {
  Send,
  Plus,
  X,
  Sparkles,
  MessageSquarePlus,
  Download,
  Upload,
  MoreVertical,
  Paperclip,
  ImageIcon,
  FileText,
  Music,
  Star,
  Menu,
  Pencil,
  Check,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import { AgentTagInput } from "@/components/agent-tag-input"

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
  onToggleFavorite: (chatId: string) => void
  messages: Record<string, Message[]>
  onAddMessage: (chatId: string, message: Message) => void
  onOpenMobileSidebar?: () => void
  onUpdateChatName?: (chatId: string, newName: string) => void
  className?: string
  onExternalApiResponse?: (payload: any, opts?: { decorate?: boolean }) => Promise<void>
  onToggleAgent?: (agentId: string) => void
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
  onToggleFavorite,
  messages,
  onAddMessage,
  onOpenMobileSidebar,
  onUpdateChatName,
  onExternalApiResponse,
  onToggleAgent,
  className,
}: ChatAreaProps) {
  const [input, setInput] = useState("")
  const [selectedMessages, setSelectedMessages] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [draggedChatId, setDraggedChatId] = useState<string | null>(null)
  const [dialogChatId, setDialogChatId] = useState<string | null>(null)
  const [confirmDeleteChatId, setConfirmDeleteChatId] = useState<string | null>(null)
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [editingChatId, setEditingChatId] = useState<string | null>(null)
  const [editingChatName, setEditingChatName] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const attachmentInputRef = useRef<HTMLInputElement>(null)
  const editInputRef = useRef<HTMLInputElement>(null) // Ref for editing input
  const { addToast } = useToast()

  interface Attachment {
    name: string
    data: string // base64 encoded file data
    type: string
    size: number
  }

  const currentMessages = messages[currentChatId] || []
  const currentChat = chats.find((c) => c.id === currentChatId)
  const contextMessages = currentChat?.contextMessages

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [currentMessages])

  useEffect(() => {
    setInput("")
  }, [currentChatId])

  const sendMessage = async () => {
    if ((!input.trim() && attachments.length === 0) || selectedAgents.length === 0) return

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input,
      sender: "user",
      timestamp: new Date(),
      usedAgentIds: selectedAgents,
    }

    onAddMessage(currentChatId, userMessage)

    setInput("")
    const attachmentsToSend = [...attachments]
    setAttachments([])
    setIsLoading(true)

    selectedAgents.forEach((agentId) => onMarkAgentAsUsed(agentId))

    try {
      const isFirstMessage = currentMessages.length === 0

      const triggerWords = selectedAgents
        .map((agentId) => {
          const agent = agents.find((a) => a.id === agentId)
          return agent?.trigger_word
        })
        .filter(Boolean)
        .join(" ")

      let messageToSend = triggerWords ? `${triggerWords}: ${input}` : input

      if (isFirstMessage && contextMessages && contextMessages.length > 0) {
        const contextText = contextMessages
          .map((m) => `[${m.sender === "user" ? "Usuário" : "Assistente"}]: ${m.content}`)
          .join("\n\n")
        messageToSend = `Contexto das mensagens anteriores:\n\n${contextText}\n\n---\n\nMinha pergunta: ${messageToSend}`
      }

      let payload: any

      if (attachmentsToSend.length > 0) {
        const attachment = attachmentsToSend[0]
        payload = {
          content: {
            image: {
              url: attachment.data,
              caption: messageToSend || "Imagem enviada",
            },
          },
          type: "IMAGE",
          contactIdentifier: currentChatId,
          contactName: `Chat ${currentChatId}`,
        }
      } else {
        payload = {
          content: {
            text: {
              body: messageToSend,
            },
          },
          type: "TEXT",
          contactIdentifier: currentChatId,
          contactName: `Chat ${currentChatId}`,
        }
      }

      console.log("[v0] 🚀 Payload enviado para /api/send-message:", payload)

      const response = await fetch("/api/send-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error("[v0] ❌ ERRO NA API:", errorData)
        throw new Error(`API returned ${response.status}: ${errorData.error || "Unknown error"}`)
      }

      const data = await response.json()
      console.log("[v0] 📥 RESPOSTA COMPLETA DA API BLUBASH:", JSON.stringify(data, null, 2))

      // 🔧 DEBUG para confirmar se o handler de formatação está chegando como prop
      // Obs: certifique-se de que ChatAreaProps tenha onExternalApiResponse e que ChatPage o passe.
      // @ts-ignore - caso o tipo ainda não tenha sido atualizado
      const hasFormatter = typeof onExternalApiResponse === "function"
      // @ts-ignore
      console.log("[v0] 🔧 onExternalApiResponse disponível?", hasFormatter)

      // Se houver handler, delega a formatação (máscara -> HTML) pra ele
      // @ts-ignore
      if (hasFormatter) {
        // @ts-ignore
        console.log("[v0] 🔧 Encaminhando payload para onExternalApiResponse (com máscara/decorate=true)")
        // @ts-ignore
        await onExternalApiResponse(data, { decorate: true })
        return
      }

      // Fallback (sem o handler): mantém o fluxo antigo (texto puro sem máscara)
      console.warn("[v0] ⚠️ Sem onExternalApiResponse — usando fallback SEM formatação.")
      if (data.success && data.aiMessages && data.aiMessages.length > 0) {
        const texts = data.aiMessages.map((m: any) => m?.content?.text?.body).filter(Boolean)

        console.log("[v0] 🧾 Fallback: corpos de texto detectados:", texts.length)
        texts.forEach((messageContent: string, index: number) => {
          setTimeout(() => {
            const assistantMessage: Message = {
              id: `${Date.now()}-${index}`,
              content: messageContent,
              sender: "assistant",
              timestamp: new Date(),
              usedAgentIds: selectedAgents,
            }
            onAddMessage(currentChatId, assistantMessage)
          }, index * 150)
        })
      } else {
        const assistantMessage: Message = {
          id: Date.now().toString(),
          content: "Resposta recebida com sucesso.",
          sender: "assistant",
          timestamp: new Date(),
        }
        onAddMessage(currentChatId, assistantMessage)
      }
    } catch (error) {
      console.error("[v0] ❌ ERRO:", error)
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

  const exportConversation = () => {
    const csvRows = []

    csvRows.push(["Timestamp", "Sender", "Message", "Agents Used"].join(","))

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

        const dataLines = lines.slice(1).filter((line) => line.trim())

        const importedMessages: Message[] = []

        dataLines.forEach((line, index) => {
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

  const getFileIcon = (type: string) => {
    if (type.startsWith("image/")) return <ImageIcon className="w-4 h-4" />
    if (type.startsWith("audio/")) return <Music className="w-4 h-4" />
    return <FileText className="w-4 h-4" />
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B"
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB"
    return (bytes / (1024 * 1024)).toFixed(1) + " MB"
  }

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index))
  }

  const exportSpecificChat = (chatId: string) => {
    const chat = chats.find((c) => c.id === chatId)
    const chatMessages = messages[chatId] || []

    const csvRows = []

    csvRows.push(["Timestamp", "Sender", "Message", "Agents Used"].join(","))

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
      description: `"${chat?.name}" foi exportada com sucesso`,
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

  const handleEditChatName = (chatId: string, currentName: string) => {
    setEditingChatId(chatId)
    setEditingChatName(currentName)
    setTimeout(() => {
      editInputRef.current?.focus()
      editInputRef.current?.select()
    }, 0)
  }

  const handleSaveChatName = async () => {
    if (!editingChatId || !editingChatName.trim()) {
      setEditingChatId(null)
      return
    }

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from("conversations")
        .update({ title: editingChatName.trim() })
        .eq("id", editingChatId)

      if (error) throw error

      if (onUpdateChatName) {
        onUpdateChatName(editingChatId, editingChatName.trim())
      }

      addToast({
        title: "Nome atualizado",
        description: "O nome da conversa foi atualizado com sucesso",
        variant: "success",
      })
    } catch (error) {
      console.error("[v0] Error updating chat name:", error)
      addToast({
        title: "Erro ao atualizar",
        description: "Não foi possível atualizar o nome da conversa",
        variant: "error",
      })
    } finally {
      setEditingChatId(null)
      setEditingChatName("")
    }
  }

  const handleCancelEdit = () => {
    setEditingChatId(null)
    setEditingChatName("")
  }

  const selectedAgentObjects = selectedAgents
    .map((agentId) => agents.find((a) => a.id === agentId))
    .filter((agent): agent is Agent => agent !== undefined)

  const handleRemoveAgentTag = (agentId: string) => {
    if (onToggleAgent) {
      onToggleAgent(agentId)
    }
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files) return

    const file = files[0]
    const reader = new FileReader()
    reader.onload = (e) => {
      const base64Data = e.target?.result as string
      setAttachments((prev) => [
        ...prev,
        {
          name: file.name,
          data: base64Data.split(",")[1], // Remove the data URL prefix
          type: file.type,
          size: file.size,
        },
      ])
    }
    reader.readAsDataURL(file)

    if (attachmentInputRef.current) {
      attachmentInputRef.current.value = ""
    }
  }

  return (
    <div className={cn("flex flex-col h-full bg-[var(--chat-bg)] min-w-0", className)}>
      <div className="bg-[var(--chat-header-bg)] border-b border-[var(--chat-border)] px-2 md:px-4 py-2 flex items-center gap-1 md:gap-2 overflow-x-auto scrollbar-hide shrink-0">
        <button
          onClick={onOpenMobileSidebar}
          className="md:hidden w-8 h-8 rounded-lg bg-[var(--agent-bg)] hover:bg-[var(--agent-hover)] flex items-center justify-center text-[var(--settings-text-muted)] hover:text-[var(--settings-text)] transition-all cursor-pointer shrink-0 mr-1"
          title="Abrir menu"
        >
          <Menu className="w-4 h-4" />
        </button>

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
            {editingChatId === chat.id ? (
              <div className="flex items-center gap-1 bg-[var(--agent-bg)] rounded-lg px-2 py-1">
                <input
                  ref={editInputRef}
                  type="text"
                  value={editingChatName}
                  onChange={(e) => setEditingChatName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveChatName()
                    if (e.key === "Escape") handleCancelEdit()
                  }}
                  className="bg-transparent border-none outline-none text-[var(--settings-text)] text-xs md:text-sm w-24 md:w-32"
                  maxLength={30}
                />
                <button
                  onClick={handleSaveChatName}
                  className="w-5 h-5 rounded flex items-center justify-center text-green-400 hover:bg-green-500/20 transition-all"
                  title="Salvar"
                >
                  <Check className="w-3 h-3" />
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="w-5 h-5 rounded flex items-center justify-center text-red-400 hover:bg-red-500/20 transition-all"
                  title="Cancelar"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <>
                <button
                  onClick={() => onSwitchChat(chat.id)}
                  className={cn(
                    "px-2 md:px-4 py-1.5 md:py-2 rounded-lg text-xs md:text-sm font-medium transition-all relative cursor-pointer whitespace-nowrap",
                    currentChatId === chat.id
                      ? "bg-[var(--agent-bg)] text-[var(--settings-text)]"
                      : "text-[var(--settings-text-muted)] hover:text-[var(--settings-text)] hover:bg-[var(--agent-bg)]",
                    draggedChatId === chat.id && "opacity-50",
                  )}
                >
                  {chat.isFavorite && (
                    <Star className="w-2 h-2 md:w-3 md:h-3 text-yellow-400 fill-yellow-400 absolute -top-1 -left-1" />
                  )}
                  {chat.name}
                  {chat.contextMessages && chat.contextMessages.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full" />
                  )}
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setDialogChatId(chat.id)
                  }}
                  className="w-5 h-5 md:w-6 md:h-6 rounded flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-700 transition-all cursor-pointer"
                  title="Opções"
                >
                  <MoreVertical className="w-3 h-3 md:w-4 md:h-4" />
                </button>
              </>
            )}
          </div>
        ))}
        <button
          onClick={onCreateNewChat}
          className="w-6 h-6 md:w-8 md:h-8 rounded-lg bg-[var(--agent-bg)] hover:bg-[var(--agent-hover)] flex items-center justify-center text-[var(--settings-text-muted)] hover:text-[var(--settings-text)] transition-all cursor-pointer shrink-0"
          title="Nova conversa"
        >
          <Plus className="w-3 h-3 md:w-4 md:h-4" />
        </button>
        <div className="flex items-center gap-1 ml-auto shrink-0">
          <button
            onClick={exportConversation}
            className="w-6 h-6 md:w-8 md:h-8 rounded-lg bg-[var(--agent-bg)] hover:bg-[var(--agent-hover)] flex items-center justify-center text-[var(--settings-text-muted)] hover:text-[var(--settings-text)] transition-all cursor-pointer"
            title="Exportar conversa atual"
          >
            <Download className="w-3 h-3 md:w-4 md:h-4" />
          </button>
          <input ref={fileInputRef} type="file" accept=".csv" onChange={importConversation} className="hidden" />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-6 h-6 md:w-8 md:h-8 rounded-lg bg-[var(--agent-bg)] hover:bg-[var(--agent-hover)] flex items-center justify-center text-[var(--settings-text-muted)] hover:text-[var(--settings-text)] transition-all cursor-pointer"
            title="Importar conversa"
          >
            <Upload className="w-3 h-3 md:w-4 md:h-4" />
          </button>
        </div>
      </div>

      {dialogChatId && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
          onClick={() => setDialogChatId(null)}
        >
          <div
            className="bg-[var(--card-bg)] border border-[var(--chat-border)] rounded-xl p-6 max-w-sm w-full mx-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-[var(--settings-text)]">Opções da Conversa</h3>
              <button
                onClick={() => setDialogChatId(null)}
                className="text-[var(--settings-text-muted)] hover:text-[var(--settings-text)] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <button
                onClick={() => {
                  const chat = chats.find((c) => c.id === dialogChatId)
                  if (chat) {
                    handleEditChatName(dialogChatId, chat.name)
                    setDialogChatId(null)
                  }
                }}
                className="w-full px-4 py-3 rounded-lg bg-[var(--agent-bg)] hover:bg-[var(--agent-hover)] text-[var(--settings-text)] transition-all flex items-center gap-3 cursor-pointer"
              >
                <Pencil className="w-5 h-5 text-blue-400" />
                <span>Editar nome</span>
              </button>

              <button
                onClick={() => {
                  onToggleFavorite(dialogChatId)
                  setDialogChatId(null)
                }}
                className="w-full px-4 py-3 rounded-lg bg-[var(--agent-bg)] hover:bg-[var(--agent-hover)] text-[var(--settings-text)] transition-all flex items-center gap-3 cursor-pointer"
              >
                <Star
                  className={cn(
                    "w-5 h-5",
                    chats.find((c) => c.id === dialogChatId)?.isFavorite
                      ? "text-yellow-400 fill-yellow-400"
                      : "text-gray-400",
                  )}
                />
                <span>
                  {chats.find((c) => c.id === dialogChatId)?.isFavorite
                    ? "Remover dos favoritos"
                    : "Adicionar aos favoritos"}
                </span>
              </button>

              <button
                onClick={() => exportSpecificChat(dialogChatId)}
                className="w-full px-4 py-3 rounded-lg bg-[var(--agent-bg)] hover:bg-[var(--agent-hover)] text-[var(--settings-text)] transition-all flex items-center gap-3 cursor-pointer"
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
                  className="w-full px-4 py-3 rounded-lg bg-[var(--agent-bg)] hover:bg-[var(--agent-hover)] text-[var(--settings-text)] transition-all flex items-center gap-3 cursor-pointer"
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
            className="bg-[var(--card-bg)] border border-[var(--chat-border)] rounded-xl p-6 max-w-sm w-full mx-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-[var(--settings-text)] mb-2">Confirmar exclusão</h3>
              <p className="text-[var(--settings-text-muted)] text-sm">
                Tem certeza que deseja apagar a conversa "{chats.find((c) => c.id === confirmDeleteChatId)?.name}"? Esta
                ação não pode ser desfeita.
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setConfirmDeleteChatId(null)}
                className="flex-1 px-4 py-2 rounded-lg bg-[var(--agent-bg)] hover:bg-[var(--agent-hover)] text-[var(--settings-text)] transition-all cursor-pointer"
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
            <Sparkles className="w-4 h-4 md:w-6 md:h-6 text-green-400" />
            {contextMessages && contextMessages.length > 0 ? "Continuar conversa" : "Criar nova conversa"}
          </div>
          <p className="text-sm md:text-base text-[var(--settings-text-muted)] max-w-md">
            {contextMessages && contextMessages.length > 0
              ? "Digite sua mensagem para continuar a conversa com o contexto das mensagens anteriores"
              : "Comece uma nova conversa selecionando agentes na barra lateral e clicando no botão +"}
          </p>
          {selectedAgents.length > 0 && (
            <Button
              onClick={() => setInput("Olá!")}
              className="mt-4 md:mt-6 bg-purple-600 hover:bg-purple-500 text-white cursor-pointer text-sm md:text-base"
            >
              Iniciar Conversa
            </Button>
          )}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-3 md:p-6 space-y-3 md:space-y-4 min-h-0">
        {currentMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="w-16 h-16 md:w-24 md:h-24 rounded-full bg-gradient-to-br from-purple-900/50 to-blue-900/50 flex items-center justify-center mb-4 md:mb-6 border border-purple-500/30">
              <svg viewBox="0 0 24 24" fill="none" className="w-8 h-8 md:w-12 md:h-12">
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
            <h2 className="text-lg md:text-2xl font-bold text-[var(--settings-text)] mb-2 flex items-center gap-2">
              <Sparkles className="w-5 h-5 md:w-6 md:h-6 text-green-400" />
              {contextMessages && contextMessages.length > 0 ? "Continuar conversa" : "Criar nova conversa"}
            </h2>
            <p className="text-sm md:text-base text-[var(--settings-text-muted)] max-w-md">
              {contextMessages && contextMessages.length > 0
                ? "Digite sua mensagem para continuar a conversa com o contexto das mensagens anteriores"
                : "Comece uma nova conversa selecionando agentes na barra lateral e clicando no botão +"}
            </p>
            {selectedAgents.length > 0 && (
              <Button
                onClick={() => setInput("Olá!")}
                className="mt-4 md:mt-6 bg-purple-600 hover:bg-purple-500 text-white cursor-pointer text-sm md:text-base"
              >
                Iniciar Conversa
              </Button>
            )}
          </div>
        ) : (
          currentMessages.map((message) => (
            <div
              key={message.id}
              className={cn("flex gap-2 md:gap-3 group", message.sender === "user" ? "justify-end" : "justify-start")}
            >
              <div
                className={cn(
                  "max-w-[85%] md:max-w-[70%] rounded-2xl px-3 py-2 md:px-4 md:py-3 cursor-pointer transition-all",
                  message.sender === "user"
                    ? "bg-[var(--message-user-bg)] text-[var(--settings-text)]"
                    : "bg-[var(--message-assistant-bg)] text-[var(--settings-text)] border border-[var(--chat-border)]",
                  selectedMessages.includes(message.id) && "ring-2 ring-purple-500",
                )}
                onClick={() => toggleMessageSelection(message.id)}
              >
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-xs font-medium opacity-70">
                    {message.sender === "user" ? "Você" : "Assistente"}
                  </span>
                  <span className="text-xs opacity-50">
                    {message.timestamp.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  {message.usedAgentIds && message.usedAgentIds.length > 0 && (
                    <div className="flex items-center gap-1 flex-wrap">
                      {message.usedAgentIds.map((agentId) => {
                        const agent = agents.find((a) => a.id === agentId)
                        if (!agent) return null
                        return (
                          <Badge
                            key={agentId}
                            className="text-[10px] md:text-xs px-1.5 py-0 h-5 font-medium"
                            style={{
                              backgroundColor: `${agent.color}20`,
                              color: agent.color,
                              borderColor: `${agent.color}40`,
                              borderWidth: "1px",
                            }}
                          >
                            {agent.icon} {agent.name}
                          </Badge>
                        )
                      })}
                    </div>
                  )}
                </div>
                {(() => {
                  // verifica se o conteúdo é HTML (salvo pelo handleExternalApiResponse)
                  const isHtml =
                    (message as any).asHtml ||
                    /<\/?(?:h1|h2|h3|p|strong|em|code|pre|blockquote|a|hr|ul|ol|li)\b/i.test(message.content)

                  if (isHtml) {
                    return (
                      <div
                        className="prose prose-invert max-w-none text-sm leading-relaxed break-words
                                   prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0 prose-hr:my-3 prose-hr:border-purple-700/40"
                        dangerouslySetInnerHTML={{ __html: message.content }}
                      />
                    )
                  }

                  return <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">{message.content}</p>
                })()}
              </div>
            </div>
          ))
        )}
        {isLoading && (
          <div className="flex gap-2 md:gap-3">
            <div className="max-w-[85%] md:max-w-[70%] rounded-2xl px-3 py-2 md:px-4 md:py-3 bg-[var(--message-assistant-bg)] border border-[var(--chat-border)]">
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

      <div className="border-t border-[var(--chat-border)] bg-[var(--chat-header-bg)] p-2 md:p-4 shrink-0">
        {selectedAgents.length === 0 && (
          <div className="mb-2 md:mb-3 text-center text-xs md:text-sm text-purple-400">
            Selecione pelo menos um agente na barra lateral para começar
          </div>
        )}

        {attachments.length > 0 && (
          <div className="mb-2 md:mb-3 flex flex-wrap gap-2">
            {attachments.map((attachment, index) => (
              <div
                key={index}
                className="flex items-center gap-2 px-2 md:px-3 py-1.5 md:py-2 rounded-lg bg-[var(--input-bg)] border border-[var(--chat-border)] text-xs md:text-sm"
              >
                {getFileIcon(attachment.type)}
                <span className="text-[var(--settings-text)] truncate max-w-[120px] md:max-w-[200px]">
                  {attachment.name}
                </span>
                <span className="text-[var(--settings-text-muted)] text-xs">{formatFileSize(attachment.size)}</span>
                <button
                  onClick={() => removeAttachment(index)}
                  className="text-red-400 hover:text-red-300 transition-colors"
                >
                  <X className="w-3 h-3 md:w-4 md:h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-2">
          {/* Agent tags displayed above the input */}
          <AgentTagInput selectedAgents={selectedAgentObjects} onRemoveAgent={handleRemoveAgentTag} />

          {/* Input controls below the tags */}
          <div className="flex gap-2 md:gap-3 items-end">
            <input
              ref={attachmentInputRef}
              type="file"
              multiple
              accept="image/*,audio/*,.pdf,.doc,.docx,.txt,.csv"
              onChange={handleFileUpload}
              className="hidden"
            />
            <Button
              onClick={() => attachmentInputRef.current?.click()}
              disabled={isUploading || selectedAgents.length === 0 || attachments.length > 0}
              variant="outline"
              className="h-[50px] md:h-[60px] px-3 md:px-4 border-[var(--chat-border)] hover:border-purple-500 cursor-pointer disabled:cursor-not-allowed"
              title={attachments.length > 0 ? "Remova o arquivo atual para anexar outro" : "Anexar arquivo"}
            >
              <Paperclip className="w-4 h-4 md:w-5 md:h-5" />
            </Button>

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
              className="flex-1 bg-[var(--input-bg)] border-[var(--chat-border)] text-[var(--settings-text)] placeholder:text-[var(--settings-text-muted)] focus:border-purple-500 resize-none min-h-[50px] md:min-h-[60px] max-h-[150px] md:max-h-[200px] text-sm md:text-base"
              disabled={selectedAgents.length === 0}
            />
            <Button
              onClick={sendMessage}
              disabled={(!input.trim() && attachments.length === 0) || selectedAgents.length === 0 || isLoading}
              className="bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white h-[50px] md:h-[60px] px-4 md:px-6 cursor-pointer disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4 md:w-5 md:h-5" />
            </Button>
          </div>
        </div>

        {isUploading && (
          <div className="mt-2 text-xs md:text-sm text-purple-400 flex items-center gap-2">
            <div className="w-3 h-3 md:w-4 md:h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
            Enviando arquivo...
          </div>
        )}
      </div>
    </div>
  )
}
