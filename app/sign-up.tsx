import { useState, useCallback } from "react"
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform } from "react-native"
import { router, useLocalSearchParams } from "expo-router"
import { theme } from "../src/theme/tokens"
import { StyledInput } from "../src/components/TextInput"
import { Button } from "../src/components/Button"
import { useOnboarding } from "../src/hooks/useOnboarding"
import { useAuth } from "../src/hooks/useAuth"

export default function SignUp() {
  const { userName } = useOnboarding()
  const { signInWithGoogle, signUpWithEmail, signInWithEmail, migrateWithUser } = useAuth()
  const { required } = useLocalSearchParams<{ required?: string }>()
  const isRequired = required === "true"

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isEmailMode, setIsEmailMode] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  const handleGoogleSignUp = useCallback(async () => {
    try {
      setIsSubmitting(true)
      setError("")
      const user = await signInWithGoogle()
      if (user) {
        await migrateWithUser(user)
      }
      router.back()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }, [signInWithGoogle, migrateWithUser])

  const handleEmailSignUp = useCallback(async () => {
    if (!email.trim() || !password.trim()) return
    try {
      setIsSubmitting(true)
      setError("")
      await signUpWithEmail(email.trim(), password.trim())

      try {
        const user = await signInWithEmail(email.trim(), password.trim())
        if (user) {
          await migrateWithUser(user)
        }
        router.back()
      } catch {
        setError("Check your email to confirm your account. Your data is saved locally until then.")
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong.")
    } finally {
      setIsSubmitting(false)
    }
  }, [email, password, signUpWithEmail, signInWithEmail, migrateWithUser])

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <Text style={styles.companionMessage}>
        Want to pick up from here next time, {userName ?? "there"}?
        {"\n"}Create an account and your progress is always waiting.
      </Text>

      {isEmailMode ? (
        <View style={styles.form}>
          <StyledInput
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            style={styles.input}
          />
          <StyledInput
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            style={styles.input}
          />
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          <Button
            title="Create my account"
            onPress={handleEmailSignUp}
            variant="primary"
            disabled={isSubmitting}
            style={styles.button}
          />
          <Button
            title="Use Google instead"
            onPress={() => setIsEmailMode(false)}
            variant="link"
          />
        </View>
      ) : (
        <View style={styles.form}>
          <Button
            title={isSubmitting ? "Saving..." : "Save my progress"}
            onPress={handleGoogleSignUp}
            variant="primary"
            disabled={isSubmitting}
            style={styles.googleButton}
          />
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          <Button
            title="Use email instead"
            onPress={() => setIsEmailMode(true)}
            variant="link"
          />
          {!isRequired ? (
            <Button
              title="Not now"
              onPress={() => router.back()}
              variant="quiet"
            />
          ) : null}
        </View>
      )}
    </KeyboardAvoidingView>
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
  },
  companionMessage: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body.large.fontSize,
    lineHeight: theme.typography.body.large.lineHeight,
    color: theme.colors.onBackground,
    textAlign: "center",
    marginBottom: theme.spacing.xl,
  },
  form: {
    width: "100%",
    maxWidth: 320,
    gap: theme.spacing.md,
    alignItems: "center",
  },
  input: {
    width: "100%",
  },
  button: {
    width: "100%",
  },
  googleButton: {
    width: "100%",
  },
  errorText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body.small.fontSize,
    color: theme.colors.error,
    textAlign: "center",
  },
})
