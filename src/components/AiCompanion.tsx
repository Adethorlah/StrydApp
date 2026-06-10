import { useState, useRef, useCallback } from "react"
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  ScrollView,
} from "react-native"
import { theme } from "../theme/tokens"
import { AiChatBubble } from "./AiChatBubble"
import { callDeepseek } from "../lib/deepseek"

interface CompanionContext {
  userName: string
  currentTask?: string
  currentStepTitle?: string
  currentStepInstruction?: string
  moodScore?: number
  completedSteps: number
  totalSteps: number
}

interface CompanionProps {
  context: CompanionContext
  isVisible: boolean
  shouldPulse: boolean
  onPulseClear?: () => void
}

const { height: SCREEN_HEIGHT } = Dimensions.get("window")
const PANEL_HEIGHT = SCREEN_HEIGHT * 0.65

export function AiCompanion({ context, isVisible, shouldPulse, onPulseClear }: CompanionProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<
    { role: "user" | "assistant"; content: string }[]
  >([])
  const [inputText, setInputText] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const slideAnim = useRef(new Animated.Value(PANEL_HEIGHT)).current
  const pulseAnim = useRef(new Animated.Value(1)).current
  const inputRef = useRef<TextInput>(null)

  const hasSentIntro = useRef(false)

  // Pulse animation
  useState(() => {
    if (shouldPulse) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
        { iterations: 3 }
      ).start()
    }
  })

  const openPanel = useCallback(() => {
    setIsOpen(true)
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start()

    if (!hasSentIntro.current && context.userName) {
      setMessages([
        {
          role: "assistant",
          content: `Hey ${context.userName}, I'm here whenever you need me. Just tap here if you get stuck or want to talk through a step.`,
        },
      ])
      hasSentIntro.current = true
    }

    if (onPulseClear) onPulseClear()
  }, [slideAnim, context.userName, onPulseClear])

  const closePanel = useCallback(() => {
    Animated.timing(slideAnim, {
      toValue: PANEL_HEIGHT,
      duration: 250,
      useNativeDriver: true,
    }).start(() => setIsOpen(false))
  }, [slideAnim])

  const sendMessage = useCallback(async () => {
    if (!inputText.trim() || isLoading) return

    const userMessage = inputText.trim()
    setInputText("")
    setMessages((prev) => [...prev, { role: "user", content: userMessage }])
    setIsLoading(true)

    try {
      const systemMessage = {
        role: "system",
        content: `You are a calm, supportive companion for a focus and execution app called STRYD.
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
- Never reference specific software tools`,
      }

      const response = await callDeepseek(
        [systemMessage, ...messages.slice(-5), { role: "user", content: userMessage }],
        context.userName,
        { max_tokens: 300, temperature: 0.5 }
      )

      setMessages((prev) => [...prev, { role: "assistant", content: response }])
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Take a moment. When you are ready, start with whatever feels most natural.",
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }, [inputText, isLoading, messages, context])

  if (!isVisible) return null

  return (
    <>
      <TouchableOpacity
        onPress={openPanel}
        style={styles.bubbleContainer}
        activeOpacity={0.7}
      >
        <Animated.View
          style={[styles.bubble, shouldPulse && { transform: [{ scale: pulseAnim }] }]}
        >
          <Text style={styles.bubbleIcon}>💬</Text>
        </Animated.View>
      </TouchableOpacity>

      {isOpen && (
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={closePanel}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.keyboardView}
          >
            <TouchableOpacity
              activeOpacity={1}
              onPress={() => {}}
              style={styles.panel}
            >
              <Animated.View
                style={[
                  styles.panelInner,
                  { transform: [{ translateY: slideAnim }] },
                ]}
              >
                <View style={styles.handle} />
                <ScrollView style={styles.chatArea}>
                  {messages.map((msg, i) => (
                    <AiChatBubble
                      key={i}
                      message={msg.content}
                      isUser={msg.role === "user"}
                    />
                  ))}
                  {isLoading && (
                    <Text style={styles.loadingText}>Thinking...</Text>
                  )}
                </ScrollView>
                <View style={styles.inputRow}>
                  <TextInput
                    ref={inputRef}
                    value={inputText}
                    onChangeText={setInputText}
                    placeholder="Type here..."
                    placeholderTextColor={theme.colors.onSurfaceVariant}
                    style={styles.input}
                    onSubmitEditing={sendMessage}
                    returnKeyType="send"
                  />
                  <TouchableOpacity
                    onPress={sendMessage}
                    style={styles.sendButton}
                    disabled={!inputText.trim() || isLoading}
                  >
                    <Text style={styles.sendText}>Send</Text>
                  </TouchableOpacity>
                </View>
              </Animated.View>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </TouchableOpacity>
      )}
    </>
  )
}

const styles = StyleSheet.create({
  bubbleContainer: {
    position: "absolute",
    bottom: 24,
    right: 24,
    zIndex: 100,
  },
  bubble: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  bubbleIcon: {
    fontSize: 24,
  },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.3)",
    zIndex: 200,
    justifyContent: "flex-end",
  },
  keyboardView: {
    flex: 1,
    justifyContent: "flex-end",
  },
  panel: {
    flex: 1,
    justifyContent: "flex-end",
  },
  panelInner: {
    height: PANEL_HEIGHT,
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    paddingTop: theme.spacing.sm,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.outline,
    alignSelf: "center",
    marginBottom: theme.spacing.md,
  },
  chatArea: {
    flex: 1,
    paddingHorizontal: theme.spacing.md,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.outlineVariant,
  },
  input: {
    flex: 1,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body.medium.fontSize,
    color: theme.colors.onSurface,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.surfaceContainerHighest,
    borderRadius: theme.radius.full,
    marginRight: theme.spacing.sm,
  },
  sendButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  sendText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body.medium.fontSize,
    fontWeight: theme.typography.weight.medium,
    color: theme.colors.primary,
  },
  loadingText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body.small.fontSize,
    color: theme.colors.onSurfaceVariant,
    paddingVertical: theme.spacing.sm,
  },
})
