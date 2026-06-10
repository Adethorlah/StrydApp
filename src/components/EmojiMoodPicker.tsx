import { View, TouchableOpacity, Text, StyleSheet } from "react-native"
import { theme } from "../theme/tokens"

const MOODS = [
  { emoji: "😔", score: 1 },
  { emoji: "😞", score: 2 },
  { emoji: "😐", score: 3 },
  { emoji: "🙂", score: 4 },
  { emoji: "😄", score: 5 },
]

interface EmojiMoodPickerProps {
  onSelect: (score: number) => void
  autoAdvance?: boolean
}

export function EmojiMoodPicker({ onSelect, autoAdvance = false }: EmojiMoodPickerProps) {
  return (
    <View style={styles.container}>
      {MOODS.map((mood) => (
        <TouchableOpacity
          key={mood.score}
          onPress={() => onSelect(mood.score)}
          style={styles.emojiButton}
          activeOpacity={0.6}
        >
          <Text style={styles.emoji}>{mood.emoji}</Text>
        </TouchableOpacity>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  emojiButton: {
    width: 56,
    height: 56,
    borderRadius: theme.radius.xl,
    backgroundColor: theme.colors.surfaceContainerHighest,
    alignItems: "center",
    justifyContent: "center",
  },
  emoji: {
    fontSize: 28,
  },
})
