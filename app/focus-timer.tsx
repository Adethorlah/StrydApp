import { useCallback, useEffect, useRef, useState } from "react"
import { View, Text, StyleSheet, TouchableOpacity } from "react-native"
import { router } from "expo-router"
import { theme } from "../src/theme/tokens"
import { AmbientFill } from "../src/components/AmbientFill"
import { useTaskState } from "../src/hooks/useTaskState"
import { getCompletedStepIds, addCompletedStepId } from "../src/lib/storage"

export default function FocusTimer() {
  const { currentTask, currentStep, currentStepIndex, completeStepAndAdvance } = useTaskState()
  const [isActive, setIsActive] = useState(true)

  const handleDone = useCallback(async () => {
    setIsActive(false)
    await completeStepAndAdvance()
    router.back()
  }, [completeStepAndAdvance])

  const handleStop = useCallback(() => {
    setIsActive(false)
    router.back()
  }, [])

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
        isActive={isActive}
      />
      <Text style={styles.instruction}>{currentStep.instruction}</Text>

      <View style={styles.buttonArea}>
        <TouchableOpacity onPress={handleDone} style={styles.doneButton} activeOpacity={0.7}>
          <Text style={styles.doneText}>I've done this</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleStop} style={styles.stopLink} activeOpacity={0.6}>
          <Text style={styles.stopText}>I need to stop</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "space-between",
    alignItems: "center",
    padding: theme.spacing.xl,
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
