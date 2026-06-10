import { View, Text, StyleSheet } from "react-native"
import { theme } from "../theme/tokens"
import { EmojiMoodPicker } from "./EmojiMoodPicker"

interface PreTaskMoodCheckProps {
  onSelect: (score: number) => void
  isFirstTask?: boolean
}

export function PreTaskMoodCheck({ onSelect, isFirstTask = false }: PreTaskMoodCheckProps) {
  if (isFirstTask) return null

  return (
    <View style={styles.container}>
      <Text style={styles.message}>
        Before we start — how are you feeling right now?
      </Text>
      <EmojiMoodPicker onSelect={onSelect} autoAdvance />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: theme.spacing.lg,
    alignItems: "center",
    gap: theme.spacing.lg,
  },
  message: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body.large.fontSize,
    color: theme.colors.onBackground,
    textAlign: "center",
    lineHeight: theme.typography.body.large.lineHeight,
  },
})
