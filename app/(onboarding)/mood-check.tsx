import { useCallback } from "react"
import { View, Text, StyleSheet, TouchableOpacity } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { router, useLocalSearchParams } from "expo-router"
import { theme } from "../../src/theme/tokens"
import { EmojiMoodPicker } from "../../src/components/EmojiMoodPicker"
import { ChevronLeft } from "../../src/components/icons"
import { setUserName, setSessionMood, setOnboardingComplete } from "../../src/lib/storage"

export default function MoodCheck() {
  const insets = useSafeAreaInsets()
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
    <View style={[styles.container, { paddingTop: insets.top + 16 }]}>
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

      <View style={styles.content}>
        <Text style={styles.title}>How are you feeling right{'\u00A0'}now?</Text>
        <Text style={styles.subtext}>Your mood helps me shape the steps to{'\u00A0'}fit your energy</Text>

        <View style={styles.moodRow}>
          <EmojiMoodPicker onSelect={handleMoodSelect} />
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
    backgroundColor: theme.colors.background,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: theme.spacing.lg,
  },
  backButton: {
    marginRight: theme.spacing.md,
  },
  wordmark: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 22,
    fontWeight: "700",
    color: theme.colors.onBackground,
  },
  progressSection: {
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  progressTrack: {
    width: "100%",
    height: 6,
    backgroundColor: theme.colors.surfaceContainerHighest,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    width: "100%",
    height: 6,
    backgroundColor: theme.colors.onSurfaceVariant,
    borderRadius: 3,
  },
  progressLabel: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.label.medium.fontSize,
    color: theme.colors.onSurfaceVariant,
  },
  content: {
    flex: 1,
    gap: theme.spacing.sm,
    paddingTop: theme.spacing.xl,
  },
  title: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 25,
    lineHeight: 36,
    fontWeight: "700",
    color: theme.colors.onBackground,
  },
  subtext: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body.medium.fontSize,
    color: theme.colors.onSurfaceVariant,
  },
  moodRow: {
    alignItems: "center",
    paddingTop: theme.spacing.lg,
  },
})
