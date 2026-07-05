import { useState, useCallback, useEffect, useRef } from "react"
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Modal, TouchableOpacity, Animated, Dimensions } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { router, useFocusEffect } from "expo-router"
import { theme } from "../../src/theme/tokens"
import { StyledInput } from "../../src/components/TextInput"
import { Button } from "../../src/components/Button"
import { EmojiMoodPicker } from "../../src/components/EmojiMoodPicker"
import { LoadingState } from "../../src/components/LoadingState"
import { AiCompanion } from "../../src/components/AiCompanion"
import { CompanionAvatar } from "../../src/components/CompanionAvatar"
import { CompletedGoalCard } from "../../src/components/CompletedGoalCard"
import { CompanionReflectionCard } from "../../src/components/CompanionReflectionCard"
import { useOnboarding } from "../../src/hooks/useOnboarding"
import { useMoodState } from "../../src/hooks/useMoodState"
import { useTaskState } from "../../src/hooks/useTaskState"
import { useBreakdownTask } from "../../src/hooks/useBreakdownTask"
import { useAuth } from "../../src/hooks/useAuth"
import {
  setRestUntil,
  getHasCompletedFirstTask,
  setHasCompletedFirstTask,
  setCompletedTask,
  clearCompletedTask,
  incrementTasksCompletedCount,
} from "../../src/lib/storage"
import { SafeBreakdownResponse, Step, RecencyLevel, Task } from "../../src/types"

