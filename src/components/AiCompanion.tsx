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
import { theme } from "../theme/tokens"
import { AiChatBubble } from "./AiChatBubble"
import { useCompanionChat } from "../hooks/useCompanionChat"
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

export function AiCompanion({ context, isVisible, shouldPulse, onPulseClear, startOpen }: CompanionProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [inputText, setInputText] = useState("")
  const slideAnim = useRef(new Animated.Value(PANEL_HEIGHT)).current
  const pulseAnim = useRef(new Animated.Value(1)).current
  const inputRef = useRef<TextInput>(null)
  const hasSentIntro = useRef(false)

  const { messages, isLoading, sendMessage, initWithGreeting } = useCompanionChat(context)

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

  const openPanel = useCallback(() => {
    setIsOpen(true)
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start()

    if (!hasSentIntro.current && context.userName) {
      initWithGreeting(context.userName)
      hasSentIntro.current = true
    }

    if (onPulseClear) onPulseClear()
  }, [slideAnim, context.userName, onPulseClear, initWithGreeting])

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
    await sendMessage(message)
  }, [inputText, isLoading, sendMessage])

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
              onPress={() => { }}
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
                    onSubmitEditing={handleSend}
                    returnKeyType="send"
                  />
                  <TouchableOpacity
                    onPress={handleSend}
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