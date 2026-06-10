import { View, Text, StyleSheet } from "react-native"
import { theme } from "../theme/tokens"

interface AiChatBubbleProps {
  message: string
  isUser?: boolean
}

export function AiChatBubble({ message, isUser = false }: AiChatBubbleProps) {
  return (
    <View style={[styles.bubble, isUser ? styles.userBubble : styles.aiBubble]}>
      <Text style={[styles.text, isUser ? styles.userText : styles.aiText]}>
        {message}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  bubble: {
    maxWidth: "85%",
    padding: theme.spacing.md,
    borderRadius: theme.radius.lg,
    marginBottom: theme.spacing.sm,
  },
  aiBubble: {
    backgroundColor: theme.colors.primaryContainer,
    alignSelf: "flex-start",
    borderBottomLeftRadius: theme.radius.sm,
  },
  userBubble: {
    backgroundColor: theme.colors.primary,
    alignSelf: "flex-end",
    borderBottomRightRadius: theme.radius.sm,
  },
  text: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body.medium.fontSize,
    lineHeight: theme.typography.body.medium.lineHeight,
  },
  aiText: {
    color: theme.colors.onPrimaryContainer,
  },
  userText: {
    color: theme.colors.onPrimary,
  },
})