function getRecencyLevel(taskCreatedAt?: string): RecencyLevel {
  if (!taskCreatedAt) return "fresh"
  const created = new Date(taskCreatedAt).getTime()
  const now = Date.now()
  const hoursElapsed = (now - created) / (1000 * 60 * 60)
  if (hoursElapsed < 12) return "fresh"
  if (hoursElapsed < 48) return "returning"
  return "cold"
}

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
    reloadFromStorage,
  } = useTaskState()
  const { state: breakdownState, breakDown } = useBreakdownTask()
  const { isAuthenticated, signInWithGoogle } = useAuth()
  const insets = useSafeAreaInsets()

  const [goal, setGoal] = useState("")
  const [showMoodCheck, setShowMoodCheck] = useState(false)
  const [hasCompletedFirstTask, setHasCompletedFirstTaskState] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showWelcome, setShowWelcome] = useState(false)
  const [showStepOverlay, setShowStepOverlay] = useState(false)
  const [celebrationData, setCelebrationData] = useState<{
    task: Task
    completedStepIds: string[]
  } | null>(null)
  const slideAnim = useRef(new Animated.Value(Dimensions.get("window").height)).current
  const wasAuthenticatedRef = useRef(isAuthenticated)
  const hasCapturedCelebration = useRef(false)

  useEffect(() => {
    getHasCompletedFirstTask().then(setHasCompletedFirstTaskState)
  }, [])

  useFocusEffect(
    useCallback(() => {
      reloadFromStorage()
    }, [reloadFromStorage])
  )

  useEffect(() => {
    if (isAuthenticated && !wasAuthenticatedRef.current) {
      setShowWelcome(true)
      const timer = setTimeout(() => setShowWelcome(false), 4000)
      wasAuthenticatedRef.current = true
      return () => clearTimeout(timer)
    }
    wasAuthenticatedRef.current = isAuthenticated
  }, [isAuthenticated])

  useEffect(() => {
    if (showStepOverlay) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start()
    } else {
      Animated.timing(slideAnim, {
        toValue: Dimensions.get("window").height,
        duration: 250,
        useNativeDriver: true,
      }).start()
    }
  }, [showStepOverlay])

  useEffect(() => {
    if (isTaskComplete && currentTask && !hasCapturedCelebration.current) {
      hasCapturedCelebration.current = true
      const data = { task: { ...currentTask }, completedStepIds: [...completedStepIds] }
      setCelebrationData(data)
      setCompletedTask({ ...currentTask, completedStepIds })
      incrementTasksCompletedCount()
      clearTask()
    }
  }, [isTaskComplete, currentTask, completedStepIds, clearTask])

  const recency = currentTask?.created_at ? getRecencyLevel(currentTask.created_at) : "fresh"

  const companionContext = {
    userName: userName ?? "there",
    currentTask: currentTask?.title,
    currentStepTitle: currentStep?.title,
    currentStepInstruction: currentStep?.instruction,
    moodScore: mood ?? undefined,
    completedSteps: completedStepIds.length,
    totalSteps: currentTask?.steps.length ?? 0,
    recency,
  }

  const promptLine = !mood || mood >= 3
    ? mood && mood >= 4
      ? "You seem ready. What are we working on?"
      : "What would you like to get done today?"
    : "No pressure. What's one thing you'd like to move forward today?"

  const flattenSteps = (result: SafeBreakdownResponse): Step[] => {
    if (result.is_multi_phase && result.phases) {
      return result.phases.flatMap((p) => p.steps)
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
          steps: flattenSteps(result).map((s, i: number) => ({
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
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong while creating your task. Please try again.")
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
          steps: flattenSteps(result).map((s, i: number) => ({
            step_order: i + 1,
            title: s.title,
            instruction: s.instruction,
            estimated_minutes: s.estimated_minutes,
          })),
          is_multi_phase: result.is_multi_phase,
        })

        setGoal("")
        router.push("/(tabs)/journey")
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Something went wrong while creating your task. Please try again.")
      }
    },
    [goal, startNewTask, breakDown, setMood]
  )

  const handleContinue = useCallback(() => {
    setShowStepOverlay(true)
  }, [])

  const handleBeginStep = useCallback(() => {
    setShowStepOverlay(false)
    router.push("/focus-timer")
  }, [])

  const handleStartNew = useCallback(async () => {
    await clearTask()
    await clearCompletedTask()
    setCelebrationData(null)
    setShowMoodCheck(false)
    setGoal("")
    setError(null)
    hasCapturedCelebration.current = false
  }, [clearTask])

  const handleRest = useCallback(async () => {
    const twoHoursLater = new Date(Date.now() + 2 * 60 * 60 * 1000)
    await setRestUntil(twoHoursLater.toISOString())
    await clearTask()
    setGoal("")
  }, [clearTask])

  const handleViewCompletedJourney = useCallback(() => {
    router.push("/(tabs)/journey?mode=review")
  }, [])

  const getGreeting = (): string => {
    if (recency === "fresh") {
      return `Welcome back, ${userName ?? "there"}.`
    }
    if (recency === "returning") {
      return `Good to see you again, ${userName ?? "there"}.`
    }
    return `Welcome back, ${userName ?? "there"}.`
  }

  // State C — Goal Completed (celebration screen)
  if (celebrationData) {
    const { task: completedTask, completedStepIds: completedIds } = celebrationData
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ScrollView
          contentContainerStyle={styles.celebrationScroll}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.avatarContainer}>
            <CompanionAvatar size={72} />
          </View>

          <Text style={styles.celebrationHeading}>
            Congratulations, {userName ?? "there"}.
          </Text>
          <Text style={styles.celebrationMessage}>
            You worked through it. That's the whole thing.
          </Text>

          <CompletedGoalCard
            title={completedTask.title}
            completedStepCount={completedIds.length}
            totalStepCount={completedTask.steps.length}
            createdAt={completedTask.created_at}
            completedAt={Date.now().toString()}
          />

          <CompanionReflectionCard />

          <Button
            title="Start something new"
            onPress={handleStartNew}
            variant="primary"
            style={styles.actionButton}
          />

          <TouchableOpacity
            style={styles.viewJourneyButton}
            onPress={handleViewCompletedJourney}
            activeOpacity={0.7}
          >
            <Text style={styles.viewJourneyText}>View completed journey</Text>
          </TouchableOpacity>

          <View style={{ height: insets.bottom + theme.spacing.xl }} />
        </ScrollView>

        <AiCompanion context={companionContext} isVisible shouldPulse={false} />
      </View>
    )
  }

  // State B — Active Task (Welcome Back)
  if (hasActiveTask && currentTask && currentStep) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <CompanionAvatar size={72} />
        <Text style={styles.greeting}>{getGreeting()}</Text>
        <Text style={styles.promptTextNarrow}>Let's pick up where you left off.</Text>
        <View style={styles.taskCard}>
          <Text style={styles.taskCardLabel}>Current goal</Text>
          <Text style={styles.taskTitle}>{currentTask.title}</Text>
          <Text style={styles.stepCount}>{completedStepIds.length} out of {currentTask.steps.length} step{currentTask.steps.length !== 1 ? "s" : ""} completed</Text>
          <Button title={`Continue from step ${currentStep.step_order}`} onPress={handleContinue} variant="primary" style={styles.cardButton} />
        </View>
        <View style={styles.motivationCard}>
          <Text style={styles.motivationIcon}>✨</Text>
          <Text style={styles.motivationText}>You are making progress, one step closer to your goals.</Text>
        </View>
        <AiCompanion context={companionContext} isVisible shouldPulse={false} />

        <Modal visible={showStepOverlay} transparent animationType="none" onRequestClose={() => setShowStepOverlay(false)}>
          <TouchableOpacity style={styles.overlayBackdrop} activeOpacity={1} onPress={() => setShowStepOverlay(false)}>
            <Animated.View style={[styles.overlaySheet, { transform: [{ translateY: slideAnim }] }]}>
              <TouchableOpacity activeOpacity={1} onPress={() => {}}>
                <View style={styles.overlayHandle} />
                <TouchableOpacity onPress={() => setShowStepOverlay(false)} style={styles.overlayBackButton}>
                  <Text style={styles.overlayBackText}>← Back</Text>
                </TouchableOpacity>
                <ScrollView style={styles.overlayScroll} showsVerticalScrollIndicator={false}>
                  <Text style={styles.overlayTitle}>{currentStep?.title}</Text>
                  <View style={styles.overlayStepBadge}>
                    <Text style={styles.overlayStepBadgeText}>
                      Step {currentStep?.step_order}{currentStep?.estimated_minutes ? ` · ${currentStep.estimated_minutes} min` : ""}
                    </Text>
                  </View>
                  {currentStep?.instruction ? (
                    <Text style={styles.overlayInstruction}>{currentStep.instruction}</Text>
                  ) : null}
                  <TouchableOpacity style={styles.overlayBeginButton} onPress={handleBeginStep} activeOpacity={0.85}>
                    <Text style={styles.overlayBeginButtonText}>Begin this step</Text>
                  </TouchableOpacity>
                  <View style={{ height: 40 }} />
                </ScrollView>
              </TouchableOpacity>
            </Animated.View>
          </TouchableOpacity>
        </Modal>
      </View>
    )
  }
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
        <EmojiMoodPicker onSelect={handlePreTaskMood} />
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
          <CompanionAvatar size={72} />
        </View>

        {/* Greeting — small, secondary */}
        <Text style={styles.greetingLine}>Hello {userName ?? "there"}.</Text>
        {/* Prompt — main call to action */}
        <Text style={styles.promptText}>{promptLine}</Text>

        <StyledInput
          variant="standard"
          placeholder="Describe your goal..."
          placeholderTextColor={theme.colors.onSurfaceVariant}
          value={goal}
          onChangeText={setGoal}
          style={styles.input}
          inputStyle={{ fontWeight: theme.typography.weight.medium, minHeight: Platform.OS === "web" ? 60 : undefined }}
          multiline
        />
        <Text style={styles.hintText}>Tip: specific goals get better breakdowns</Text>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <Button
          title="Let's break it down"
          onPress={handleSubmitGoal}
          variant="primary"
          disabled={!goal.trim()}
          style={styles.actionButton}
        />
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
  celebrationScroll: {
    flexGrow: 1,
    alignItems: "center",
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xl,
    gap: theme.spacing.lg,
  },
  greeting: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body.medium.fontSize,
    lineHeight: theme.typography.body.medium.lineHeight,
    fontWeight: theme.typography.weight.medium,
    color: theme.colors.onSurfaceVariant,
    textAlign: "center",
    marginBottom: theme.spacing.sm,
  },
  greetingLine: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body.medium.fontSize,
    lineHeight: theme.typography.body.medium.lineHeight,
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
  promptTextNarrow: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.title.fontSize,
    lineHeight: theme.typography.title.lineHeight,
    fontWeight: theme.typography.weight.semibold,
    color: theme.colors.onBackground,
    textAlign: "center",
    marginBottom: theme.spacing.lg,
    paddingHorizontal: 48,
  },
  input: {
    width: "100%",
  },
  actionButton: {
    width: "100%",
    marginTop: 48,
  },
  secondaryButton: {
    width: "100%",
    marginTop: theme.spacing.sm,
  },
  cardButton: {
    width: "100%",
    marginTop: theme.spacing.md,
  },
  taskCard: {
    width: "100%",
    backgroundColor: theme.colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    borderRadius: theme.radius.xl,
    padding: 12,
    gap: theme.spacing.sm,
    shadowColor: theme.colors.outline,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: theme.spacing.lg,
  },
  motivationCard: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    borderRadius: theme.radius.xl,
    padding: 12,
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  motivationIcon: {
    fontSize: 28,
    color: theme.colors.primary,
  },
  motivationText: {
    flex: 1,
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body.medium.fontSize,
    lineHeight: theme.typography.body.medium.lineHeight,
    color: theme.colors.secondary,
  },
  taskCardLabel: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.label.medium.fontSize,
    color: theme.colors.secondary,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  stepCount: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body.small.fontSize,
    color: theme.colors.primary,
    marginTop: theme.spacing.xs,
  },
  taskCardDivider: {
    height: 1,
    backgroundColor: theme.colors.outlineVariant,
    marginVertical: theme.spacing.xs,
  },
  taskTitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body.large.fontSize,
    lineHeight: theme.typography.body.large.lineHeight,
    fontWeight: theme.typography.weight.medium,
    color: theme.colors.onSurface,
  },
  stepTitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.title.fontSize,
    lineHeight: theme.typography.title.lineHeight,
    fontWeight: theme.typography.weight.semibold,
    color: theme.colors.onSurface,
    textAlign: "center",
  },
  celebrationHeading: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.title.fontSize,
    lineHeight: theme.typography.title.lineHeight,
    fontWeight: theme.typography.weight.semibold,
    color: theme.colors.onSurface,
    textAlign: "center",
  },
  celebrationMessage: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body.large.fontSize,
    lineHeight: theme.typography.body.large.lineHeight,
    color: theme.colors.onSurfaceVariant,
    textAlign: "center",
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  viewJourneyButton: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
  },
  viewJourneyText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body.small.fontSize,
    color: theme.colors.onSurfaceVariant,
    fontWeight: theme.typography.weight.medium,
    textDecorationLine: "underline",
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
    marginTop: theme.spacing.sm,
  },
  hintText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body.small.fontSize,
    color: theme.colors.secondary,
    marginTop: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xs,
  },
  overlayBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },
  overlaySheet: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    maxHeight: Dimensions.get("window").height * 0.75,
  },
  overlayHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.outline,
    alignSelf: "center",
    marginBottom: theme.spacing.md,
  },
  overlayBackButton: {
    paddingVertical: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  overlayBackText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body.medium.fontSize,
    color: theme.colors.onSurfaceVariant,
    fontWeight: theme.typography.weight.medium,
  },
  overlayScroll: {
    paddingTop: theme.spacing.md,
  },
  overlayTitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.title.fontSize,
    lineHeight: theme.typography.title.lineHeight,
    fontWeight: theme.typography.weight.semibold,
    color: theme.colors.onSurface,
    marginBottom: theme.spacing.lg,
  },
  overlayStepBadge: {
    alignSelf: "flex-start",
    backgroundColor: theme.colors.surfaceContainerLow,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radius.full,
    marginBottom: theme.spacing.md,
  },
  overlayStepBadgeText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.label.small.fontSize,
    color: theme.colors.onSurfaceVariant,
    fontWeight: theme.typography.weight.semibold,
  },
  overlayInstruction: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body.large.fontSize,
    lineHeight: theme.typography.body.large.lineHeight,
    color: theme.colors.onSurfaceVariant,
    marginBottom: theme.spacing.xl,
  },
  overlayBeginButton: {
    backgroundColor: theme.colors.secondary,
    borderRadius: theme.radius.lg,
    paddingVertical: theme.spacing.md,
    alignItems: "center",
    marginBottom: theme.spacing.md,
  },
  overlayBeginButtonText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body.large.fontSize,
    fontWeight: theme.typography.weight.semibold,
    color: theme.colors.onSecondary,
  },
})
