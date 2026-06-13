import { useCallback, useState } from "react"
import { View, Text, StyleSheet, TouchableOpacity } from "react-native"
import { router } from "expo-router"
import { theme } from "../src/theme/tokens"
import { AmbientFill } from "../src/components/AmbientFill"
import { AiCompanion } from "../src/components/AiCompanion"
import { useTaskState } from "../src/hooks/useTaskState"
import { useOnboarding } from "../src/hooks/useOnboarding"

export default function FocusTimer() {
  const { userName } = useOnboarding()
  const { currentTask, currentStep, currentStepIndex, completedStepIds, completeStepAndAdvance } =
    useTaskState()
  const [isActive, setIsActive] = useState(true)
  const [companionOpen, setCompanionOpen] = useState(false)
  const [acknowledgment, setAcknowledgment] = useState<string | null>(null)

  const handleDone = useCallback(async () => {
    setIsActive(false)
    await completeStepAndAdvance()

    const allDone = currentTask && completedStepIds.length + 1 >= currentTask.steps.length

    setAcknowledgment("Good. One step closer.")

    setTimeout(() => {
      if (allDone) {
        router.replace("/(tabs)/home")
      } else {
        router.back()
      }
    }, 1500)
  }, [completeStepAndAdvance, currentTask, completedStepIds.length])

  const handleStop = useCallback(() => {
    setIsActive(false)
    setCompanionOpen(true)
  }, [])

  const companionContext = {
    userName: userName ?? "there",
    currentTask: currentTask?.title,
    currentStepTitle: currentStep?.title,
    currentStepInstruction: currentStep?.instruction,
    completedSteps: completedStepIds.length,
    totalSteps: currentTask?.steps.length ?? 0,
  }

  if (!currentStep) {
    return (
      <View style={styles.container}>
        <Text style={styles.instruction}>No active step</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <AmbientFill
        durationMinutes={currentStep.estimated_minutes}
        isActive={isActive && !acknowledgment}
      />

      {acknowledgment ? (
        <View style={styles.acknowledgmentContainer}>
          <Text style={styles.acknowledgmentText}>{acknowledgment}</Text>
        </View>
      ) : (
        <Text style={styles.instruction}>{currentStep.instruction}</Text>
      )}

      {!acknowledgment && (
        <View style={styles.buttonArea}>
          <TouchableOpacity onPress={handleDone} style={styles.doneButton} activeOpacity={0.7}>
            <Text style={styles.doneText}>I've done this</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleStop} style={styles.stopLink} activeOpacity={0.6}>
            <Text style={styles.stopText}>I need to stop</Text>
          </TouchableOpacity>
        </View>
      )}

      <AiCompanion
        context={companionContext}
        isVisible
        shouldPulse={false}
        startOpen={companionOpen}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: theme.spacing.xl,
    backgroundColor: theme.colors.background,
  },
  instruction: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body.large.fontSize,
    lineHeight: theme.typography.body.large.lineHeight,
    color: theme.colors.onBackground,
    textAlign: "center",
    marginTop: theme.spacing.xl,
    maxWidth: 320,
  },
  acknowledgmentContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  acknowledgmentText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.title.fontSize,
    lineHeight: theme.typography.title.lineHeight,
    color: theme.colors.onBackground,
    textAlign: "center",
  },
  buttonArea: {
    alignItems: "center",
    gap: theme.spacing.md,
    marginBottom: theme.spacing.xl,
  },
  doneButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.radius.md,
    minWidth: 200,
    alignItems: "center",
  },
  doneText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body.medium.fontSize,
    fontWeight: theme.typography.weight.medium,
    color: theme.colors.onPrimary,
  },
  stopLink: {
    paddingVertical: theme.spacing.sm,
  },
  stopText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body.small.fontSize,
    color: theme.colors.onSurfaceVariant,
    textDecorationLine: "underline",
  },
})
