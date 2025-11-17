"use client"

import type React from "react"
import { Badge } from "@/components/ui/badge"
import { useState, useRef, useEffect } from "react"
import type { Agent, Message, Chat } from "@/types/chat"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/toast"
import { Send, Plus, X, Sparkles, MessageSquarePlus, Download, Upload, MoreVertical, Paperclip, ImageIcon, FileText, Music, Star, Menu, Pencil, Check } from 'lucide-react'
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import * as XLSX from 'xlsx'
import { Document, Paragraph, TextRun, Packer } from 'docx'
import pptxgen from 'pptxgenjs'

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
  selectedMessagesGlobal?: Array<{ chatId: string; messageIds: string[] }>
  onSelectedMessagesGlobalChange?: (selection: Array<{ chatId: string; messageIds: string[] }>) => void
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
  selectedMessagesGlobal,
  onSelectedMessagesGlobalChange,
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
  const [userDisplayName, setUserDisplayName] = useState<string>("")
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const attachmentInputRef = useRef<HTMLInputElement>(null)
  const editInputRef = useRef<HTMLInputElement>(null) // Ref for editing input
  const { addToast } = useToast()

  interface Attachment {
    name: string
    data: string // base64 or URL
    type: string // "IMAGE", "AUDIO", "VIDEO", "DOCUMENT"
    mimeType: string
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

  useEffect(() => {
    console.log("[v0] 🔍 Chat changed to:", currentChatId)
    console.log("[v0] 🔍 selectedMessagesGlobal:", selectedMessagesGlobal)

    const currentSelection = selectedMessagesGlobal?.find((sel) => sel.chatId === currentChatId)

    if (currentSelection) {
      console.log("[v0] ✅ Setting local selection from global")
      setSelectedMessages(currentSelection.messageIds)
    } else {
      console.log("[v0] 🎯 Clearing local selection (different chat)")
      setSelectedMessages([])
    }
  }, [currentChatId, selectedMessagesGlobal])

  useEffect(() => {
    if (selectedMessages.length > 0) {
      console.log("[v0] 📤 Updating global from local selection")

      const existingSelection = selectedMessagesGlobal?.find((sel) => sel.chatId === currentChatId)

      if (existingSelection) {
        // Update existing selection
        onSelectedMessagesGlobalChange?.(
          selectedMessagesGlobal!.map((sel) =>
            sel.chatId === currentChatId ? { chatId: currentChatId, messageIds: selectedMessages } : sel,
          ),
        )
      } else {
        // Add new selection
        onSelectedMessagesGlobalChange?.([
          ...(selectedMessagesGlobal || []),
          { chatId: currentChatId, messageIds: selectedMessages },
        ])
      }
    } else {
      const hasCurrentSelection = selectedMessagesGlobal?.find((sel) => sel.chatId === currentChatId)

      if (hasCurrentSelection) {
        console.log("[v0] 🧹 Clearing global for current chat")
        onSelectedMessagesGlobalChange?.(selectedMessagesGlobal!.filter((sel) => sel.chatId !== currentChatId))
      }
    }
  }, [selectedMessages])

  useEffect(() => {
    const loadUserDisplayName = async () => {
      const supabase = createClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (session) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("id", session.user.id)
          .single()

        if (profile?.display_name) {
          setUserDisplayName(profile.display_name)
          console.log("[v0] 👤 User display name loaded:", profile.display_name)
        }
      }
    }

    loadUserDisplayName()
  }, [])

  const sendMessage = async () => {
    if ((!input.trim() && attachments.length === 0) || selectedAgents.length === 0) return

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input || (attachments.length > 0 ? `[Anexo: ${attachments[0].name}]` : ""),
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

      if (userDisplayName) {
        messageToSend = `[Usuário: ${userDisplayName}]\n${messageToSend}`
        console.log("[v0] 👤 Prepending user name to message:", userDisplayName)
      }

      let payload: any

      if (attachmentsToSend.length > 0) {
        const attachment = attachmentsToSend[0]
        
        if (attachment.type === "IMAGE") {
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
            metadata: {
              conversationId: currentChatId,
              messageId: userMessage.id,
              agentIds: selectedAgents,
            },
          }
        } else if (attachment.type === "AUDIO") {
          payload = {
            content: {
              audio: {
                url: attachment.data,
              },
            },
            type: "AUDIO",
            contactIdentifier: currentChatId,
            contactName: `Chat ${currentChatId}`,
            metadata: {
              conversationId: currentChatId,
              messageId: userMessage.id,
              agentIds: selectedAgents,
            },
          }
        } else if (attachment.type === "VIDEO") {
          payload = {
            content: {
              video: {
                url: attachment.data,
                caption: messageToSend || "Vídeo enviado",
              },
            },
            type: "VIDEO",
            contactIdentifier: currentChatId,
            contactName: `Chat ${currentChatId}`,
            metadata: {
              conversationId: currentChatId,
              messageId: userMessage.id,
              agentIds: selectedAgents,
            },
          }
        } else {
          // DOCUMENT
          payload = {
            content: {
              document: {
                url: attachment.data,
                filename: attachment.name,
                caption: messageToSend || "Documento enviado",
              },
            },
            type: "DOCUMENT",
            contactIdentifier: currentChatId,
            contactName: `Chat ${currentChatId}`,
            metadata: {
              conversationId: currentChatId,
              messageId: userMessage.id,
              agentIds: selectedAgents,
            },
          }
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
          metadata: {
            conversationId: currentChatId,
            messageId: userMessage.id,
            agentIds: selectedAgents,
          },
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
    const stripHtml = (html: string) => {
      const tmp = document.createElement("div")
      tmp.innerHTML = html
      return tmp.textContent || tmp.innerText || ""
    }
    const combinedText = selected.map((m) => stripHtml(m.content)).join("\n\n")
    setInput(combinedText)
    setSelectedMessages([])

    onSelectedMessagesGlobalChange?.([])
    console.log("[v0] 🗑️ Cleared local selection after use")
  }

  const selectionsFromOtherChats = selectedMessagesGlobal?.filter((sel) => sel.chatId !== currentChatId) || []
  const totalSelectedMessages = selectedMessagesGlobal?.reduce((sum, sel) => sum + sel.messageIds.length, 0) || 0
  const totalSelectedChats = selectedMessagesGlobal?.length || 0

  const addSelectedMessagesToCurrentChat = () => {
    console.log("[v0] 🎯 addSelectedMessagesToCurrentChat called")

    if (!selectedMessagesGlobal || selectedMessagesGlobal.length === 0) {
      console.log("[v0] ❌ No selectedMessagesGlobal")
      return
    }

    const stripHtml = (html: string) => {
      const tmp = document.createElement("div")
      tmp.innerHTML = html
      return tmp.textContent || tmp.innerText || ""
    }

    const allSelectedTexts: string[] = []

    selectedMessagesGlobal.forEach((selection) => {
      const sourceChat = chats.find((c) => c.id === selection.chatId)
      const sourceMessages = messages[selection.chatId] || []
      const selected = sourceMessages.filter((m) => selection.messageIds.includes(m.id))

      selected.forEach((msg) => {
        allSelectedTexts.push(stripHtml(msg.content))
      })
    })

    const combinedText = allSelectedTexts.join("\n\n")
    setInput(combinedText)

    // Clear all selections
    onSelectedMessagesGlobalChange?.([])
    setSelectedMessages([])

    addToast({
      title: "Mensagens adicionadas",
      description: `${totalSelectedMessages} mensagem(ns) de ${totalSelectedChats} conversa(s) adicionada(s)`,
      variant: "success",
    })

    console.log("[v0] 🗑️ Cleared all selections after adding to input")
  }

  const createNewChatWithSelected = () => {
    const selected = currentMessages.filter((m) => selectedMessages.includes(m.id))
    const originConversationName = currentChat?.name || "Conversa sem nome"
    const messagesWithOrigin = selected.map((msg) => ({
      ...msg,
      originConversation: originConversationName,
    }))
    onCreateChatWithMessages(messagesWithOrigin)

    onSelectedMessagesGlobalChange?.([])
    setSelectedMessages([])

    addToast({
      title: "Nova conversa criada",
      description: `${selected.length} mensagem(ns) movida(s) de "${originConversationName}"`,
      variant: "success",
    })

    console.log("[v0] 🗑️ Cleared local selection after creating new chat")
  }

  const copyAsMarkdown = async () => {
    if (!selectedMessagesGlobal || selectedMessagesGlobal.length === 0) return

    const stripHtml = (html: string) => {
      const tmp = document.createElement("div")
      tmp.innerHTML = html
      return tmp.textContent || tmp.innerText || ""
    }

    const allMarkdown: string[] = []

    selectedMessagesGlobal.forEach((selection) => {
      const sourceMessages = messages[selection.chatId] || []
      const selected = sourceMessages.filter((m) => selection.messageIds.includes(m.id))

      selected.forEach((m) => {
        const cleanContent = stripHtml(m.content)
        allMarkdown.push(cleanContent)
      })
    })

    const markdown = allMarkdown.join("\n\n")
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `mensagens-${new Date().toISOString().split("T")[0]}.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    addToast({
      title: "Markdown exportado",
      description: `${totalSelectedMessages} mensagem(ns) de ${totalSelectedChats} conversa(s) exportada(s)`,
      variant: "success",
    })
  }

  const copyAsWord = async () => {
    if (!selectedMessagesGlobal || selectedMessagesGlobal.length === 0) return

    const stripHtml = (html: string) => {
      const tmp = document.createElement("div")
      tmp.innerHTML = html
      return tmp.textContent || tmp.innerText || ""
    }

    const allMessages: string[] = []

    selectedMessagesGlobal.forEach((selection) => {
      const sourceMessages = messages[selection.chatId] || []
      const selected = sourceMessages.filter((m) => selection.messageIds.includes(m.id))

      selected.forEach((m) => {
        const content = stripHtml(m.content)
        allMessages.push(content)
      })
    })

    const textContent = allMessages.join('\n\n')
    const blob = new Blob([textContent], { type: 'application/msword;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `mensagens-${new Date().toISOString().split('T')[0]}.doc`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    addToast({
      title: "Word exportado",
      description: `${totalSelectedMessages} mensagem(ns) exportada(s)`,
      variant: "success",
    })
  }

  const copyAsPowerPoint = async () => {
    if (!selectedMessagesGlobal || selectedMessagesGlobal.length === 0) return

    const stripHtml = (html: string) => {
      const tmp = document.createElement("div")
      tmp.innerHTML = html
      return tmp.textContent || tmp.innerText || ""
    }

    const allMessages: string[] = []

    selectedMessagesGlobal.forEach((selection) => {
      const sourceMessages = messages[selection.chatId] || []
      const selected = sourceMessages.filter((m) => selection.messageIds.includes(m.id))

      selected.forEach((m) => {
        const content = stripHtml(m.content)
        allMessages.push(content)
      })
    })

    const textContent = allMessages.join('\n\n')
    const blob = new Blob([textContent], { type: 'application/vnd.ms-powerpoint;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `mensagens-${new Date().toISOString().split('T')[0]}.ppt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    addToast({
      title: "PowerPoint exportado",
      description: `${totalSelectedMessages} mensagem(ns) exportada(s)`,
      variant: "success",
    })
  }

  const copyAsExcel = async () => {
    if (!selectedMessagesGlobal || selectedMessagesGlobal.length === 0) return

    const stripHtml = (html: string) => {
      const tmp = document.createElement("div")
      tmp.innerHTML = html
      return tmp.textContent || tmp.innerText || ""
    }

    const rows: string[] = []

    selectedMessagesGlobal.forEach((selection) => {
      const sourceMessages = messages[selection.chatId] || []
      const selected = sourceMessages.filter((m) => selection.messageIds.includes(m.id))

      selected.forEach((m) => {
        const content = stripHtml(m.content).replace(/\t/g, ' ').replace(/\n/g, ' ')
        rows.push(content)
      })
    })

    const tsvContent = rows.join('\n')
    const blob = new Blob([tsvContent], { type: 'text/tab-separated-values;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `mensagens-${new Date().toISOString().split('T')[0]}.xls`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    addToast({
      title: "Excel exportado",
      description: `${totalSelectedMessages} mensagem(ns) de ${totalSelectedChats} conversa(s) exportada(s)`,
      variant: "success",
    })
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
    if (type === "IMAGE") return <ImageIcon className="w-4 h-4" />
    if (type === "AUDIO") return <Music className="w-4 h-4" />
    if (type === "VIDEO") return <FileText className="w-4 h-4" />
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
    if (!files || files.length === 0) return

    const file = files[0]
    
    let attachmentType: string
    if (file.type.startsWith("image/")) {
      attachmentType = "IMAGE"
    } else if (file.type.startsWith("audio/")) {
      attachmentType = "AUDIO"
    } else if (file.type.startsWith("video/")) {
      attachmentType = "VIDEO"
    } else {
      attachmentType = "DOCUMENT"
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const base64Data = e.target?.result as string
      setAttachments((prev) => [
        ...prev,
        {
          name: file.name,
          data: base64Data,
          type: attachmentType,
          mimeType: file.type,
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
      <div className="bg-[var(--chat-header-bg)] border-b border-[var(--chat-border)] px-2 md:px-4 py-2 flex items-center gap-1 md:gap-2 overflow-x-auto shrink-0 [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-gray-900/30 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-purple-500 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:hover:bg-purple-400">
        <button
          onClick={onOpenMobileSidebar}
          className="md:hidden w-8 h-8 rounded-lg bg-[var(--agent-bg)] hover:bg-[var(--agent-hover)] flex items-center justify-center text-[var(--settings-text-muted)] hover:text-[var(--settings-text)] transition-all cursor-pointer shrink-0 mr-1"
          title="Abrir menu"
        >
          <Menu className="w-4 h-4" />
        </button>

        {chats.map((chat) => {
          const isActive = currentChatId === chat.id
          const hasSelection = selectedMessagesGlobal?.some((sel) => sel.chatId === chat.id)

          return (
            <div
              key={chat.id}
              className="flex items-center gap-1 shrink-0 relative"
              draggable
              onDragStart={(e) => handleDragStart(e, chat.id)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, chat.id)}
              onDragEnd={handleDragEnd}
            >
              {isActive && (
                <div className="absolute -top-1 -left-1 w-3 h-3 bg-green-500 rounded-full border-2 border-[var(--chat-header-bg)]" />
              )}

              {hasSelection && !isActive && (
                <div className="absolute -top-1 -left-1 w-3 h-3 bg-yellow-500 rounded-full border-2 border-[var(--chat-header-bg)]" />
              )}

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
          )
        })}
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
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-[var(--settings-text)]">Opções da Conversa</h3>
                <p className="text-sm text-[var(--settings-text-muted)] mt-1 truncate">
                  {chats.find((c) => c.id === dialogChatId)?.name || "Conversa sem nome"}
                </p>
              </div>
              <button
                onClick={() => setDialogChatId(null)}
                className="text-[var(--settings-text-muted)] hover:text-[var(--settings-text)] transition-colors cursor-pointer ml-2"
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

      {/* Updated banner to show selections from other chats */}
      {selectionsFromOtherChats.length > 0 && (
        <div className="bg-blue-900/20 border-b border-blue-500/30 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquarePlus className="w-4 h-4 text-blue-400" />
            <span className="text-blue-300 text-sm">
              {totalSelectedMessages} mensagem(ns) selecionada(s) de {selectionsFromOtherChats.length} conversa(s)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={addSelectedMessagesToCurrentChat}
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs md:text-sm flex items-center gap-2 cursor-pointer px-3 h-8 md:h-9"
            >
              <Plus className="w-3 h-3 md:w-4 md:h-4" />
              Adicionar aqui
            </Button>
            <Button
              onClick={createNewChatWithSelected}
              className="bg-green-600 hover:bg-green-500 text-white text-xs md:text-sm flex items-center gap-2 cursor-pointer px-3 h-8 md:h-9"
            >
              <MessageSquarePlus className="w-3 h-3 md:w-4 md:h-4" />
              Novo Chat
            </Button>
            <button
              onClick={() => {
                onSelectedMessagesGlobalChange?.([])
                setSelectedMessages([])
              }}
              className="text-gray-400 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {selectedMessages.length > 0 && selectedMessagesGlobal?.some((sel) => sel.chatId === currentChatId) && (
        <div className="bg-purple-900/20 border-b border-purple-500/30 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span className="text-purple-300 text-sm">
              {selectedMessages.length} mensagem{selectedMessages.length > 1 ? "s" : ""} selecionada
              {selectedMessages.length > 1 ? "s" : ""}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              onClick={copyAsMarkdown}
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs md:text-sm flex items-center gap-1 md:gap-2 cursor-pointer px-2 md:px-3 h-8 md:h-9"
              title="Exportar como Markdown"
            >
              <Download className="w-3 h-3 md:w-4 md:h-4" />
              <span className="hidden md:inline">Markdown</span>
            </Button>
            <Button
              onClick={copyAsWord}
              className="bg-blue-700 hover:bg-blue-600 text-white text-xs md:text-sm flex items-center gap-1 md:gap-2 cursor-pointer px-2 md:px-3 h-8 md:h-9"
              title="Exportar para Word"
            >
              <Download className="w-3 h-3 md:w-4 md:h-4" />
              <span className="hidden md:inline">Word</span>
            </Button>
            <Button
              onClick={copyAsPowerPoint}
              className="bg-orange-600 hover:bg-orange-500 text-white text-xs md:text-sm flex items-center gap-1 md:gap-2 cursor-pointer px-2 md:px-3 h-8 md:h-9"
              title="Exportar para PowerPoint"
            >
              <Download className="w-3 h-3 md:w-4 md:h-4" />
              <span className="hidden md:inline">PPT</span>
            </Button>
            <Button
              onClick={copyAsExcel}
              className="bg-green-700 hover:bg-green-600 text-white text-xs md:text-sm flex items-center gap-1 md:gap-2 cursor-pointer px-2 md:px-3 h-8 md:h-9"
              title="Exportar para Excel"
            >
              <Download className="w-3 h-3 md:w-4 md:h-4" />
              <span className="hidden md:inline">Excel</span>
            </Button>
            <Button
              onClick={createNewChatWithSelected}
              className="bg-green-600 hover:bg-green-500 text-white text-xs md:text-sm flex items-center gap-1 md:gap-2 cursor-pointer px-2 md:px-3 h-8 md:h-9"
            >
              <MessageSquarePlus className="w-3 h-3 md:w-4 md:h-4" />
              <span className="hidden sm:inline">Novo Chat</span>
            </Button>
            <Button
              onClick={useSelectedMessages}
              className="bg-purple-600 hover:bg-purple-500 text-white text-xs md:text-sm cursor-pointer px-2 md:px-3 h-8 md:h-9"
            >
              Usar
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
                  {message.originConversation && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/40">
                      De: {message.originConversation}
                    </span>
                  )}
                  {message.usedAgentIds && message.usedAgentIds.length > 0 && (
                    <div className="flex items-center gap-1 flex-wrap">
                      {message.usedAgentIds.map((agentId) => {
                        const agent = agents.find((a) => a.id === agentId)
                        if (!agent) return null
                        // </CHANGE> Fixed unterminated string by extracting template literals
                        const badgeBgColor = agent.color + "20"
                        const badgeBorderColor = agent.color + "40"
                        return (
                          <Badge
                            key={agentId}
                            className="text-[10px] md:text-xs px-1.5 py-0 h-5 font-medium"
                            style={{
                              backgroundColor: badgeBgColor,
                              color: agent.color,
                              borderColor: badgeBorderColor,
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
                  const isHtml =
                    message.asHtml === true ||
                    /<\/?(?:h1|h2|h3|p|strong|em|code|pre|blockquote|a|hr|ul|ol|li)\b/i.test(message.content)

                  if (isHtml) {
                    return (
                      <div
                        className="prose prose-invert max-w-none text-sm leading-relaxed break-words
                                   prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0 prose-hr:my-3 prose-hr:border-purple-700/40
                                   prose-h1:text-xl prose-h1:font-bold prose-h1:mt-4 prose-h1:mb-2
                                   prose-h2:text-lg prose-h2:font-bold prose-h2:mt-3 prose-h2:mb-2
                                   prose-h3:text-base prose-h3:font-semibold prose-h3:mt-2 prose-h3:mb-1
                                   prose-strong:text-purple-300 prose-strong:font-semibold
                                   prose-em:text-purple-200 prose-em:italic
                                   prose-code:text-purple-300 prose-code:bg-purple-900/30 prose-code:px-1 prose-code:py-0.5 prose-code:rounded
                                   prose-pre:bg-gray-900/50 prose-pre:border prose-pre:border-purple-700/40 prose-pre:p-3 prose-pre:rounded-lg
                                   prose-blockquote:border-l-4 prose-blockquote:border-purple-500 prose-blockquote:pl-4 prose-blockquote:italic
                                   prose-a:text-blue-400 prose-a:underline hover:prose-a:text-blue-300"
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
        <div className="flex flex-col gap-2">
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 pb-2 border-b border-[var(--chat-border)]">
              {attachments.map((attachment, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/20 border border-blue-500/40 text-blue-300 text-xs"
                >
                  {getFileIcon(attachment.type)}
                  <span className="max-w-[150px] truncate">{attachment.name}</span>
                  <span className="text-[10px] opacity-70">({formatFileSize(attachment.size)})</span>
                  <button
                    onClick={() => removeAttachment(index)}
                    className="ml-1 hover:bg-black/20 rounded-full p-0.5 transition-colors"
                    title="Remover anexo"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Input controls with tags inside */}
          <div className="flex gap-2 md:gap-3 items-end">
            <input
              ref={attachmentInputRef}
              type="file"
              multiple
              accept="image/*,audio/*,video/*,.pdf,.doc,.docx,.txt,.csv"
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

            <div className="flex-1 relative">
              <div className="absolute top-2 left-2 flex flex-wrap gap-1 max-w-[calc(100%-1rem)] z-10 pointer-events-none">
                {selectedAgentObjects.map((agent) => {
                  const agentColor = agent.color && agent.color.trim() !== "" ? agent.color : "#8b5cf6"
                  const bgColor = agentColor + "15"
                  const borderColor = agentColor + "60"
                  
                  return (
                    <div
                      key={agent.id}
                      className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium pointer-events-auto"
                      style={{
                        backgroundColor: bgColor,
                        borderColor: borderColor,
                        borderWidth: "1px",
                        borderStyle: "solid",
                        color: agentColor,
                      }}
                    >
                      <span className="text-sm">{agent.icon}</span>
                      <span className="text-[10px] font-semibold">{agent.trigger_word}</span>
                      <button
                        onClick={() => handleRemoveAgentTag(agent.id)}
                        className="ml-0.5 hover:bg-black/20 rounded-full p-0.5 transition-colors"
                        title={`Remover ${agent.name}`}
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  )
                })}
              </div>
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
                style={{
                  paddingTop: selectedAgentObjects.length > 0 ? "2rem" : "0.75rem",
                }}
                disabled={selectedAgents.length === 0}
              />
            </div>
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
