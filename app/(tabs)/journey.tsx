import { useCallback } from "react"
import { View, Text, StyleSheet } from "react-native"
import { router } from "expo-router"
import { theme } from "../../src/theme/tokens"
import { JourneyPath } from "../../src/components/JourneyPath"
import { useTaskState } from "../../src/hooks/useTaskState"
import { useCompanionPulse } from "../../src/hooks/useCompanionPulse"

export default function Journey() {
  const {
    currentTask,
    currentStep,
    currentStepIndex,
    completedStepIds,
    hasActiveTask,
  } = useTaskState()

  useCompanionPulse(currentStep?.estimated_minutes ?? null)

  const handleBeginStep = useCallback(() => {
    router.push("/focus-timer")
  }, [])

  if (!hasActiveTask || !currentTask) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>
          No active task yet.{"\n"}Tell us what you want to work on.
        </Text>
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
    padding: theme.spacing.xl,
    backgroundColor: theme.colors.background,
  },
  emptyText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body.large.fontSize,
    color: theme.colors.onSurfaceVariant,
    textAlign: "center",
    lineHeight: theme.typography.body.large.lineHeight,
  },
})
