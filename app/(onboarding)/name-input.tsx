import { useState } from "react"
import { View, Text, StyleSheet } from "react-native"
import { router } from "expo-router"
import { theme } from "../../src/theme/tokens"
import { StyledInput } from "../../src/components/TextInput"
import { Button } from "../../src/components/Button"

export default function NameInput() {
  const [name, setName] = useState("")

  const handleContinue = () => {
    if (!name.trim()) return
    router.push({
      pathname: "/(onboarding)/mood-check",
      params: { name: name.trim() },
    })
  }

  return (
    <View style={styles.container}>
      <Text style={styles.prompt}>What should we call you?</Text>
      <StyledInput
        variant="large"
        placeholder="Your name"
        value={name}
        onChangeText={setName}
        onSubmitEditing={handleContinue}
        returnKeyType="done"
        autoFocus
        style={styles.input}
      />
      <Button
        title="Continue"
        onPress={handleContinue}
        variant="primary"
        disabled={!name.trim()}
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
    paddingHorizontal: 24,
    paddingVertical: theme.spacing.xl,
    backgroundColor: theme.colors.background,
    gap: theme.spacing.lg,
  },
  prompt: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.title.fontSize,
    lineHeight: theme.typography.title.lineHeight,
    fontWeight: theme.typography.weight.medium,
    color: theme.colors.onBackground,
    textAlign: "center",
  },
  input: {
    width: "100%",
    maxWidth: 300,
  },
  button: {
    minWidth: 200,
  },
})
