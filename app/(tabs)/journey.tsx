import { useState, useCallback, useEffect } from "react"
import { View, Text, StyleSheet, TouchableOpacity } from "react-native"
import { router, useFocusEffect, useLocalSearchParams } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { theme } from "../../src/theme/tokens"
import { JourneyPath } from "../../src/components/JourneyPath"
import { Button } from "../../src/components/Button"
import { AiCompanion } from "../../src/components/AiCompanion"
import { GoalPauseSheet } from "../../src/components/GoalPauseSheet"
import { ChevronLeft } from "../../src/components/icons"
import { useTaskState } from "../../src/hooks/useTaskState"
import { useOnboarding } from "../../src/hooks/useOnboarding"
import { useCompanionPulse } from "../../src/hooks/useCompanionPulse"
import { useAuth } from "../../src/hooks/useAuth"
import { pauseTask, archiveTask, completeTask } from "../../src/services/tasks.service"
import { getCompletedTask } from "../../src/lib/storage"
import type { Step, Task } from "../../src/types"

export default function Journey() {
  const insets = useSafeAreaInsets()
  const { userName } = useOnboarding()
  const { mode } = useLocalSearchParams<{ mode?: string }>()
  const isReview = mode === "review"

  const {
    currentTask,
    currentStep,
    currentStepIndex,
    completedStepIds,
    hasActiveTask,
    reloadFromStorage,
    pauseTask: pauseTaskLocally,
    archiveTask: archiveTaskLocally,
    replaceStepWithSubSteps,
  } = useTaskState()

  const [completedTask, setCompletedTask] = useState<Task | null>(null)
  const [completedTaskStepIds, setCompletedTaskStepIds] = useState<string[]>([])

  useEffect(() => {
    if (isReview) {
      getCompletedTask().then((data) => {
        if (data) {
          const saved = data as Task & { completedStepIds?: string[] }
          setCompletedTask(saved)
          setCompletedTaskStepIds(
            saved.completedStepIds ?? saved.steps.map((_, i) => String(i + 1))
          )
        }
      })
    }
  }, [isReview])

  useFocusEffect(
    useCallback(() => {
      if (!isReview) {
        reloadFromStorage()
      }
    }, [reloadFromStorage, isReview])
  )

  const { isAuthenticated } = useAuth()

  const { shouldPulse, clearPulse } = useCompanionPulse(currentStep?.estimated_minutes ?? null)

  const [isPauseSheetOpen, setIsPauseSheetOpen] = useState(false)

  const handleBeginStep = useCallback(() => {
    router.push("/focus-timer")
  }, [])

  const handlePauseAndNavigateHome = useCallback(async () => {
    if (isAuthenticated && currentTask?.id) {
      try {
        await pauseTask(currentTask.id)
      } catch {
        // Continue with local state even if DB sync fails
      }
    }
    await pauseTaskLocally()
    setIsPauseSheetOpen(false)
    router.push("/(tabs)/home")
  }, [isAuthenticated, currentTask, pauseTaskLocally])

  const handleArchiveAndNavigateHome = useCallback(async () => {
    if (isAuthenticated && currentTask?.id) {
      try {
        await archiveTask(currentTask.id)
      } catch {
        // Continue with local state
      }
    }
    await archiveTaskLocally()
    setIsPauseSheetOpen(false)
    router.push("/(tabs)/home")
  }, [isAuthenticated, currentTask, archiveTaskLocally])

  const handleCompleteAndNavigateHome = useCallback(async () => {
    if (isAuthenticated && currentTask?.id) {
      try {
        await completeTask(currentTask.id)
      } catch {
        // Continue with local state
      }
    }
    await archiveTaskLocally()
    setIsPauseSheetOpen(false)
    router.push("/(tabs)/home")
  }, [isAuthenticated, currentTask, archiveTaskLocally])

  const handleBreakDownStep = useCallback(async (subSteps: Step[]) => {
    await replaceStepWithSubSteps(currentStepIndex, subSteps)
    setIsPauseSheetOpen(false)
  }, [currentStepIndex, replaceStepWithSubSteps])

  if (isReview && completedTask) {
    const allCompletedIds = completedTask.steps.map((s) => s.id ?? String(s.step_order))
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.push("/(tabs)/home")}
        >
          <ChevronLeft color={theme.colors.onSurface} size={24} />
        </TouchableOpacity>

        <View style={styles.pillContainer}>
          <Text style={styles.pillText}>Completed Journey</Text>
        </View>

        <View style={styles.taskDetails}>
          <Text style={styles.taskTitle}>{completedTask.title}</Text>
        </View>

        <JourneyPath
          steps={completedTask.steps}
          completedStepIds={allCompletedIds}
          currentStepIndex={0}
          phases={completedTask.phases}
          onBeginStep={() => {}}
          isAuthenticated={isAuthenticated}
        />

        <AiCompanion
          context={{
            userName: userName ?? "there",
            currentTask: completedTask.title,
            completedSteps: completedTask.steps.length,
            totalSteps: completedTask.steps.length,
          }}
          isVisible
          shouldPulse={false}
        />
      </View>
    )
  }

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
        isAuthenticated={isAuthenticated}
      />

      <TouchableOpacity
        style={styles.pauseButton}
        onPress={() => setIsPauseSheetOpen(true)}
        activeOpacity={0.7}
      >
        <Text style={styles.pauseButtonText}>Pause this goal</Text>
      </TouchableOpacity>

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

      <GoalPauseSheet
        isOpen={isPauseSheetOpen}
        onClose={() => setIsPauseSheetOpen(false)}
        task={currentTask}
        completedStepCount={completedStepIds.length}
        onPauseAndNavigateHome={handlePauseAndNavigateHome}
        onArchiveAndNavigateHome={handleArchiveAndNavigateHome}
        onCompleteAndNavigateHome={handleCompleteAndNavigateHome}
        onBreakDownStep={handleBreakDownStep}
        currentStepTitle={currentStep?.title ?? ""}
        currentStepInstruction={currentStep?.instruction ?? ""}
        currentStepMinutes={currentStep?.estimated_minutes ?? 10}
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
  pauseButton: {
    alignSelf: "center",
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  pauseButtonText: {
    fontFamily: theme.typography.fontFamily,
    fontSize: theme.typography.body.small.fontSize,
    color: theme.colors.onSurfaceVariant,
    fontWeight: theme.typography.weight.medium,
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
