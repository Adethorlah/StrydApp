import { View, Text, StyleSheet, TouchableOpacity } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { router } from "expo-router"
import { theme } from "../../src/theme/tokens"
import { Button } from "../../src/components/Button"
import { OnboardIllustration } from "../../src/components/icons/OnboardIllustration"
import { setOnboardingComplete } from "../../src/lib/storage"

export default function Welcome2() {
  const insets = useSafeAreaInsets()

  return (
    <View style={styles.container}>
      <View style={styles.backgroundFill}>
        <OnboardIllustration />
      </View>
      <TouchableOpacity
        style={[styles.skip, { top: insets.top + 8 }]}
        onPress={async () => {
          await setOnboardingComplete()
          router.replace("/(tabs)/home")
        }}
      >
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>
      <View style={styles.overlay}>
        <View style={styles.overlayContent}>
          <Text style={styles.title}>Welcome</Text>
          <Text style={styles.subtext}>Stryd breaks your goal into small, manageable steps</Text>
          <Button
            title="That sounds good"
            onPress={() => router.replace("/(onboarding)/welcome-3")}
            variant="primary"
            style={styles.button}
          />
        </View>
        <View style={styles.dots}>
          <View style={[styles.dot, styles.activeDot]} />
          <View style={styles.dot} />
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  backgroundFill: {
    position: "absolute",
    left: 24,
    right: 24,
    top: 0,
    bottom: 0,
    overflow: "hidden",
  },
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    alignItems: "center",
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
  },
  overlayContent: {
    width: "100%",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.65)",
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
  },
  title: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.title.fontSize,
    lineHeight: theme.typography.title.lineHeight,
    fontWeight: "700",
    color: theme.colors.onBackground,
    textAlign: "center",
    marginBottom: theme.spacing.sm,
  },
  subtext: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body.large.fontSize,
    lineHeight: theme.typography.body.large.lineHeight,
    fontWeight: theme.typography.weight.semibold,
    color: theme.colors.onSurfaceVariant,
    textAlign: "center",
    maxWidth: 320,
    marginBottom: theme.spacing.xl,
  },
  skip: {
    position: "absolute",
    right: 24,
    zIndex: 10,
  },
  skipText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body.medium.fontSize,
    color: theme.colors.onBackground,
  },
  button: {
    width: "100%",
  },
  dots: {
    flexDirection: "row",
    gap: 8,
    marginTop: theme.spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.outline,
  },
  activeDot: {
    backgroundColor: theme.colors.onTertiaryContainer,
    width: 24,
    borderRadius: 4,
  },
})
