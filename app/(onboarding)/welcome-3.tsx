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
        <Text style={styles.title}>Progress beats perfection</Text>
        <Text style={styles.subtext}>Every small step forward is{"\n"}still a win</Text>
        <Button
          title="Let's go"
          onPress={() => router.push("/(onboarding)/name-input")}
          variant="primary"
          style={styles.button}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  backgroundFill: {},
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    paddingBottom: 100,
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: theme.spacing.xl,
  },
  title: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 32,
    fontWeight: "700",
    color: theme.colors.onBackground,
    textAlign: "center",
    marginBottom: theme.spacing.sm,
  },
  subtext: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body.large.fontSize,
    lineHeight: 32,
    fontWeight: theme.typography.weight.semibold,
    color: theme.colors.onSurfaceVariant,
    textAlign: "center",
    maxWidth: 320,
    marginBottom: theme.spacing.xl,
  },
  button: {
    width: "100%",
  },
})