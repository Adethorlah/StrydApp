import { useCallback } from "react"
import { View, Text, StyleSheet } from "react-native"
import { router, useLocalSearchParams } from "expo-router"
import { theme } from "../../src/theme/tokens"
import { EmojiMoodPicker } from "../../src/components/EmojiMoodPicker"
import { setUserName, setSessionMood, setOnboardingComplete } from "../../src/lib/storage"

export default function MoodCheck() {
  const { name } = useLocalSearchParams<{ name: string }>()

  const handleMoodSelect = useCallback(
    async (score: number) => {
      if (name) await setUserName(name)
      await setSessionMood(score)
      await setOnboardingComplete()
      router.replace("/(tabs)/home")
    },
    [name]
  )

  return (
    <View style={styles.container}>
      <Text style={styles.prompt}>How are you feeling right now?</Text>
      <EmojiMoodPicker onSelect={handleMoodSelect} autoAdvance />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: theme.spacing.xl,
    backgroundColor: theme.colors.background,
    gap: theme.spacing.xl,
  },
  prompt: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.title.fontSize,
    lineHeight: theme.typography.title.lineHeight,
    fontWeight: theme.typography.weight.medium,
    color: theme.colors.onBackground,
    textAlign: "center",
  },
})
