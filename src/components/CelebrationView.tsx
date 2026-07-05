import { View, Text, StyleSheet } from "react-native"
import { theme } from "../theme/tokens"
import { CompanionAvatar } from "./CompanionAvatar"

interface CelebrationViewProps {
  headline: string
  message: string
}

export function CelebrationView({ headline, message }: CelebrationViewProps) {
  return (
    <View style={styles.container}>
      <CompanionAvatar size={72} />
      <Text style={styles.headline}>{headline}</Text>
      <Text style={styles.message}>{message}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingVertical: theme.spacing.xl,
    gap: theme.spacing.md,
  },
  headline: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.title.fontSize,
    fontWeight: theme.typography.weight.semibold,
    color: theme.colors.onSurface,
    textAlign: "center",
  },
  message: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body.large.fontSize,
    lineHeight: theme.typography.body.large.lineHeight,
    color: theme.colors.onSurfaceVariant,
    textAlign: "center",
    paddingHorizontal: theme.spacing.lg,
  },
})
