import { useState, useCallback, useRef, useEffect } from "react"
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Animated,
  Dimensions,
  Keyboard,
} from "react-native"
import { theme } from "../theme/tokens"
import { useAuth } from "../hooks/useAuth"

const { height: SCREEN_HEIGHT } = Dimensions.get("window")

interface GuestLockSheetProps {
  visible: boolean
  onDismiss: () => void
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function GuestLockSheet({ visible, onDismiss }: GuestLockSheetProps) {
  const { signInWithGoogle, signUpWithEmail, signInWithEmail, migrateWithUser, isGoogleAuthEnabled, isEmailAuthEnabled } = useAuth()

  const [signUpEmail, setSignUpEmail] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [emailError, setEmailError] = useState("")
  const [isKeyboardActive, setIsKeyboardActive] = useState(false)

  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current

  const canSignUpEmail = isValidEmail(signUpEmail) && !isKeyboardActive

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 65,
        friction: 11,
        useNativeDriver: true,
      }).start()
    } else {
      slideAnim.setValue(SCREEN_HEIGHT)
      setSignUpEmail("")
      setEmailError("")
      setIsSubmitting(false)
      Keyboard.dismiss()
    }
  }, [visible, slideAnim])

  const handleDismiss = useCallback(() => {
    Animated.timing(slideAnim, {
      toValue: SCREEN_HEIGHT,
      duration: 280,
      useNativeDriver: true,
    }).start(() => onDismiss())
  }, [slideAnim, onDismiss])

  const handleGoogleSignIn = useCallback(async () => {
    try {
      setIsSubmitting(true)
      await signInWithGoogle()
      handleDismiss()
    } catch (e) {
      const message = e instanceof Error ? e.message : "Sign in was cancelled or failed."
      setEmailError(message)
    } finally {
      setIsSubmitting(false)
    }
  }, [signInWithGoogle, handleDismiss])

  const handleEmailSignUp = useCallback(async () => {
    if (!canSignUpEmail) return
    try {
      setIsSubmitting(true)
      setEmailError("")
      const password = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)
      await signUpWithEmail(signUpEmail.trim(), password)
      const user = await signInWithEmail(signUpEmail.trim(), password)
      if (user) {
        await migrateWithUser(user)
      }
      handleDismiss()
    } catch (e: unknown) {
      setEmailError(e instanceof Error ? e.message : "Something went wrong.")
    } finally {
      setIsSubmitting(false)
    }
  }, [signUpEmail, canSignUpEmail, signUpWithEmail, signInWithEmail, migrateWithUser, handleDismiss])

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleDismiss}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={handleDismiss}>
        <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
          <TouchableOpacity activeOpacity={1} onPress={() => {}}>
            <View style={styles.handle} />
            <TouchableOpacity onPress={handleDismiss} style={styles.backButton}>
              <Text style={styles.backText}>← Back</Text>
            </TouchableOpacity>

            <ScrollView
              style={styles.sheetScroll}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.sheetTitle}>You're making great progress!</Text>
              <Text style={styles.sheetMessage}>
                Sign up to continue your journey and unlock all steps.
              </Text>

              {isGoogleAuthEnabled && (
                <>
                  <TouchableOpacity
                    style={styles.googleButton}
                    onPress={handleGoogleSignIn}
                    activeOpacity={0.85}
                    disabled={isSubmitting}
                  >
                    <Text style={styles.googleButtonText}>
                      {isSubmitting ? "Signing in..." : "Continue with Google"}
                    </Text>
                  </TouchableOpacity>

                  <View style={styles.orDivider}>
                    <View style={styles.orLine} />
                    <Text style={styles.orText}>or</Text>
                    <View style={styles.orLine} />
                  </View>
                </>
              )}

              {isEmailAuthEnabled && (
                <>
                  <TextInput
                    style={styles.emailInput}
                    placeholder="Enter your email"
                    placeholderTextColor={theme.colors.onSurfaceVariant}
                    value={signUpEmail}
                    onChangeText={setSignUpEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    onFocus={() => setIsKeyboardActive(true)}
                    onBlur={() => setIsKeyboardActive(false)}
                    editable={!isSubmitting}
                  />

                  {emailError ? (
                    <Text style={styles.emailErrorText}>{emailError}</Text>
                  ) : null}

                  <TouchableOpacity
                    style={[
                      styles.signUpButton,
                      (!canSignUpEmail || isSubmitting) && styles.signUpButtonDisabled,
                    ]}
                    onPress={handleEmailSignUp}
                    activeOpacity={0.85}
                    disabled={!canSignUpEmail || isSubmitting}
                  >
                    <Text style={styles.signUpButtonText}>
                      {isSubmitting ? "Creating account..." : "Sign up"}
                    </Text>
                  </TouchableOpacity>
                </>
              )}

              <View style={{ height: 40 }} />
            </ScrollView>
          </TouchableOpacity>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    maxHeight: SCREEN_HEIGHT * 0.8,
  },
  sheetScroll: {
    paddingTop: theme.spacing.md,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.outline,
    alignSelf: "center",
    marginBottom: theme.spacing.md,
  },
  backButton: {
    paddingVertical: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  backText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body.medium.fontSize,
    color: theme.colors.onSurfaceVariant,
    fontWeight: theme.typography.weight.medium,
  },
  sheetTitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.title.fontSize,
    lineHeight: theme.typography.title.lineHeight,
    fontWeight: theme.typography.weight.semibold,
    color: theme.colors.onSurface,
    marginBottom: theme.spacing.sm,
  },
  sheetMessage: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body.large.fontSize,
    lineHeight: theme.typography.body.large.lineHeight,
    color: theme.colors.onSurfaceVariant,
    marginBottom: theme.spacing.xl,
  },
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.lg,
    paddingVertical: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  googleButtonText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body.medium.fontSize,
    fontWeight: theme.typography.weight.semibold,
    color: theme.colors.onPrimary,
  },
  orDivider: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: theme.spacing.md,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.outline,
  },
  orText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body.small.fontSize,
    color: theme.colors.onSurfaceVariant,
    marginHorizontal: theme.spacing.md,
  },
  emailInput: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body.medium.fontSize,
    color: theme.colors.onSurface,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.surfaceContainerLow,
    marginBottom: theme.spacing.sm,
  },
  emailErrorText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body.small.fontSize,
    color: theme.colors.error,
    marginBottom: theme.spacing.sm,
  },
  signUpButton: {
    backgroundColor: theme.colors.secondary,
    borderRadius: theme.radius.lg,
    paddingVertical: theme.spacing.md,
    alignItems: "center",
  },
  signUpButtonDisabled: {
    opacity: 0.4,
  },
  signUpButtonText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body.medium.fontSize,
    fontWeight: theme.typography.weight.semibold,
    color: theme.colors.onSecondary,
  },
})
