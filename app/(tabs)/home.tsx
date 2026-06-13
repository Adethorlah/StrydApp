import { useState, useCallback, useEffect, useRef } from "react"
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform } from "react-native"
import { router } from "expo-router"
import { theme } from "../../src/theme/tokens"
import { StyledInput } from "../../src/components/TextInput"
import { Button } from "../../src/components/Button"
import { EmojiMoodPicker } from "../../src/components/EmojiMoodPicker"
import { LoadingState } from "../../src/components/LoadingState"
import { AiCompanion } from "../../src/components/AiCompanion"
import { useOnboarding } from "../../src/hooks/useOnboarding"
import { useMoodState } from "../../src/hooks/useMoodState"
import { useTaskState } from "../../src/hooks/useTaskState"
import { useBreakdownTask } from "../../src/hooks/useBreakdownTask"
import { useAuth } from "../../src/hooks/useAuth"
import { FallbackStep } from "../../src/types"
import {
  getUserName,
  setRestUntil,
  getHasSeenSignUpPrompt,
  setHasSeenSignUpPrompt,
} from "../../src/lib/storage"

export default function Home() {
  const { userName } = useOnboarding()
  const { mood, setMood } = useMoodState()
  const {
    hasActiveTask,
    isTaskComplete,
    currentTask,
    currentStep,
    currentStepIndex,
    completedStepIds,
    startNewTask,
    clearTask,
  } = useTaskState()
  const { state: breakdownState, breakDown } = useBreakdownTask()
  const { isAuthenticated } = useAuth()

  const [goal, setGoal] = useState("")
  const [showMoodCheck, setShowMoodCheck] = useState(false)
  const [isFirstTask, setIsFirstTask] = useState(true)
  const [name, setName] = useState<string | null>(null)
  const hasRedirectedSignUp = useRef(false)

  useEffect(() => {
    getUserName().then(setName)
  }, [])

  useEffect(() => {
    if (isTaskComplete && !isAuthenticated && !hasRedirectedSignUp.current) {
      getHasSeenSignUpPrompt().then((seen) => {
        if (!seen) {
          hasRedirectedSignUp.current = true
          setHasSeenSignUpPrompt()
          router.push("/sign-up")
        }
      })
    }
  }, [isTaskComplete, isAuthenticated])

  const companionContext = {
    userName: userName ?? name ?? "there",
    currentTask: currentTask?.title,
    currentStepTitle: currentStep?.title,
    currentStepInstruction: currentStep?.instruction,
    moodScore: mood ?? undefined,
    completedSteps: completedStepIds.length,
    totalSteps: currentTask?.steps.length ?? 0,
  }

  const getGreeting = useCallback(() => {
    const n = userName ?? name ?? "there"
    if (!mood || mood >= 3) {
      if (mood && mood >= 4) return `Hey ${n}, you seem ready. What are we working on?`
      return `Hey ${n}, what would you like to get done today?`
    }
    return `Hey ${n}, no pressure. What's one thing you'd like to move forward today?`
  }, [userName, name, mood])

  const flattenSteps = (result: any) => {
    if (result.is_multi_phase && result.phases) {
      return result.phases.flatMap((p: any) => p.steps)
    }
    return result.steps ?? []
  }

  const handleSubmitGoal = useCallback(async () => {
    if (!goal.trim()) return
    if (breakdownState.status === "loading" || breakdownState.status === "building") return

    try {
      if (isFirstTask) {
        const result = await breakDown(goal.trim(), mood ?? 3, 25)
        await startNewTask({
          title: goal.trim(),
          steps: flattenSteps(result).map((s: FallbackStep, i: number) => ({
            step_order: i + 1,
            title: s.title,
            instruction: s.instruction,
            estimated_minutes: s.estimated_minutes,
          })),
          is_multi_phase: result.is_multi_phase,
        })

        setIsFirstTask(false)
        setGoal("")
        router.push("/(tabs)/journey")
      } else {
        setShowMoodCheck(true)
      }
    } catch {
      // Silent failure
    }
  }, [goal, isFirstTask, mood, startNewTask, breakDown, breakdownState.status])

  const handlePreTaskMood = useCallback(
    async (score: number) => {
      try {
        await setMood(score)
        setShowMoodCheck(false)

        const result = await breakDown(goal.trim(), score, 25)
        await startNewTask({
          title: goal.trim(),
          steps: flattenSteps(result).map((s: FallbackStep, i: number) => ({
            step_order: i + 1,
            title: s.title,
            instruction: s.instruction,
            estimated_minutes: s.estimated_minutes,
          })),
          is_multi_phase: result.is_multi_phase,
        })

        setGoal("")
        setIsFirstTask(false)
        router.push("/(tabs)/journey")
      } catch {
        // Silent failure
      }
    },
    [goal, startNewTask, breakDown, setMood]
  )

  const handleContinue = useCallback(() => {
    router.push("/(tabs)/journey")
  }, [])

  const handleStartNew = useCallback(async () => {
    hasRedirectedSignUp.current = false
    await clearTask()
    setShowMoodCheck(false)
    setGoal("")
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
      <View style={styles.container}>
        <Text style={styles.completionMessage}>
          You worked through it, {name ?? "there"}. That's the whole thing.
        </Text>
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
        <AiCompanion context={companionContext} isVisible shouldPulse={false} />
      </View>
    )
  }

  // State B — Active Task
  if (hasActiveTask && currentTask && currentStep) {
    return (
      <View style={styles.container}>
        <Text style={styles.greeting}>Welcome back, {name ?? "there"}. Here's where you are.</Text>
        <Text style={styles.taskTitle}>{currentTask.title}</Text>
        <Text style={styles.stepTitle}>{currentStep.title}</Text>
        <Button title="Continue" onPress={handleContinue} variant="primary" style={styles.actionButton} />
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
      <View style={styles.container}>
        <LoadingState message={breakdownState.message} />
      </View>
    )
  }

  // Mood check (2nd+ task)
  if (showMoodCheck) {
    return (
      <View style={styles.container}>
        <Text style={styles.moodPrompt}>Before we start — how are you feeling right now?</Text>
        <EmojiMoodPicker onSelect={handlePreTaskMood} autoAdvance />
      </View>
    )
  }

  // State A — No Active Task
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <Text style={styles.greeting}>{getGreeting()}</Text>
      <StyledInput
        variant="large"
        placeholder="Describe your goal..."
        value={goal}
        onChangeText={setGoal}
        style={styles.input}
        multiline
      />
      <Button
        title="Let's break it down"
        onPress={handleSubmitGoal}
        variant="primary"
        disabled={!goal.trim()}
        style={styles.actionButton}
      />
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
  greeting: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body.large.fontSize,
    lineHeight: theme.typography.body.large.lineHeight,
    color: theme.colors.onBackground,
    textAlign: "center",
    marginBottom: theme.spacing.lg,
  },
  input: {
    width: "100%",
    marginBottom: theme.spacing.lg,
  },
  actionButton: {
    minWidth: 200,
    marginTop: theme.spacing.md,
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
  },
  moodPrompt: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.title.fontSize,
    lineHeight: theme.typography.title.lineHeight,
    color: theme.colors.onBackground,
    textAlign: "center",
    marginBottom: theme.spacing.lg,
  },
})