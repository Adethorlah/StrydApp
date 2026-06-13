import { View, Text, StyleSheet, TouchableOpacity } from "react-native"
import { router } from "expo-router"
import { theme } from "../../src/theme/tokens"
import { Button } from "../../src/components/Button"
import { OnboardIllustration } from "../../src/components/icons/OnboardIllustration"

export default function Welcome2() {
  return (
    <View style={styles.container}>
      <View style={styles.backgroundFill}>
        <OnboardIllustration />
      </View>
      <TouchableOpacity
        style={styles.skip}
        onPress={() => router.replace("/(tabs)/home")}
      >
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>
      <View style={styles.overlay}>
        <Text style={styles.title}>Welcome</Text>
        <Text style={styles.subtext}>Stryd helps you turn big tasks into small manageable steps</Text>
        <Button
          title="That sounds good"
          onPress={() => router.push("/(onboarding)/welcome-3")}
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
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: theme.spacing.xl,
    paddingBottom: 100,
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
  skip: {
    position: "absolute",
    top: 50,
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
})
