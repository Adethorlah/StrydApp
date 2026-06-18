import { useState } from "react"
import { View, Text, StyleSheet, Platform, StatusBar, TouchableOpacity, KeyboardAvoidingView } from "react-native"
import { router } from "expo-router"
import { theme } from "../../src/theme/tokens"
import { StyledInput } from "../../src/components/TextInput"
import { Button } from "../../src/components/Button"
import { ChevronLeft } from "../../src/components/icons"

const STATUS_BAR_HEIGHT =
  Platform.OS === "android" ? StatusBar.currentHeight ?? 48 : 60

export default function NameInput() {
  const [name, setName] = useState("")
  const [isFocused, setIsFocused] = useState(false)

  const handleContinue = () => {
    if (!name.trim()) return
    router.replace({
      pathname: "/(onboarding)/mood-check",
      params: { name: name.trim() },
    })
  }

  return (
    <KeyboardAvoidingView
      style={styles.outer}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.container}>

        {/* Top nav */}
        <View style={styles.topRow}>
          <TouchableOpacity
            onPress={() => router.replace("/(onboarding)/welcome-3")}
            style={styles.backButton}
          >
            <ChevronLeft color={theme.colors.onBackground} size={24} />
          </TouchableOpacity>
          <Text style={styles.wordmark}>STRYD</Text>
        </View>

        {/* Progress */}
        <View style={styles.progressSection}>
          <View style={styles.progressTrack}>
            <View style={styles.progressFill} />
          </View>
          <Text style={styles.progressLabel}>Step 1 of 2</Text>
        </View>

        {/* Content */}
        <View style={styles.content}>
          <Text style={styles.title}>What should we call you?</Text>
          <Text style={styles.subtext}>
            Because every journey feels better when it's personal
          </Text>

          {/* Custom input to control focus border */}
          <View style={[styles.inputWrapper, isFocused && styles.inputWrapperFocused]}>
            <StyledInput
              variant="standard"
              placeholder="Your name"
              value={name}
              onChangeText={setName}
              onSubmitEditing={handleContinue}
              returnKeyType="done"
              autoFocus
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              style={styles.input}
              inputStyle={{
                fontWeight: theme.typography.weight.semibold,
              }}
            />
          </View>

          <Button
            title="Continue"
            onPress={handleContinue}
            variant="primary"
            disabled={!name.trim()}
            style={styles.button}
          />
        </View>

      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: STATUS_BAR_HEIGHT + 16,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: theme.spacing.lg,
  },
  backButton: {
    marginRight: 16,
  },
  wordmark: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 22,
    fontWeight: "700",
    color: theme.colors.onBackground,
    letterSpacing: -0.5,
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
    width: "50%",
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
    justifyContent: "flex-start",
    paddingTop: theme.spacing.xl,
    gap: theme.spacing.lg,
  },
  title: {
    fontFamily: theme.typography.fontFamily,
    fontSize: 28,
    lineHeight: 36,
    fontWeight: "700",
    color: theme.colors.onBackground,
  },
  subtext: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body.medium.fontSize,
    color: theme.colors.onSurfaceVariant,
    marginTop: -theme.spacing.sm,
  },
  inputWrapper: {
    borderWidth: 1.5,
    borderColor: theme.colors.outline,
    borderRadius: theme.radius.md,
    overflow: "hidden",
    backgroundColor: theme.colors.surface,
  },
  inputWrapperFocused: {
    borderColor: theme.colors.primary,
    borderWidth: 2,
  },
  input: {
    width: "100%",
    borderWidth: 0,
  },
  button: {
    width: "100%",
    marginTop: theme.spacing.sm,
  },
})