import { supabase } from "./supabase.service"

export async function saveFeedbackToDB(
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
