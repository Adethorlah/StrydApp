import { useState } from "react"
import { View, TouchableOpacity, Text, StyleSheet } from "react-native"
import { theme } from "../theme/tokens"

const MOODS = [
  { emoji: "😅", label: "Whew", score: 1 },
  { emoji: "🫤", label: "Meh", score: 2 },
  { emoji: "😐", label: "Okay", score: 3 },
  { emoji: "😄", label: "Happy", score: 4 },
  { emoji: "🤩", label: "Ready", score: 5 },
]

interface EmojiMoodPickerProps {
  onSelect: (score: number) => void
  autoAdvance?: boolean
}

function MoodCard({
  mood,
  isSelected,
  onPress,
}: {
  mood: (typeof MOODS)[0]
  isSelected: boolean
  onPress: () => void
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.card, isSelected && styles.selectedCard]}
      activeOpacity={0.7}
    >
      <Text style={styles.emoji}>{mood.emoji}</Text>
      <Text style={[styles.label, isSelected && styles.selectedLabel]}>
        {mood.label}
      </Text>
    </TouchableOpacity>
  )
}

export function EmojiMoodPicker({ onSelect, autoAdvance = false }: EmojiMoodPickerProps) {
  const [selectedScore, setSelectedScore] = useState<number | null>(null)

  const handlePress = (score: number) => {
    setSelectedScore(score)
    onSelect(score)
  }

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {MOODS.slice(0, 3).map((mood) => (
          <MoodCard
            key={mood.score}
            mood={mood}
            isSelected={selectedScore === mood.score}
            onPress={() => handlePress(mood.score)}
          />
        ))}
      </View>
      <View style={styles.row}>
        {MOODS.slice(3).map((mood) => (
          <MoodCard
            key={mood.score}
            mood={mood}
            isSelected={selectedScore === mood.score}
            onPress={() => handlePress(mood.score)}
          />
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  row: {
    flexDirection: "row",
    justifyContent: "center",
    gap: theme.spacing.xs,
  },
  card: {
    width: 106,
    height: 106,
    borderRadius: 12,
    backgroundColor: theme.colors.surfaceVariant,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  selectedCard: {
    backgroundColor: theme.colors.primaryContainer,
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  emoji: {
    fontSize: 44,
  },
  label: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.label.small.fontSize,
    color: theme.colors.onSurface,
  },
  selectedLabel: {
    color: theme.colors.primary,
    fontWeight: theme.typography.weight.semibold,
  },
})
