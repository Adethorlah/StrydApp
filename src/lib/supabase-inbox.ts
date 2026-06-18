import { supabase } from "./supabase"

export async function getInboxMessages(userId: string) {
  const { data, error } = await supabase
    .from("inbox_messages")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  if (error) throw error
  return data ?? []
}

export async function markMessageAsRead(messageId: string) {
  const { error } = await supabase
    .from("inbox_messages")
    .update({ is_read: true })
    .eq("id", messageId)

  if (error) throw error
}

export async function markAllAsRead(userId: string) {
  const { error } = await supabase
    .from("inbox_messages")
    .update({ is_read: true })
    .eq("user_id", userId)
    .eq("is_read", false)

  if (error) throw error
}
