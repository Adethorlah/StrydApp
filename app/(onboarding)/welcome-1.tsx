import { View, Text, StyleSheet } from "react-native"
import { router } from "expo-router"
import { theme } from "../../src/theme/tokens"
import { Button } from "../../src/components/Button"

export default function Welcome1() {
  return (
    <View style={styles.container}>
      <Text style={styles.wordmark}>STRYD</Text>
      <Text style={styles.headline}>
        You know what needs to be done.{"\n"}Starting is the hard part.
      </Text>
      <Button
        title="I know this feeling"
        onPress={() => router.push("/(onboarding)/welcome-2")}
        variant="primary"
        style={styles.button}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: theme.spacing.xl,
    backgroundColor: theme.colors.background,
  },
  wordmark: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 36,
    fontWeight: theme.typography.weight.semibold,
    letterSpacing: 4,
    color: theme.colors.primary,
    marginBottom: theme.spacing.xl,
  },
  headline: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.title.fontSize,
    lineHeight: theme.typography.title.lineHeight,
    fontWeight: theme.typography.weight.medium,
    color: theme.colors.onBackground,
    textAlign: "center",
    marginBottom: theme.spacing.xl,
  },
  button: {
    minWidth: 240,
  },
})
