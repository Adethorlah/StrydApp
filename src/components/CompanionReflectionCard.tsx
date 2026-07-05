import { View, Text, StyleSheet } from "react-native"
import { theme } from "../theme/tokens"
import { CompanionAvatar } from "./CompanionAvatar"

const REFLECTION_MESSAGES = [
  "One step at a time became a finished journey.",
  "Every small step brought you here.",
  "You kept showing up, and now you've finished.",
]

interface CompanionReflectionCardProps {
  message?: string
}

export function CompanionReflectionCard({ message }: CompanionReflectionCardProps) {
  const displayMessage = message ?? REFLECTION_MESSAGES[Math.floor(Math.random() * REFLECTION_MESSAGES.length)]

  return (
    <View style={styles.card}>
      <CompanionAvatar size={72} />
      <View style={styles.textContainer}>
        <Text style={styles.message}>{displayMessage}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    flexDirection: "row",
    alignItems: "flex-start",
    gap: theme.spacing.md,
    backgroundColor: theme.colors.primaryContainer,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
  },
  textContainer: {
    flex: 1,
    justifyContent: "center",
  },
  message: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body.medium.fontSize,
    lineHeight: theme.typography.body.medium.lineHeight,
    color: theme.colors.onPrimaryContainer,
  },
})
