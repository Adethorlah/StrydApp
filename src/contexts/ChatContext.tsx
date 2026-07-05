import { createContext, useContext, useState, useCallback, useRef, ReactNode } from "react"
import { supabase } from "../services/supabase.service"
import { CompanionContext } from "../types"

export interface Message {
  role: "user" | "assistant"
  content: string
}

const FALLBACK_MESSAGE = "Take a moment. When you are ready, start with whatever feels most natural."

function buildSystemPrompt(context: CompanionContext): string {
  return `You are a calm, supportive companion for a focus and execution app called STRYD.
The user is working on: ${context.currentTask ?? "a task"}.
Current step: ${context.currentStepTitle ?? "N/A"} — ${context.currentStepInstruction ?? ""}
They have completed ${context.completedSteps} of ${context.totalSteps} steps.
Mood score: ${context.moodScore ?? "unknown"}

Rules:
- Be calm, direct, and human
- Never use exclamation marks or ALL CAPS
- Never use urgency or pressure
- Never tell the user they are behind or doing it wrong
- If they are stuck, offer to shrink the scope or reframe
- Address the user by name only if provided in UI context
- Offer one suggestion at a time
- Respect that the user is skilled — do not explain basic concepts
- Never reference specific software tools`
}

interface ChatContextValue {
  messages: Message[]
  isLoading: boolean
  sendMessage: (userMessage: string, context: CompanionContext) => Promise<void>
  initWithGreeting: (userName: string) => void
}

const ChatContext = createContext<ChatContextValue | null>(null)

export function ChatProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const isLoadingRef = useRef(false)

  const sendMessage = useCallback(async (userMessage: string, context: CompanionContext) => {
    if (!userMessage.trim() || isLoadingRef.current) return

    isLoadingRef.current = true
    setIsLoading(true)

    const newMessage: Message = { role: "user", content: userMessage }
    let recent: Message[] = []
    setMessages((prev) => {
      recent = prev.slice(-5)
      return [...prev, newMessage]
    })

    try {
      const systemMessage = {
        role: "system",
        content: buildSystemPrompt(context),
      }

      const { data, error } = await supabase.functions.invoke("companion-chat", {
        body: {
          messages: [systemMessage, ...recent, newMessage],
          options: { max_tokens: 300, temperature: 0.5 },
        },
      })

      if (error) throw error

      setMessages((prev) => [...prev, { role: "assistant", content: data.content }])
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: FALLBACK_MESSAGE }])
    } finally {
      setIsLoading(false)
      isLoadingRef.current = false
    }
  }, [])

  const initWithGreeting = useCallback((userName: string) => {
    setMessages([
      {
        role: "assistant",
        content: `Hey ${userName}, I'm here whenever you need me. Just tap here if you get stuck or want to talk through anything.`,
      },
    ])
  }, [])

  return (
    <ChatContext.Provider value={{ messages, isLoading, sendMessage, initWithGreeting }}>
      {children}
    </ChatContext.Provider>
  )
}

export function useChat(): ChatContextValue {
  const ctx = useContext(ChatContext)
  if (!ctx) throw new Error("useChat must be used within ChatProvider")
  return ctx
}
