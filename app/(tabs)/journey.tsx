import { useCallback } from "react"
import { View, Text, StyleSheet, TouchableOpacity } from "react-native"
import { router, useFocusEffect } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { theme } from "../../src/theme/tokens"
import { JourneyPath } from "../../src/components/JourneyPath"
import { Button } from "../../src/components/Button"
import { AiCompanion } from "../../src/components/AiCompanion"
import { ChevronLeft } from "../../src/components/icons"
import { useTaskState } from "../../src/hooks/useTaskState"
import { useOnboarding } from "../../src/hooks/useOnboarding"
import { useCompanionPulse } from "../../src/hooks/useCompanionPulse"

export default function Journey() {
  const insets = useSafeAreaInsets()
  const { userName } = useOnboarding()
  const {
    currentTask,
    currentStep,
    currentStepIndex,
    completedStepIds,
    hasActiveTask,
    reloadFromStorage,
  } = useTaskState()

  useFocusEffect(
    useCallback(() => {
      reloadFromStorage()
    }, [reloadFromStorage])
  )

  const { shouldPulse, clearPulse } = useCompanionPulse(currentStep?.estimated_minutes ?? null)

  const handleBeginStep = useCallback(() => {
    router.push("/focus-timer")
  }, [])

  if (!hasActiveTask || !currentTask) {
    return (
      <View style={[styles.emptyContainer, { paddingTop: insets.top + theme.spacing.xl }]}>
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

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => {
          if (router.canGoBack()) {
            router.back()
          } else {
            router.push("/(tabs)/home")
          }
        }}
      >
        <ChevronLeft color={theme.colors.onSurface} size={24} />
      </TouchableOpacity>

      <View style={styles.pillContainer}>
        <Text style={styles.pillText}>Task Journey</Text>
      </View>

      <View style={styles.taskDetails}>
        <Text style={styles.taskTitle}>{currentTask.title}</Text>
      </View>

      <JourneyPath
        steps={currentTask.steps}
        completedStepIds={completedStepIds}
        currentStepIndex={currentStepIndex}
        phases={currentTask.phases}
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
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surfaceContainerLow,
    marginLeft: theme.spacing.md,
    marginTop: theme.spacing.sm,
  },
  pillContainer: {
    backgroundColor: theme.colors.primaryContainer,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.full,
    alignSelf: "flex-start",
    marginLeft: theme.spacing.lg,
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  pillText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.label.medium.fontSize,
    fontWeight: theme.typography.weight.semibold,
    color: theme.colors.onSurfaceVariant,
  },
  taskDetails: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.sm,
  },
  taskTitle: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.title.fontSize,
    fontWeight: theme.typography.weight.semibold,
    color: theme.colors.onBackground,
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
