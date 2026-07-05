import { useState } from "react"
import { View, TouchableOpacity, Text, Image, StyleSheet } from "react-native"
import { theme } from "../theme/tokens"
import { Button } from "./Button"

const MOODS = [
  { image: require("../assets/images/moods/Whew.png"), label: "Whew", score: 1 },
  { image: require("../assets/images/moods/Meh.png"), label: "Meh", score: 2 },
  { image: require("../assets/images/moods/Okay.png"), label: "Okay", score: 3 },
  { image: require("../assets/images/moods/Happy.png"), label: "Happy", score: 4 },
  { image: require("../assets/images/moods/Ready.png"), label: "Ready", score: 5 },
]

interface EmojiMoodPickerProps {
  onSelect: (score: number) => void
}

export function EmojiMoodPicker({ onSelect }: EmojiMoodPickerProps) {
  const [selectedScore, setSelectedScore] = useState<number | null>(null)

  const handlePress = (score: number) => {
    setSelectedScore((prev) => (prev === score ? null : score))
  }

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {MOODS.slice(0, 3).map((mood) => (
          <TouchableOpacity
            key={mood.score}
            onPress={() => handlePress(mood.score)}
            style={[styles.card, selectedScore === mood.score && styles.selectedCard]}
            activeOpacity={0.7}
          >
            <Image source={mood.image} style={styles.image} />
            <Text style={[styles.label, selectedScore === mood.score && styles.selectedLabel]}>
              {mood.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.row}>
        {MOODS.slice(3).map((mood) => (
          <TouchableOpacity
            key={mood.score}
            onPress={() => handlePress(mood.score)}
            style={[styles.card, selectedScore === mood.score && styles.selectedCard]}
            activeOpacity={0.7}
          >
            <Image source={mood.image} style={styles.image} />
            <Text style={[styles.label, selectedScore === mood.score && styles.selectedLabel]}>
              {mood.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <Button
        title="Continue"
        onPress={() => selectedScore && onSelect(selectedScore)}
        variant="primary"
        disabled={!selectedScore}
        style={styles.nextButton}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    alignItems: "center",
    gap: theme.spacing.lg,
  },
  row: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
  },
  card: {
    width: 96,
    height: 108,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.xs,
  },
  selectedCard: {
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  image: {
    width: 76,
    height: 76,
  },
  label: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.label.medium.fontSize,
    color: theme.colors.onSurfaceVariant,
  },
  selectedLabel: {
    color: theme.colors.primary,
    fontWeight: theme.typography.weight.semibold,
  },
  nextButton: {
    width: "100%",
    marginTop: theme.spacing.lg,
  },
})
