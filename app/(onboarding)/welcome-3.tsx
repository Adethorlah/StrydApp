import { View, Text, StyleSheet } from "react-native"
import { router } from "expo-router"
import { theme } from "../../src/theme/tokens"
import { Button } from "../../src/components/Button"

export default function Welcome3() {
  return (
    <View style={styles.container}>
      <Text style={styles.headline}>
        Tell us what you want to achieve.{"\n"}We handle everything else.
      </Text>
      <Button
        title="Let's go"
        onPress={() => router.push("/(onboarding)/name-input")}
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
