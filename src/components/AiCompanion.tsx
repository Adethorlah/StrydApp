import { useState, useRef, useCallback, useEffect } from "react"
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
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { theme } from "../theme/tokens"
import { AiChatBubble } from "./AiChatBubble"
import { useChat } from "../contexts/ChatContext"
import { CompanionContext } from "../types"

interface CompanionProps {
  context: CompanionContext
  isVisible: boolean
  shouldPulse: boolean
  onPulseClear?: () => void
  startOpen?: boolean
}

const { height: SCREEN_HEIGHT } = Dimensions.get("window")
const PANEL_HEIGHT = SCREEN_HEIGHT * 0.65

export function AiCompanion({
  context,
  isVisible,
  shouldPulse,
  onPulseClear,
  startOpen,
}: CompanionProps) {
  const insets = useSafeAreaInsets()
  const [isOpen, setIsOpen] = useState(false)
  const [inputText, setInputText] = useState("")
  const slideAnim = useRef(new Animated.Value(PANEL_HEIGHT)).current
  const pulseAnim = useRef(new Animated.Value(1)).current
  const inputRef = useRef<TextInput>(null)
  const scrollRef = useRef<ScrollView>(null)
  const hasSentIntro = useRef(false)

  const { messages, isLoading, sendMessage, initWithGreeting } = useChat()

  useEffect(() => {
    if (startOpen) openPanel()
  }, [startOpen])

  useEffect(() => {
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
  }, [shouldPulse, pulseAnim])

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: true })
      }, 100)
    }
  }, [messages])

  const openPanel = useCallback(() => {
    setIsOpen(true)
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start()

    if (!hasSentIntro.current && context.userName && messages.length === 0) {
      initWithGreeting(context.userName)
      hasSentIntro.current = true
    }

    if (onPulseClear) onPulseClear()
  }, [slideAnim, context.userName, onPulseClear, initWithGreeting, messages.length])

  const closePanel = useCallback(() => {
    Animated.timing(slideAnim, {
      toValue: PANEL_HEIGHT,
      duration: 250,
      useNativeDriver: true,
    }).start(() => setIsOpen(false))
  }, [slideAnim])

  const handleSend = useCallback(async () => {
    if (!inputText.trim() || isLoading) return
    const message = inputText.trim()
    setInputText("")
    await sendMessage(message, context)
  }, [inputText, isLoading, sendMessage, context])

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
            behavior={Platform.OS === "ios" ? "padding" : undefined}
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
                {/* Handle + close X */}
                <View style={styles.topBar}>
                  <View style={styles.handle} />
                  <TouchableOpacity onPress={closePanel} style={styles.closeButton}>
                    <View style={styles.closeCircle}>
                      <Text style={styles.closeText}>✕</Text>
                    </View>
                  </TouchableOpacity>
                </View>

                <ScrollView
                  ref={scrollRef}
                  style={styles.chatArea}
                  contentContainerStyle={styles.chatContent}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                >
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

                <View style={[
                  styles.inputRow,
                  { paddingBottom: Math.max(insets.bottom, 16) }
                ]}>
                  <TextInput
                    ref={inputRef}
                    value={inputText}
                    onChangeText={setInputText}
                    placeholder="Type here..."
                    placeholderTextColor={theme.colors.onSurfaceVariant}
                    style={[styles.input, Platform.OS === "web" && ({ outlineStyle: "none" } as any)]}
                    onSubmitEditing={handleSend}
                    returnKeyType="send"
                    blurOnSubmit={false}
                  />
                  <TouchableOpacity
                    onPress={handleSend}
                    style={[
                      styles.sendButton,
                      (!inputText.trim() || isLoading) && styles.sendButtonDisabled,
                    ]}
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
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    position: "relative",
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.outline,
  },
  closeButton: {
    position: "absolute",
    right: theme.spacing.md,
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
  closeText: {
    fontSize: 14,
    fontWeight: theme.typography.weight.semibold,
    color: theme.colors.onSurfaceVariant,
  },
  chatArea: {
    flex: 1,
    paddingHorizontal: theme.spacing.md,
  },
  chatContent: {
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.outlineVariant,
    gap: theme.spacing.sm,
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
  },
  sendButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  sendButtonDisabled: {
    opacity: 0.4,
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
