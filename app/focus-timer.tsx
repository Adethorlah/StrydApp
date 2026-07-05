import { useCallback, useState, useEffect, useRef } from "react"
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { router } from "expo-router"
import { LinearGradient } from "expo-linear-gradient"
import { theme } from "../src/theme/tokens"
import { CompanionAvatar } from "../src/components/CompanionAvatar"
import { useTaskState } from "../src/hooks/useTaskState"
import { useOnboarding } from "../src/hooks/useOnboarding"
import { useChat } from "../src/contexts/ChatContext"

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get("window")
const CHAT_HEIGHT = SCREEN_HEIGHT * 0.45

// --- Focus messages ---
const FOCUS_MESSAGES = [
  "You don't have to do it perfectly. Just begin.",
  "One small move is enough to get started.",
  "You don't need to see the whole path. Just this step.",
  "It doesn't have to be good yet. It just has to be started.",
  "Progress doesn't have to be fast. It just has to be real.",
  "One thing at a time. Just this step, nothing else.",
  "Stay here. This moment, this task.",
  "You don't have to think about what comes next.",
  "Everything else can wait. This is the only thing right now.",
  "You already know how to do this. Trust that.",
  "You've done hard things before. This is just the next one.",
  "Your ability hasn't gone anywhere. It's still there.",
  "You are more capable than the resistance makes you feel.",
  "The fact that you started is already something.",
  "Slow is fine. Moving is what matters.",
]

function getShuffledMessages(): string[] {
  return [...FOCUS_MESSAGES].sort(() => Math.random() - 0.5).slice(0, 7)
}

// --- Fading message ---
function FadingMessage({ messages }: { messages: string[] }) {
  const [index, setIndex] = useState(0)
  const opacity = useRef(new Animated.Value(0)).current

  useEffect(() => {
    let cancelled = false

    const cycle = () => {
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.delay(7000),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished && !cancelled) {
          setIndex((prev) => (prev + 1) % messages.length)
        }
      })
    }

    cycle()

    return () => {
      cancelled = true
      opacity.stopAnimation()
    }
  }, [index, messages])

  return (
    <Animated.Text style={[focusStyles.heroMessage, { opacity }]}>
      "{messages[index]}"
    </Animated.Text>
  )
}

