import AsyncStorage from "@react-native-async-storage/async-storage"

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

export async function getCurrentTask(): Promise<object | null> {
  const val = await AsyncStorage.getItem(KEYS.CURRENT_TASK)
  return val ? JSON.parse(val) : null
}

export async function setCurrentTask(task: object): Promise<void> {
  await AsyncStorage.setItem(KEYS.CURRENT_TASK, JSON.stringify(task))
}

export async function clearCurrentTask(): Promise<void> {
  await AsyncStorage.multiRemove([
    KEYS.CURRENT_TASK,
    KEYS.CURRENT_STEP,
    KEYS.COMPLETED_STEP_IDS,
  ])
}

export async function getCurrentStep(): Promise<object | null> {
  const val = await AsyncStorage.getItem(KEYS.CURRENT_STEP)
  return val ? JSON.parse(val) : null
}

export async function setCurrentStep(step: object): Promise<void> {
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

export async function getNotificationsEnabled(): Promise<boolean> {
  const val = await AsyncStorage.getItem(KEYS.NOTIFICATIONS_ENABLED)
  return val !== "false"
}

export async function setNotificationsEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(KEYS.NOTIFICATIONS_ENABLED, String(enabled))
}

export async function migrateGuestDataToSupabase(
  userId: string,
  supabaseClient: any
): Promise<void> {
  const [name, task, step, completedIds, mood] = await Promise.all([
    getUserName(),
    getCurrentTask(),
    getCurrentStep(),
    getCompletedStepIds(),
    getSessionMood(),
  ])

  if (name) {
    await supabaseClient
      .from("profiles")
      .upsert({ id: userId, name })
  }

  if (task && step) {
    const { id: taskId, ...taskData } = task as any
    const { data: newTask } = await supabaseClient
      .from("tasks")
      .insert({ ...taskData, user_id: userId })
      .select("id")
      .single()

    if (newTask) {
      const stepsToInsert = taskData.steps?.map((s: any) => ({
        task_id: newTask.id,
        step_order: s.step_order,
        title: s.title,
        instruction: s.instruction,
        estimated_minutes: s.estimated_minutes,
        phase: s.phase ?? 1,
        is_completed: completedIds.includes(s.id ?? String(s.step_order)),
      })) ?? []

      if (stepsToInsert.length > 0) {
        await supabaseClient.from("steps").insert(stepsToInsert)
      }
    }
  }

  await AsyncStorage.clear()
}
