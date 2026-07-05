import AsyncStorage from "@react-native-async-storage/async-storage"
import { SupabaseClient } from "@supabase/supabase-js"
import { Task, Step, PauseReason } from "../types"

const KEYS = {
  ONBOARDING_COMPLETE: "onboarding_complete",
  USER_NAME: "user_name",
  CURRENT_TASK: "current_task",
  CURRENT_STEP: "current_step",
  COMPLETED_STEP_IDS: "completed_step_ids",
  SESSION_MOOD: "session_mood",
  REST_UNTIL: "rest_until",
  HAS_SEEN_SIGN_UP_PROMPT: "has_seen_sign_up_prompt",
  NOTIFICATIONS_ENABLED: "notifications_enabled",
  HAS_COMPLETED_FIRST_TASK: "has_completed_first_task",
  PAUSED_TASK: "paused_task",
  PAUSED_AT: "paused_at",
  FEEDBACK_REASON: "feedback_reason",
  FEEDBACK_TEXT: "feedback_text",
  COMPLETED_TASK: "completed_task",
  TASKS_COMPLETED_COUNT: "tasks_completed_count",
}

export async function getOnboardingComplete(): Promise<boolean> {
  const val = await AsyncStorage.getItem(KEYS.ONBOARDING_COMPLETE)
  return val === "true"
}

export async function setOnboardingComplete(): Promise<void> {
  await AsyncStorage.setItem(KEYS.ONBOARDING_COMPLETE, "true")
}

export async function getUserName(): Promise<string | null> {
  return AsyncStorage.getItem(KEYS.USER_NAME)
}

export async function setUserName(name: string): Promise<void> {
  await AsyncStorage.setItem(KEYS.USER_NAME, name)
}

export async function getCurrentTask(): Promise<Task | null> {
  const val = await AsyncStorage.getItem(KEYS.CURRENT_TASK)
  return val ? JSON.parse(val) : null
}

export async function setCurrentTask(task: Task): Promise<void> {
  await AsyncStorage.setItem(KEYS.CURRENT_TASK, JSON.stringify(task))
}

export async function clearCurrentTask(): Promise<void> {
  await AsyncStorage.multiRemove([
    KEYS.CURRENT_TASK,
    KEYS.CURRENT_STEP,
    KEYS.COMPLETED_STEP_IDS,
  ])
}

export async function getCurrentStep(): Promise<Step | null> {
  const val = await AsyncStorage.getItem(KEYS.CURRENT_STEP)
  return val ? JSON.parse(val) : null
}

export async function setCurrentStep(step: Step): Promise<void> {
  await AsyncStorage.setItem(KEYS.CURRENT_STEP, JSON.stringify(step))
}

export async function getCompletedStepIds(): Promise<string[]> {
  const val = await AsyncStorage.getItem(KEYS.COMPLETED_STEP_IDS)
  return val ? JSON.parse(val) : []
}

export async function addCompletedStepId(id: string): Promise<void> {
  const ids = await getCompletedStepIds()
  ids.push(id)
  await AsyncStorage.setItem(KEYS.COMPLETED_STEP_IDS, JSON.stringify(ids))
}

export async function getSessionMood(): Promise<number | null> {
  const val = await AsyncStorage.getItem(KEYS.SESSION_MOOD)
  return val ? Number(val) : null
}

export async function setSessionMood(mood: number): Promise<void> {
  await AsyncStorage.setItem(KEYS.SESSION_MOOD, String(mood))
}

export async function getRestUntil(): Promise<string | null> {
  return AsyncStorage.getItem(KEYS.REST_UNTIL)
}

export async function setRestUntil(timestamp: string | null): Promise<void> {
  if (timestamp) {
    await AsyncStorage.setItem(KEYS.REST_UNTIL, timestamp)
  } else {
    await AsyncStorage.removeItem(KEYS.REST_UNTIL)
  }
}

export async function getHasSeenSignUpPrompt(): Promise<boolean> {
  const val = await AsyncStorage.getItem(KEYS.HAS_SEEN_SIGN_UP_PROMPT)
  return val === "true"
}

export async function setHasSeenSignUpPrompt(): Promise<void> {
  await AsyncStorage.setItem(KEYS.HAS_SEEN_SIGN_UP_PROMPT, "true")
}

export async function getHasCompletedFirstTask(): Promise<boolean> {
  const val = await AsyncStorage.getItem(KEYS.HAS_COMPLETED_FIRST_TASK)
  return val === "true"
}

export async function setHasCompletedFirstTask(): Promise<void> {
  await AsyncStorage.setItem(KEYS.HAS_COMPLETED_FIRST_TASK, "true")
}

export async function getNotificationsEnabled(): Promise<boolean> {
  const val = await AsyncStorage.getItem(KEYS.NOTIFICATIONS_ENABLED)
  return val !== "false"
}

