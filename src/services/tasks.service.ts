import { supabase } from "./supabase.service"

export interface StepInput {
  step_order: number
  title: string
  instruction: string
  estimated_minutes: number
  phase?: number
}

export async function createTask(
  userId: string,
  title: string,
  steps: StepInput[],
  mood: number,
  isMultiPhase: boolean,
  phases?: { phase_order: number; phase_label: string }[]
) {
  const { data: task, error: taskError } = await supabase
    .from("tasks")
    .insert({
      user_id: userId,
      title,
      mood_at_creation: mood,
      is_multi_phase: isMultiPhase,
      phases_json: phases ? JSON.stringify(phases) : null,
    })
    .select()
    .single()

  if (taskError) throw taskError

  const stepInserts = steps.map((s) => ({
    task_id: task.id,
    step_order: s.step_order,
    title: s.title,
    instruction: s.instruction,
    estimated_minutes: s.estimated_minutes,
    phase: s.phase ?? 1,
    is_active: s.step_order === 1,
  }))

  const { error: stepsError } = await supabase
    .from("steps")
    .insert(stepInserts)

  if (stepsError) throw stepsError

  return task
}

export async function getActiveTask(userId: string) {
  const { data: task, error: taskError } = await supabase
    .from("tasks")
    .select("*")
    .eq("user_id", userId)
    .eq("is_completed", false)
    .order("created_at", { ascending: false })
    .limit(1)
    .single()

  if (taskError && taskError.code !== "PGRST116") throw taskError
  if (!task) return null

  const { data: steps, error: stepsError } = await supabase
    .from("steps")
    .select("*")
    .eq("task_id", task.id)
    .order("step_order", { ascending: true })

  if (stepsError) throw stepsError

  return { ...task, steps }
}

export async function completeStep(stepId: string) {
  const { error } = await supabase
    .from("steps")
    .update({
      is_completed: true,
      is_active: false,
      completed_at: new Date().toISOString(),
    })
    .eq("id", stepId)

  if (error) throw error
}

export async function activateNextStep(taskId: string, currentOrder: number) {
  const { error } = await supabase
    .from("steps")
    .update({ is_active: true })
    .eq("task_id", taskId)
    .eq("step_order", currentOrder + 1)

  if (error) throw error
}

export async function completeTask(taskId: string) {
  const { error } = await supabase
    .from("tasks")
    .update({
      is_completed: true,
      status: "completed",
      completed_at: new Date().toISOString(),
    })
    .eq("id", taskId)

  if (error) throw error
}

export async function pauseTask(taskId: string) {
  const { error } = await supabase
    .from("tasks")
    .update({
      status: "paused",
      paused_at: new Date().toISOString(),
    })
    .eq("id", taskId)

  if (error) throw error
}

export async function archiveTask(taskId: string) {
  const { error } = await supabase
    .from("tasks")
    .update({
      status: "archived",
      is_completed: true,
      completed_at: new Date().toISOString(),
    })
    .eq("id", taskId)

  if (error) throw error
}

export async function saveFeedback(
  userId: string,
  reason: string,
  taskId?: string,
  feedbackText?: string
) {
  const { error } = await supabase
    .from("feedback")
    .insert({
      user_id: userId,
      task_id: taskId ?? null,
      reason,
      feedback_text: feedbackText ?? null,
    })

  if (error) throw error
}

export async function callTaskBreakdown(
  task_title: string,
  mood_score: number,
  available_minutes: number,
  task_description?: string
) {
  const { data, error } = await supabase.functions.invoke("task-breakdown", {
    body: { task_title, mood_score, available_minutes, task_description },
  });

  if (error) throw error;
  return data;
}

export async function callStepBreakdown(
  step_title: string,
  step_instruction: string,
  estimated_minutes: number
) {
  const { data, error } = await supabase.functions.invoke("step-breakdown", {
    body: { step_title, step_instruction, estimated_minutes },
  });

  if (error) throw error;
  return data;
}