// --- Main screen ---
export default function FocusTimer() {
  const insets = useSafeAreaInsets()
  const { userName } = useOnboarding()
  const {
    currentTask,
    currentStep,
    currentStepIndex,
    completedStepIds,
    completeStepAndAdvance,
  } = useTaskState()

  const { messages, isLoading, sendMessage, initWithGreeting } = useChat()

  const [showChat, setShowChat] = useState(false)
  const [inputText, setInputText] = useState("")
  const [acknowledgment, setAcknowledgment] = useState<string | null>(null)
  const scrollRef = useRef<ScrollView>(null)
  const chatSlide = useRef(new Animated.Value(CHAT_HEIGHT)).current
  const hasSentIntro = useRef(false)

  const stepMessages = useRef(getShuffledMessages()).current

  const companionContext = {
    userName: userName ?? "there",
    currentTask: currentTask?.title,
    currentStepTitle: currentStep?.title,
    currentStepInstruction: currentStep?.instruction,
    completedSteps: completedStepIds.length,
    totalSteps: currentTask?.steps.length ?? 0,
  }

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100)
    }
  }, [messages])

  const openChat = useCallback(() => {
    if (!hasSentIntro.current && messages.length === 0) {
      initWithGreeting(userName ?? "there")
      hasSentIntro.current = true
    }
    setShowChat(true)
    Animated.spring(chatSlide, {
      toValue: 0,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start()
  }, [chatSlide, messages.length, initWithGreeting, userName])

  const closeChat = useCallback(() => {
    Animated.timing(chatSlide, {
      toValue: CHAT_HEIGHT,
      duration: 280,
      useNativeDriver: true,
    }).start(() => setShowChat(false))
  }, [chatSlide])

  const handleSend = useCallback(async () => {
    if (!inputText.trim() || isLoading) return
    const msg = inputText.trim()
    setInputText("")
    await sendMessage(msg, companionContext)
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100)
  }, [inputText, isLoading, sendMessage, companionContext])

  const handleDone = useCallback(async () => {
    const isLastStep = currentTask
      ? currentStepIndex >= currentTask.steps.length - 1
      : false

    await completeStepAndAdvance()
    setAcknowledgment("Good. One step closer.")

    setTimeout(() => {
      setAcknowledgment(null)
      if (isLastStep) {
        router.replace("/(tabs)/home")
      } else {
        router.replace("/(tabs)/journey")
      }
    }, 1800)
  }, [completeStepAndAdvance, currentTask, currentStepIndex])

  if (!currentStep) {
    return (
      <LinearGradient
        colors={["hsl(240, 50%, 12%)", "hsl(239, 60%, 18%)", "hsl(250, 40%, 22%)"]}
        style={focusStyles.container}
      >
        <View style={focusStyles.inner}>
          <Text style={[focusStyles.stepWorking, { color: "#fff" }]}>No active step</Text>
        </View>
      </LinearGradient>
    )
  }

  return (
    <LinearGradient
      colors={[
        "hsl(240, 50%, 12%)",
        "hsl(239, 60%, 18%)",
        "hsl(250, 40%, 22%)",
      ]}
      style={focusStyles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 0.3, y: 1 }}
    >
      <View
        style={[
          focusStyles.inner,
          {
            paddingTop: insets.top + 16,
            paddingBottom: Math.max(insets.bottom, 24),
          },
        ]}
      >
        {acknowledgment ? (
          <View style={focusStyles.acknowledgmentContainer}>
            <CompanionAvatar size={72} />
            <Text style={focusStyles.acknowledgmentText}>{acknowledgment}</Text>
          </View>
        ) : (
          <>
            {/* Avatar */}
            <View style={focusStyles.avatarSection}>
              <View style={focusStyles.avatarGlow}>
                <CompanionAvatar size={72} />
              </View>
            </View>

            {/* Hero message card */}
            <View style={focusStyles.heroCard}>
              <FadingMessage messages={stepMessages} />
              <View style={focusStyles.divider} />
              <Text style={focusStyles.stepWorking}>
                Working on
              </Text>
              <Text style={focusStyles.stepTitle}>
                {currentStep.title}
              </Text>
              <Text style={focusStyles.stepInstruction}>
                {currentStep.instruction}
              </Text>
              {currentStep.estimated_minutes && (
                <Text style={focusStyles.stepTime}>
                  About {currentStep.estimated_minutes} min
                </Text>
              )}
            </View>

            {/* Actions */}
            <View style={focusStyles.actions}>
              <TouchableOpacity
                style={focusStyles.doneButton}
                onPress={handleDone}
                activeOpacity={0.85}
              >
                <Text style={focusStyles.doneText}>Done</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={openChat}
                style={focusStyles.talkLink}
                activeOpacity={0.7}
              >
                <Text style={focusStyles.talkText}>Talk to me</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>

      {/* Chat overlay */}
      {showChat && (
        <TouchableOpacity
          style={focusStyles.chatBackdrop}
          activeOpacity={1}
          onPress={closeChat}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={{ flex: 1, justifyContent: "flex-end" }}
          >
            <TouchableOpacity activeOpacity={1} onPress={() => { }}>
              <Animated.View
                style={[
                  focusStyles.chatPanel,
                  { transform: [{ translateY: chatSlide }] },
                  { paddingBottom: Math.max(insets.bottom, 16) },
                ]}
              >
                <View style={focusStyles.chatTopBar}>
                  <View style={focusStyles.chatHandle} />
                  <TouchableOpacity onPress={closeChat} style={focusStyles.chatClose}>
                    <View style={focusStyles.closeCircle}>
                      <Text style={focusStyles.chatCloseText}>✕</Text>
                    </View>
                  </TouchableOpacity>
                </View>

                <ScrollView
                  ref={scrollRef}
                  style={focusStyles.chatScroll}
                  contentContainerStyle={{ gap: 10, paddingVertical: 8 }}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                >
                  {messages.map((msg, i) => (
                    <View
                      key={i}
                      style={[
                        focusStyles.bubble,
                        msg.role === "user"
                          ? focusStyles.userBubble
                          : focusStyles.aiBubble,
                      ]}
                    >
                      <Text
                        style={[
                          focusStyles.bubbleText,
                          msg.role === "user"
                            ? focusStyles.userText
                            : focusStyles.aiText,
                        ]}
                      >
                        {msg.content}
                      </Text>
                    </View>
                  ))}
                  {isLoading && (
                    <Text style={focusStyles.thinking}>Thinking...</Text>
                  )}
                </ScrollView>

                <View style={focusStyles.chatInputRow}>
                  <TextInput
                    value={inputText}
                    onChangeText={setInputText}
                    placeholder="Ask anything..."
                    placeholderTextColor={theme.colors.onSurfaceVariant}
                    style={[focusStyles.chatInput, Platform.OS === "web" && ({ outlineStyle: "none" } as any)]}
                    onSubmitEditing={handleSend}
                    returnKeyType="send"
                    blurOnSubmit={false}
                  />
                  <TouchableOpacity
                    onPress={handleSend}
                    disabled={!inputText.trim() || isLoading}
                    style={[
                      focusStyles.sendBtn,
                      (!inputText.trim() || isLoading) && { opacity: 0.4 },
                    ]}
                  >
                    <Text style={focusStyles.sendText}>Send</Text>
                  </TouchableOpacity>
                </View>
              </Animated.View>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </TouchableOpacity>
      )}
    </LinearGradient>
  )
}

const focusStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  inner: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
    justifyContent: "center",
    gap: theme.spacing.lg,
  },
  avatarSection: {
    alignItems: "center",
    marginBottom: theme.spacing.md,
  },
  avatarGlow: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 9999,
    padding: theme.spacing.sm,
  },
  heroCard: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    gap: theme.spacing.sm,
  },
  heroMessage: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body.large.fontSize,
    lineHeight: theme.typography.body.large.lineHeight,
    color: "rgba(255,255,255,0.95)",
    textAlign: "center",
    fontStyle: "italic",
    minHeight: 70,
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.15)",
    marginVertical: theme.spacing.sm,
  },
  stepWorking: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.label.small.fontSize,
    color: "rgba(255,255,255,0.5)",
    textTransform: "uppercase",
    letterSpacing: 1,
    fontWeight: theme.typography.weight.semibold,
  },
  stepTitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body.large.fontSize,
    lineHeight: theme.typography.body.large.lineHeight,
    fontWeight: theme.typography.weight.semibold,
    color: "rgba(255,255,255,0.9)",
  },
  stepInstruction: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body.medium.fontSize,
    lineHeight: theme.typography.body.medium.lineHeight,
    color: "rgba(255,255,255,0.6)",
  },
  stepTime: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.label.medium.fontSize,
    color: "rgba(255,255,255,0.4)",
  },
  actions: {
    alignItems: "center",
    gap: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
  },
  doneButton: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.4)",
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.radius.full,
    minWidth: 200,
    alignItems: "center",
  },
  doneText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body.large.fontSize,
    fontWeight: theme.typography.weight.semibold,
    color: "#fff",
  },
  talkLink: {
    paddingVertical: theme.spacing.sm,
  },
  talkText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body.medium.fontSize,
    color: "rgba(255,255,255,0.55)",
    textDecorationLine: "underline",
  },
  acknowledgmentContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.xl,
  },
  acknowledgmentText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.title.fontSize,
    lineHeight: theme.typography.title.lineHeight,
    color: "rgba(255,255,255,0.9)",
    textAlign: "center",
  },
  chatBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  chatPanel: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
    height: CHAT_HEIGHT,
  },
  chatTopBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: theme.spacing.sm,
    position: "relative",
  },
  chatHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.outline,
  },
  chatClose: {
    position: "absolute",
    right: 0,
    padding: theme.spacing.xs,
  },
  closeCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.surfaceContainerHighest,
    alignItems: "center",
    justifyContent: "center",
  },
  chatCloseText: {
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
    fontWeight: theme.typography.weight.semibold,
  },
  chatScroll: {
    flex: 1,
    paddingHorizontal: theme.spacing.xs,
  },
  bubble: {
    maxWidth: "80%",
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.lg,
  },
  userBubble: {
    backgroundColor: theme.colors.primary,
    alignSelf: "flex-end",
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: theme.colors.surfaceContainerLow,
    alignSelf: "flex-start",
    borderBottomLeftRadius: 4,
  },
  bubbleText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body.medium.fontSize,
    lineHeight: theme.typography.body.medium.lineHeight,
  },
  userText: {
    color: theme.colors.onPrimary,
  },
  aiText: {
    color: theme.colors.onSurface,
  },
  thinking: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body.small.fontSize,
    color: theme.colors.onSurfaceVariant,
    textAlign: "center",
    paddingVertical: theme.spacing.sm,
  },
  chatInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.outlineVariant,
  },
  chatInput: {
    flex: 1,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body.medium.fontSize,
    color: theme.colors.onSurface,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.surfaceContainerHighest,
    borderRadius: theme.radius.full,
    maxHeight: 80,
  },
  sendBtn: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.full,
  },
  sendText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body.medium.fontSize,
    fontWeight: theme.typography.weight.medium,
    color: theme.colors.onPrimary,
  },
})