export async function setNotificationsEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(KEYS.NOTIFICATIONS_ENABLED, String(enabled))
}

export async function getPausedTask(): Promise<Task | null> {
  const val = await AsyncStorage.getItem(KEYS.PAUSED_TASK)
  return val ? JSON.parse(val) : null
}

export async function setPausedTask(task: Task): Promise<void> {
  await AsyncStorage.setItem(KEYS.PAUSED_TASK, JSON.stringify(task))
}

export async function clearPausedTask(): Promise<void> {
  await AsyncStorage.multiRemove([KEYS.PAUSED_TASK, KEYS.PAUSED_AT])
}

export async function setPausedAt(timestamp: string): Promise<void> {
  await AsyncStorage.setItem(KEYS.PAUSED_AT, timestamp)
}

export async function getPausedAt(): Promise<string | null> {
  return AsyncStorage.getItem(KEYS.PAUSED_AT)
}

export async function saveFeedbackLocally(
  reason: PauseReason,
  text?: string
): Promise<void> {
  await AsyncStorage.setItem(KEYS.FEEDBACK_REASON, reason)
  if (text) {
    await AsyncStorage.setItem(KEYS.FEEDBACK_TEXT, text)
  }
}

export async function getLocalFeedback(): Promise<{
  reason: PauseReason | null
  text: string | null
}> {
  const [reason, text] = await Promise.all([
    AsyncStorage.getItem(KEYS.FEEDBACK_REASON) as Promise<PauseReason | null>,
    AsyncStorage.getItem(KEYS.FEEDBACK_TEXT),
  ])
  return { reason, text }
}

export async function clearFeedback(): Promise<void> {
  await AsyncStorage.multiRemove([KEYS.FEEDBACK_REASON, KEYS.FEEDBACK_TEXT])
}

export async function setCompletedTask(task: Task): Promise<void> {
  await AsyncStorage.setItem(KEYS.COMPLETED_TASK, JSON.stringify(task))
}

export async function getCompletedTask(): Promise<Task | null> {
  const val = await AsyncStorage.getItem(KEYS.COMPLETED_TASK)
  return val ? JSON.parse(val) : null
}

export async function clearCompletedTask(): Promise<void> {
  await AsyncStorage.removeItem(KEYS.COMPLETED_TASK)
}

export async function getTasksCompletedCount(): Promise<number> {
  const val = await AsyncStorage.getItem(KEYS.TASKS_COMPLETED_COUNT)
  return val ? Number(val) : 0
}

export async function incrementTasksCompletedCount(): Promise<number> {
  const current = await getTasksCompletedCount()
  const next = current + 1
  await AsyncStorage.setItem(KEYS.TASKS_COMPLETED_COUNT, String(next))
  return next
}

export async function setTasksCompletedCount(count: number): Promise<void> {
  await AsyncStorage.setItem(KEYS.TASKS_COMPLETED_COUNT, String(count))
}

export async function migrateGuestDataToSupabase(
  userId: string,
  supabaseClient: SupabaseClient
): Promise<void> {
  const [name, task, step, completedIds] = await Promise.all([
    getUserName(),
    getCurrentTask(),
    getCurrentStep(),
    getCompletedStepIds(),
  ])

  try {
    const errors: Error[] = []

    if (name) {
      const { error } = await supabaseClient
        .from("profiles")
        .upsert({ id: userId, name })
      if (error) errors.push(error)
    }

    if (task && step) {
      const { id: taskId, ...taskData } = task as unknown as Record<string, unknown> & { steps?: Record<string, unknown>[] }

      const { data: newTask, error: taskError } = await supabaseClient
        .from("tasks")
        .insert({ ...taskData, user_id: userId })
        .select("id")
        .single()

      if (taskError) {
        errors.push(taskError)
      } else if (newTask) {
        const stepsToInsert = taskData.steps?.map((s) => ({
          task_id: newTask.id,
          step_order: Number(s.step_order),
          title: String(s.title),
          instruction: String(s.instruction),
          estimated_minutes: Number(s.estimated_minutes),
          phase: s.phase ? Number(s.phase) : 1,
          is_completed: completedIds.includes(String(s.id ?? s.step_order)),
        })) ?? []

        if (stepsToInsert.length > 0) {
          const { error: stepsError } = await supabaseClient
            .from("steps")
            .insert(stepsToInsert)
          if (stepsError) errors.push(stepsError)
        }
      }
    }

    if (errors.length > 0) {
      throw new Error(
        `Migration failed: ${errors.map((e) => e.message).join("; ")}`
      )
    }

    await AsyncStorage.clear()
  } catch (error) {
    console.error("Migration failed, local data preserved:", error)
    throw error
  }
}

