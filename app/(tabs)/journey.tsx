import { useCallback } from "react"
import { View, Text, StyleSheet } from "react-native"
import { router } from "expo-router"
import { theme } from "../../src/theme/tokens"
import { JourneyPath } from "../../src/components/JourneyPath"
import { Button } from "../../src/components/Button"
import { AiCompanion } from "../../src/components/AiCompanion"
import { useTaskState } from "../../src/hooks/useTaskState"
import { useOnboarding } from "../../src/hooks/useOnboarding"
import { useCompanionPulse } from "../../src/hooks/useCompanionPulse"

export default function Journey() {
  const { userName } = useOnboarding()
  const {
    currentTask,
    currentStep,
    currentStepIndex,
    completedStepIds,
    hasActiveTask,
  } = useTaskState()

  const { shouldPulse, clearPulse } = useCompanionPulse(currentStep?.estimated_minutes ?? null)

  const handleBeginStep = useCallback(() => {
    router.push("/focus-timer")
  }, [])

  if (!hasActiveTask || !currentTask) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No active task yet.</Text>
        <Button
          title="Start a task"
          onPress={() => router.push("/(tabs)/home")}
          variant="primary"
          style={styles.emptyButton}
        />
        <AiCompanion
          context={{
            userName: userName ?? "there",
            completedSteps: 0,
            totalSteps: 0,
          }}
          isVisible
          shouldPulse={false}
        />
      </View>
    )
  }

  const phases = currentTask.phases?.map((p) => ({
    phase_order: p.phase_order,
    phase_label: p.phase_label,
  }))

  return (
    <View style={styles.container}>
      <Text style={styles.taskTitle}>{currentTask.title}</Text>
      <JourneyPath
        steps={currentTask.steps}
        completedStepIds={completedStepIds}
        currentStepIndex={currentStepIndex}
        phases={phases}
        onBeginStep={handleBeginStep}
      />
      <AiCompanion
        context={{
          userName: userName ?? "there",
          currentTask: currentTask.title,
          currentStepTitle: currentStep?.title,
          currentStepInstruction: currentStep?.instruction,
          completedSteps: completedStepIds.length,
          totalSteps: currentTask.steps.length,
        }}
        isVisible
        shouldPulse={shouldPulse}
        onPulseClear={clearPulse}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  taskTitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.title.fontSize,
    fontWeight: theme.typography.weight.semibold,
    color: theme.colors.onBackground,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.sm,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: theme.spacing.xl,
    backgroundColor: theme.colors.background,
  },
  emptyText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body.large.fontSize,
    color: theme.colors.onSurfaceVariant,
    textAlign: "center",
    lineHeight: theme.typography.body.large.lineHeight,
    marginBottom: theme.spacing.lg,
  },
  emptyButton: {
    minWidth: 160,
  },
})
