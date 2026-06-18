import { useState, useCallback, useEffect, useRef } from "react"
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { router } from "expo-router"
import { theme } from "../../src/theme/tokens"
import { StyledInput } from "../../src/components/TextInput"
import { Button } from "../../src/components/Button"
import { EmojiMoodPicker } from "../../src/components/EmojiMoodPicker"
import { LoadingState } from "../../src/components/LoadingState"
import { AiCompanion } from "../../src/components/AiCompanion"
import { CompanionAvatar } from "../../src/components/CompanionAvatar"
import { useOnboarding } from "../../src/hooks/useOnboarding"
import { useMoodState } from "../../src/hooks/useMoodState"
import { useTaskState } from "../../src/hooks/useTaskState"
import { useBreakdownTask } from "../../src/hooks/useBreakdownTask"
import { useAuth } from "../../src/hooks/useAuth"
import {
  setRestUntil,
  getHasCompletedFirstTask,
  setHasCompletedFirstTask,
} from "../../src/lib/storage"

export default function Home() {
  const { userName } = useOnboarding()
  const { mood, setMood } = useMoodState()
  const {
    hasActiveTask,
    isTaskComplete,
    currentTask,
    currentStep,
    completedStepIds,
    startNewTask,
    clearTask,
  } = useTaskState()
  const { state: breakdownState, breakDown } = useBreakdownTask()
  const { isAuthenticated, signInWithGoogle } = useAuth()
  const insets = useSafeAreaInsets()

  const [goal, setGoal] = useState("")
  const [showMoodCheck, setShowMoodCheck] = useState(false)
  const [hasCompletedFirstTask, setHasCompletedFirstTaskState] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showWelcome, setShowWelcome] = useState(false)
  const wasAuthenticatedRef = useRef(isAuthenticated)

  useEffect(() => {
    getHasCompletedFirstTask().then(setHasCompletedFirstTaskState)
  }, [])

  useEffect(() => {
    if (isAuthenticated && !wasAuthenticatedRef.current) {
      setShowWelcome(true)
      const timer = setTimeout(() => setShowWelcome(false), 4000)
      wasAuthenticatedRef.current = true
      return () => clearTimeout(timer)
    }
    wasAuthenticatedRef.current = isAuthenticated
  }, [isAuthenticated])

  const companionContext = {
    userName: userName ?? "there",
    currentTask: currentTask?.title,
    currentStepTitle: currentStep?.title,
    currentStepInstruction: currentStep?.instruction,
    moodScore: mood ?? undefined,
    completedSteps: completedStepIds.length,
    totalSteps: currentTask?.steps.length ?? 0,
  }

  const promptLine = !mood || mood >= 3
    ? mood && mood >= 4
      ? "You seem ready. What are we working on?"
      : "What would you like to get done today?"
    : "No pressure. What's one thing you'd like to move forward today?"

  const flattenSteps = (result: any) => {
    if (result.is_multi_phase && result.phases) {
      return result.phases.flatMap((p: any) => p.steps)
    }
    return result.steps ?? []
  }

  const handleSubmitGoal = useCallback(async () => {
    if (!goal.trim()) return
    if (breakdownState.status === "loading" || breakdownState.status === "building") return

    setError(null)

    try {
      const isFirstEver = hasCompletedFirstTask === false

      if (isFirstEver) {
        const result = await breakDown(goal.trim(), mood ?? 3, 25)
        await startNewTask({
          title: goal.trim(),
          steps: flattenSteps(result).map((s: any, i: number) => ({
            step_order: i + 1,
            title: s.title,
            instruction: s.instruction,
            estimated_minutes: s.estimated_minutes,
          })),
          is_multi_phase: result.is_multi_phase,
        })

        await setHasCompletedFirstTask()
        setHasCompletedFirstTaskState(true)

        setGoal("")
        router.push("/(tabs)/journey")
      } else {
        setShowMoodCheck(true)
      }
    } catch (e: any) {
      setError(e?.message ?? "Something went wrong while creating your task. Please try again.")
    }
  }, [goal, mood, startNewTask, breakDown, breakdownState.status, hasCompletedFirstTask])

  const handlePreTaskMood = useCallback(
    async (score: number) => {
      setError(null)
      try {
        await setMood(score)
        setShowMoodCheck(false)

        const result = await breakDown(goal.trim(), score, 25)
        await startNewTask({
          title: goal.trim(),
          steps: flattenSteps(result).map((s: any, i: number) => ({
            step_order: i + 1,
            title: s.title,
            instruction: s.instruction,
            estimated_minutes: s.estimated_minutes,
          })),
          is_multi_phase: result.is_multi_phase,
        })

        setGoal("")
        router.push("/(tabs)/journey")
      } catch (e: any) {
        setError(e?.message ?? "Something went wrong while creating your task. Please try again.")
      }
    },
    [goal, startNewTask, breakDown, setMood]
  )

  const handleContinue = useCallback(() => {
    router.push("/(tabs)/journey")
  }, [])

  const handleStartNew = useCallback(async () => {
    await clearTask()
    setShowMoodCheck(false)
    setGoal("")
    setError(null)
  }, [clearTask])

  const handleRest = useCallback(async () => {
    const twoHoursLater = new Date(Date.now() + 2 * 60 * 60 * 1000)
    await setRestUntil(twoHoursLater.toISOString())
    await clearTask()
    setGoal("")
  }, [clearTask])

  // State C — Task Completed
  if (isTaskComplete) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Text style={styles.completionMessage}>
          {showWelcome
            ? `You've completed your first task. Welcome to your Stryd account, ${userName ?? "there"}.`
            : `You worked through it, ${userName ?? "there"}. That's the whole thing.`}
        </Text>
        {isAuthenticated ? (
          <>
            <Button
              title="Start something new"
              onPress={handleStartNew}
              variant="primary"
              style={styles.actionButton}
            />
            <Button
              title="Rest for now"
              onPress={handleRest}
              variant="quiet"
              style={styles.actionButton}
            />
          </>
        ) : (
          <>
            <Text style={styles.subtitle}>Create a free account to keep your task history.</Text>
            <Button
              title="Continue with Google"
              onPress={() => {
                signInWithGoogle().catch((e: any) => setError(e?.message ?? "Something went wrong."))
              }}
              variant="primary"
              style={styles.actionButton}
            />
            <Button
              title="Use email instead"
              onPress={() => router.push("/sign-up?required=true")}
              variant="secondary"
              style={styles.actionButton}
            />
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </>
        )}
        <AiCompanion context={companionContext} isVisible shouldPulse={false} />
      </View>
    )
  }

  // State B — Active Task (Welcome Back)
  if (hasActiveTask && currentTask && currentStep) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Text style={styles.greeting}>Welcome back, {userName ?? "there"}.</Text>
        <Text style={styles.taskTitle}>{currentTask.title}</Text>
        <Text style={styles.stepTitle}>{currentStep.title}</Text>
        <Button title="Continue" onPress={handleContinue} variant="primary" style={styles.actionButton} />
        <Button title="Start new goal" onPress={handleStartNew} variant="secondary" style={styles.actionButton} />
        <AiCompanion context={companionContext} isVisible shouldPulse={false} />
      </View>
    )
  }

  // Loading state
  if (
    breakdownState.status === "loading" ||
    breakdownState.status === "building" ||
    breakdownState.status === "thinking" ||
    breakdownState.status === "almost_there"
  ) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <LoadingState message={breakdownState.message} />
      </View>
    )
  }

  // Mood check (2nd+ task)
  if (showMoodCheck) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Text style={styles.moodPrompt}>Before we start — how are you feeling right now?</Text>
        <EmojiMoodPicker onSelect={handlePreTaskMood} autoAdvance />
      </View>
    )
  }

  // State A — No Active Task
  return (
    <KeyboardAvoidingView
      style={styles.stateAContainer}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Companion Avatar */}
        <View style={styles.avatarContainer}>
          <CompanionAvatar size={80} />
        </View>

        {/* Greeting — small, secondary */}
        <Text style={styles.greetingLine}>Hello {userName ?? "there"}.</Text>
        {/* Prompt — main call to action */}
        <Text style={styles.promptText}>{promptLine}</Text>

        {/* Input card */}
        <View style={styles.inputCard}>
          <StyledInput
            variant="standard"
            placeholder="Describe your goal..."
            placeholderTextColor={theme.colors.onSurfaceVariant}
            value={goal}
            onChangeText={setGoal}
            style={[styles.input, { borderWidth: 0, backgroundColor: "transparent" }]}
            inputStyle={{ fontWeight: theme.typography.weight.medium, minHeight: Platform.OS === "web" ? 60 : undefined }}
            multiline
          />
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          <Button
            title="Let's break it down"
            onPress={handleSubmitGoal}
            variant="primary"
            disabled={!goal.trim()}
            style={styles.actionButton}
          />
        </View>
      </ScrollView>

      <AiCompanion context={companionContext} isVisible shouldPulse={false} />
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
  stateAContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingBottom: theme.spacing.xl,
  },
  greeting: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body.large.fontSize,
    lineHeight: theme.typography.body.large.lineHeight,
    color: theme.colors.onPrimaryContainer,
    textAlign: "center",
  },
  greetingLine: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body.small.fontSize,
    lineHeight: theme.typography.body.small.lineHeight,
    fontWeight: theme.typography.weight.medium,
    color: theme.colors.onSurfaceVariant,
    textAlign: "center",
    marginBottom: theme.spacing.xs,
  },
  avatarContainer: {
    alignItems: "center",
    marginBottom: theme.spacing.md,
  },
  promptText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.title.fontSize,
    lineHeight: theme.typography.title.lineHeight,
    fontWeight: theme.typography.weight.semibold,
    color: theme.colors.onBackground,
    textAlign: "center",
    marginBottom: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
  },
  inputCard: {
    width: "100%",
    backgroundColor: theme.colors.surfaceContainerLow,
    borderRadius: theme.radius.xl,
    paddingVertical: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  input: {
    width: "100%",
    padding: 12,
  },
  actionButton: {
    minWidth: 200,
  },
  taskTitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body.medium.fontSize,
    color: theme.colors.onSurfaceVariant,
    marginBottom: theme.spacing.sm,
  },
  stepTitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.title.fontSize,
    lineHeight: theme.typography.title.lineHeight,
    fontWeight: theme.typography.weight.semibold,
    color: theme.colors.onSurface,
    textAlign: "center",
    marginBottom: theme.spacing.lg,
  },
  completionMessage: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body.large.fontSize,
    lineHeight: theme.typography.body.large.lineHeight,
    color: theme.colors.onBackground,
    textAlign: "center",
    marginBottom: theme.spacing.xl,
    paddingHorizontal: theme.spacing.lg,
  },
  subtitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body.medium.fontSize,
    lineHeight: theme.typography.body.medium.lineHeight,
    color: theme.colors.onSurfaceVariant,
    textAlign: "center",
    marginBottom: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
  },
  moodPrompt: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.title.fontSize,
    lineHeight: theme.typography.title.lineHeight,
    color: theme.colors.onBackground,
    textAlign: "center",
    marginBottom: theme.spacing.lg,
  },
  errorText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body.small.fontSize,
    color: theme.colors.error,
    textAlign: "center",
    marginBottom: theme.spacing.md,
  },
})
