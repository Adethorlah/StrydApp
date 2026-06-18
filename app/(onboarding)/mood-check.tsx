import { useCallback } from "react"
import { View, Text, StyleSheet, Platform, StatusBar, TouchableOpacity } from "react-native"
import { router, useLocalSearchParams } from "expo-router"
import { theme } from "../../src/theme/tokens"
import { EmojiMoodPicker } from "../../src/components/EmojiMoodPicker"
import { ChevronLeft } from "../../src/components/icons"
import { setUserName, setSessionMood, setOnboardingComplete } from "../../src/lib/storage"

const STATUS_BAR_HEIGHT =
  Platform.OS === "android" ? StatusBar.currentHeight ?? 48 : 60

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
      <View style={styles.topRow}>
        <TouchableOpacity onPress={() => router.replace("/(onboarding)/name-input")} style={styles.backButton}>
          <ChevronLeft color={theme.colors.onBackground} size={24} />
        </TouchableOpacity>
        <Text style={styles.wordmark}>STRYD</Text>
      </View>

      <View style={styles.progressSection}>
        <View style={styles.progressTrack}>
          <View style={styles.progressFill} />
        </View>
        <Text style={styles.progressLabel}>Step 2 of 2</Text>
      </View>

      <Text style={styles.title}>How are you feeling right now?</Text>
      <Text style={styles.subtext}>Your mood helps me shape the steps to fit your energy</Text>

      <View style={styles.moodRow}>
        <EmojiMoodPicker onSelect={handleMoodSelect} autoAdvance />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: STATUS_BAR_HEIGHT + 40,
    backgroundColor: theme.colors.background,
    gap: theme.spacing.lg,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    marginRight: 16,
  },
  wordmark: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 22,
    fontWeight: "700",
    color: theme.colors.onBackground,
    letterSpacing: -0.5,
  },
  progressSection: {
    gap: theme.spacing.sm,
    marginBottom: 8,
  },
  progressTrack: {
    width: "100%",
    height: 8,
    backgroundColor: theme.colors.outline,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    width: "100%",
    height: 8,
    backgroundColor: theme.colors.onTertiaryContainer,
    borderRadius: 4,
  },
  progressLabel: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.label.medium.fontSize,
    color: theme.colors.onSurfaceVariant,
  },
  title: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.title.fontSize,
    lineHeight: theme.typography.title.lineHeight,
    fontWeight: "700",
    color: theme.colors.onBackground,
  },
  subtext: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body.medium.fontSize,
    color: theme.colors.onSurfaceVariant,
    marginTop: -16,
  },
  moodRow: {
    alignItems: "center",
    marginTop: theme.spacing.md,
  },
})
