import { View, Text, StyleSheet } from "react-native"
import { Link } from "expo-router"
import { theme } from "../src/theme/tokens"

export default function NotFound() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Page not found</Text>
      <Link href="/(tabs)/home" style={styles.link}>
        Go home
      </Link>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.xl,
    backgroundColor: theme.colors.background,
  },
  text: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body.large.fontSize,
    color: theme.colors.onBackground,
    marginBottom: theme.spacing.md,
  },
  link: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body.medium.fontSize,
    color: theme.colors.primary,
    textDecorationLine: "underline",
  },
})
