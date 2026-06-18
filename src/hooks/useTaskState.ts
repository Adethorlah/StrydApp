import { useState, useEffect, useCallback } from "react"
import {
  getCurrentTask,
  setCurrentTask,
  clearCurrentTask,
  getCurrentStep,
  setCurrentStep,
  getCompletedStepIds,
  addCompletedStepId,
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
        setCurrentTaskState(task as Task)
        if (step) {
          const idx = (task as Task).steps.findIndex((s) => s.step_order === (step as Step).step_order)
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
      setCurrentTaskState(task as Task)
      if (step) {
        const idx = (task as Task).steps.findIndex((s) => s.step_order === (step as Step).step_order)
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
  }
}
