import { useState, useEffect, useCallback } from "react"
import {
  getCurrentTask,
  setCurrentTask,
  clearCurrentTask,
  getCurrentStep,
  setCurrentStep,
  getCompletedStepIds,
  addCompletedStepId,
  setPausedTask,
  clearPausedTask,
  setPausedAt,
} from "../lib/storage"
import { Task, Step } from "../types"

export function useTaskState() {
  const [currentTask, setCurrentTaskState] = useState<Task | null>(null)
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [completedStepIds, setCompletedStepIdsState] = useState<string[]>([])

  useEffect(() => {
    Promise.all([
      getCurrentTask(),
      getCurrentStep(),
      getCompletedStepIds(),
    ]).then(([task, step, completed]) => {
      if (task) {
        setCurrentTaskState(task)
        if (step) {
          const idx = task.steps.findIndex((s) => s.step_order === step.step_order)
          setCurrentStepIndex(idx >= 0 ? idx : 0)
        }
      }
      setCompletedStepIdsState(completed)
    })
  }, [])

  const startNewTask = useCallback(async (task: Task) => {
    await setCurrentTask(task)
    await setCurrentStep(task.steps[0])
    setCurrentTaskState(task)
    setCurrentStepIndex(0)
    setCompletedStepIdsState([])
  }, [])

  const completeStepAndAdvance = useCallback(async () => {
    if (!currentTask) return

    const step = currentTask.steps[currentStepIndex]
    const stepId = step.id ?? String(step.step_order)

    await addCompletedStepId(stepId)
    setCompletedStepIdsState((prev) => [...prev, stepId])

    const nextIndex = currentStepIndex + 1
    if (nextIndex < currentTask.steps.length) {
      const nextStep = currentTask.steps[nextIndex]
      await setCurrentStep(nextStep)
      setCurrentStepIndex(nextIndex)
    }
  }, [currentTask, currentStepIndex])

  const reloadFromStorage = useCallback(async () => {
    const [task, step, completed] = await Promise.all([
      getCurrentTask(),
      getCurrentStep(),
      getCompletedStepIds(),
    ])
    if (task) {
      setCurrentTaskState(task)
      if (step) {
        const idx = task.steps.findIndex((s) => s.step_order === step.step_order)
        setCurrentStepIndex(idx >= 0 ? idx : 0)
      }
    } else {
      setCurrentTaskState(null)
      setCurrentStepIndex(0)
    }
    setCompletedStepIdsState(completed)
  }, [])

  const clearTask = useCallback(async () => {
    await clearCurrentTask()
    setCurrentTaskState(null)
    setCurrentStepIndex(0)
    setCompletedStepIdsState([])
  }, [])

  const pauseTask = useCallback(async () => {
    if (!currentTask) return
    const now = new Date().toISOString()
    const pausedTask = { ...currentTask, status: "paused" as const, paused_at: now }
    await setPausedTask(pausedTask)
    await setPausedAt(now)
    await clearCurrentTask()
    setCurrentTaskState(null)
    setCurrentStepIndex(0)
    setCompletedStepIdsState([])
  }, [currentTask])

  const archiveTask = useCallback(async () => {
    await clearCurrentTask()
    setCurrentTaskState(null)
    setCurrentStepIndex(0)
    setCompletedStepIdsState([])
  }, [])

  const replaceStepWithSubSteps = useCallback(async (
    stepIndex: number,
    subSteps: Step[]
  ) => {
    if (!currentTask) return
    const updatedSteps = [...currentTask.steps]
    const baseOrder = updatedSteps[stepIndex].step_order
    updatedSteps.splice(stepIndex, 1, ...subSteps.map((s, i) => ({
      ...s,
      step_order: baseOrder + i,
      parent_step_id: currentTask.steps[stepIndex].id ?? null,
    })))
    const reindexedSteps = updatedSteps.map((s, i) => ({ ...s, step_order: i + 1 }))
    const updatedTask = { ...currentTask, steps: reindexedSteps }
    await setCurrentTask(updatedTask)
    await setCurrentStep(reindexedSteps[stepIndex])
    setCurrentTaskState(updatedTask)
    setCurrentStepIndex(stepIndex)
  }, [currentTask])

  const hasActiveTask = currentTask !== null
  const isTaskComplete =
    hasActiveTask && completedStepIds.length === (currentTask?.steps.length ?? 0)
  const currentStep = currentTask?.steps[currentStepIndex] ?? null

  return {
    currentTask,
    currentStep,
    currentStepIndex,
    completedStepIds,
    hasActiveTask,
    isTaskComplete,
    startNewTask,
    completeStepAndAdvance,
    clearTask,
    reloadFromStorage,
    pauseTask,
    archiveTask,
    replaceStepWithSubSteps,
  }
}
