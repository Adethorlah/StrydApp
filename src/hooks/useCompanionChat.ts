import { useState, useCallback } from "react"
import { supabase } from "../lib/supabase"
import { CompanionContext } from "../types"

interface Message {
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

export function useCompanionChat(context: CompanionContext) {
    const [messages, setMessages] = useState<Message[]>([])
    const [isLoading, setIsLoading] = useState(false)

    const sendMessage = useCallback(async (userMessage: string) => {
        if (!userMessage.trim() || isLoading) return

        setMessages((prev) => [...prev, { role: "user", content: userMessage }])
        setIsLoading(true)

        try {
            const systemMessage = {
                role: "system",
                content: buildSystemPrompt(context),
            }

            const { data, error } = await supabase.functions.invoke("companion-chat", {
                body: {
                    messages: [systemMessage, ...messages.slice(-5), { role: "user", content: userMessage }],
                    userName: context.userName,
                    options: { max_tokens: 300, temperature: 0.5 },
                },
            })

            if (error) throw error

            setMessages((prev) => [...prev, { role: "assistant", content: data.content }])
        } catch {
            setMessages((prev) => [...prev, { role: "assistant", content: FALLBACK_MESSAGE }])
        } finally {
            setIsLoading(false)
        }
    }, [isLoading, messages, context])

    const initWithGreeting = useCallback((userName: string) => {
        setMessages([
            {
                role: "assistant",
                content: `Hey ${userName}, I'm here whenever you need me. Just tap here if you get stuck or want to talk through a step.`,
            },
        ])
    }, [])

    return { messages, isLoading, sendMessage, initWithGreeting }
}