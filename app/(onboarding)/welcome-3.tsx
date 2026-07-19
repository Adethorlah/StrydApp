import { View, Text, StyleSheet } from "react-native"
import { router } from "expo-router"
import { theme } from "../../src/theme/tokens"
import { Button } from "../../src/components/Button"
import { OnboardIllustration } from "../../src/components/icons/OnboardIllustration"

export default function Welcome3() {
  return (
    <View style={styles.container}>
      <View style={styles.backgroundFill}>
        <OnboardIllustration />
      </View>
      <View style={styles.overlay}>
        <View style={styles.overlayContent}>
          <Text style={styles.title}>Progress beats perfection</Text>
          <Text style={styles.subtext}>Every small step forward is{"\n"}still a win</Text>
          <Button
            title="Let's go"
            onPress={() => router.replace("/(onboarding)/name-input")}
            variant="primary"
            style={styles.button}
          />
        </View>
        <View style={styles.dots}>
          <View style={styles.dot} />
          <View style={[styles.dot, styles.activeDot]} />
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
