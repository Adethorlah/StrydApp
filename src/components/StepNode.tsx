import { useRef, useEffect, useState, useCallback } from "react"
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  Modal,
  ScrollView,
  TextInput,
  Keyboard,
} from "react-native"
import { Feather } from "@expo/vector-icons"
import { theme } from "../theme/tokens"
import { useAuth } from "../hooks/useAuth"

interface StepNodeProps {
  stepOrder: number
  title: string
  instruction?: string
  estimatedMinutes?: number
  isActive: boolean
  isCompleted: boolean
  isLocked: boolean
  isGuestLocked: boolean
  isSelected: boolean
  onSelect: () => void
  onDismiss: () => void
  onBegin?: () => void
}

const { height: SCREEN_HEIGHT } = Dimensions.get("window")

const COLORS = {
  green: theme.colors.success,
  grey: theme.colors.outline,
  lightGrey: theme.colors.surfaceContainerHighest,
  iconGrey: theme.colors.onSurfaceVariant,
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function StepNode({
  stepOrder,
  title,
  instruction,
  estimatedMinutes,
  isActive,
  isCompleted,
  isLocked,
  isGuestLocked,
  isSelected,
  onSelect,
  onDismiss,
  onBegin,
}: StepNodeProps) {
  const { signInWithGoogle, signUpWithEmail, signInWithEmail, migrateWithUser } = useAuth()
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current
  const pulseAnim = useRef(new Animated.Value(1)).current
  const [signUpEmail, setSignUpEmail] = useState("")
  const [isEmailSubmitting, setIsEmailSubmitting] = useState(false)
  const [emailError, setEmailError] = useState("")
  const [isKeyboardActive, setIsKeyboardActive] = useState(false)

  useEffect(() => {
    if (isSelected) {
      setSignUpEmail("")
      setEmailError("")
      setIsEmailSubmitting(false)
      setIsKeyboardActive(false)
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start()
    } else {
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }).start()
    }
  }, [isSelected])

  useEffect(() => {
    if (isActive) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.08,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start()
    }
  }, [isActive])

  const outerColor = isCompleted ? COLORS.green : COLORS.grey
  const innerColor = isCompleted ? COLORS.green : COLORS.grey
  const centerColor = isCompleted
    ? COLORS.green
    : isActive
      ? theme.colors.secondary
      : COLORS.lightGrey

  const renderIcon = () => {
    if (isCompleted) {
      return <Feather name="check" size={18} color="#fff" strokeWidth={3} />
    }
    if (isActive) {
      return <Text style={styles.stepNumberText}>{stepOrder}</Text>
    }
    return <Feather name="lock" size={16} color={COLORS.iconGrey} />
  }

  // THIS IS THE FIXED LINE
  // Guest locked steps must never be disabled — tapping them opens the sign-up sheet
  // Only truly locked steps (not active, not completed, not guest locked) are disabled
  const isDisabled = isLocked && !isGuestLocked && !isActive && !isCompleted

  const canSignUpEmail = isValidEmail(signUpEmail) && !isKeyboardActive

  const handleGoogleSignIn = useCallback(async () => {
    try {
      setIsEmailSubmitting(true)
      await signInWithGoogle()
      onDismiss()
    } catch {
      setEmailError("Sign in was cancelled or failed.")
    } finally {
      setIsEmailSubmitting(false)
    }
  }, [signInWithGoogle, onDismiss])

  const handleEmailSignUp = useCallback(async () => {
    if (!canSignUpEmail) return
    try {
      setIsEmailSubmitting(true)
      setEmailError("")
      const password = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)
      await signUpWithEmail(signUpEmail.trim(), password)
      const user = await signInWithEmail(signUpEmail.trim(), password)
      if (user) {
        await migrateWithUser(user)
      }
      onDismiss()
    } catch (e: unknown) {
      setEmailError(e instanceof Error ? e.message : "Something went wrong. Please try again.")
    } finally {
      setIsEmailSubmitting(false)
    }
  }, [signUpEmail, canSignUpEmail, signUpWithEmail, signInWithEmail, migrateWithUser, onDismiss])

  const sheetHeight = isGuestLocked ? SCREEN_HEIGHT * 0.8 : SCREEN_HEIGHT * 0.75

  return (
    <View style={styles.nodeContainer}>
      <TouchableOpacity
        onPress={isDisabled ? undefined : onSelect}
        activeOpacity={isDisabled ? 1 : 0.75}
        disabled={isDisabled}
      >
        <Animated.View
          style={[
            isActive && { transform: [{ scale: pulseAnim }] },
          ]}
        >
          <View style={[styles.outerRing, { borderColor: outerColor }]}>
            <View style={[styles.innerRing, { borderColor: innerColor }]}>
              <View
                style={[
                  styles.centerCircle,
                  { backgroundColor: centerColor },
                  (isCompleted || isActive) && styles.centerShadow,
                ]}
              >
                {renderIcon()}
              </View>
            </View>
          </View>
        </Animated.View>
      </TouchableOpacity>

      <Text style={styles.stepLabel}>Step {stepOrder}</Text>

      <Modal
        visible={isSelected}
        transparent
        animationType="none"
        onRequestClose={onDismiss}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onDismiss}
        >
          <Animated.View
            style={[
              styles.sheet,
              { height: sheetHeight, transform: [{ translateY: slideAnim }] },
            ]}
          >
            <TouchableOpacity activeOpacity={1} onPress={() => { }}>
              <View style={styles.handle} />

              <TouchableOpacity onPress={onDismiss} style={styles.backButton}>
                <Text style={styles.backText}>← Back</Text>
              </TouchableOpacity>

              {isGuestLocked ? (
                <ScrollView
                  style={styles.sheetScroll}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                >
                  <Text style={styles.sheetTitle}>
                    You're making great progress!
                  </Text>
                  <Text style={styles.guestLockMessage}>
                    Sign up to continue your journey and unlock all steps.
                  </Text>

                  <TouchableOpacity
                    style={styles.googleButton}
                    onPress={handleGoogleSignIn}
                    activeOpacity={0.85}
                    disabled={isEmailSubmitting}
                  >
                    <Text style={styles.googleButtonText}>
                      {isEmailSubmitting ? "Signing in..." : "Continue with Google"}
                    </Text>
                  </TouchableOpacity>

                  <View style={styles.orDivider}>
                    <View style={styles.orLine} />
                    <Text style={styles.orText}>or</Text>
                    <View style={styles.orLine} />
                  </View>

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
                    editable={!isEmailSubmitting}
                  />

                  {emailError ? (
                    <Text style={styles.emailErrorText}>{emailError}</Text>
                  ) : null}

                  <TouchableOpacity
                    style={[
                      styles.signUpButton,
                      (!canSignUpEmail || isEmailSubmitting) && styles.signUpButtonDisabled,
                    ]}
                    onPress={handleEmailSignUp}
                    activeOpacity={0.85}
                    disabled={!canSignUpEmail || isEmailSubmitting}
                  >
                    <Text style={styles.signUpButtonText}>
                      {isEmailSubmitting ? "Creating account..." : "Sign up"}
                    </Text>
                  </TouchableOpacity>

                  <View style={{ height: 40 }} />
                </ScrollView>
              ) : (
                <ScrollView
                  style={styles.sheetScroll}
                  showsVerticalScrollIndicator={false}
                >
                  <Text style={styles.sheetTitle}>{title}</Text>

                  <View style={styles.stepBadge}>
                    <Text style={styles.stepBadgeText}>
                      Step {stepOrder}
                      {estimatedMinutes ? ` · ${estimatedMinutes} min` : ""}
                    </Text>
                  </View>

                  {instruction && (
                    <Text style={styles.sheetInstruction}>{instruction}</Text>
                  )}

                  {onBegin && isActive && (
                    <TouchableOpacity
                      style={styles.beginButton}
                      onPress={onBegin}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.beginButtonText}>Begin this step</Text>
                    </TouchableOpacity>
                  )}

                  {isCompleted && (
                    <View style={styles.completedBanner}>
                      <Text style={styles.completedBannerText}>
                        ✓ You've completed this step
                      </Text>
                    </View>
                  )}

                  <View style={{ height: 40 }} />
                </ScrollView>
              )}
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  nodeContainer: {
    alignItems: "center",
  },
  outerRing: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  innerRing: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  centerCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  centerShadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  stepNumberText: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.iconGrey,
    fontFamily: theme.typography.fontFamily,
  },
  stepLabel: {
    fontSize: 11,
    color: theme.colors.onSurfaceVariant,
    fontFamily: theme.typography.fontFamily,
    textAlign: "center",
    marginTop: 4,
  },
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
  stepBadge: {
    alignSelf: "flex-start",
    backgroundColor: theme.colors.surfaceContainerLow,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radius.full,
    marginBottom: theme.spacing.md,
  },
  stepBadgeText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.label.small.fontSize,
    color: theme.colors.onSurfaceVariant,
    fontWeight: theme.typography.weight.semibold,
  },
  sheetTitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.title.fontSize,
    lineHeight: theme.typography.title.lineHeight,
    fontWeight: theme.typography.weight.semibold,
    color: theme.colors.onSurface,
    marginBottom: theme.spacing.lg,
  },
  sheetInstruction: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body.large.fontSize,
    lineHeight: theme.typography.body.large.lineHeight,
    color: theme.colors.onSurfaceVariant,
    marginBottom: theme.spacing.xl,
  },
  beginButton: {
    backgroundColor: theme.colors.secondary,
    borderRadius: theme.radius.lg,
    paddingVertical: theme.spacing.md,
    alignItems: "center",
    marginBottom: theme.spacing.md,
  },
  beginButtonText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body.large.fontSize,
    fontWeight: theme.typography.weight.semibold,
    color: theme.colors.onSecondary,
  },
  completedBanner: {
    backgroundColor: theme.colors.surfaceContainerLow,
    borderRadius: theme.radius.lg,
    paddingVertical: theme.spacing.md,
    alignItems: "center",
    marginBottom: theme.spacing.md,
  },
  completedBannerText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body.medium.fontSize,
    color: theme.colors.success ?? "#4CAF50",
    fontWeight: theme.typography.weight.medium,
  },
  guestLockMessage: {
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