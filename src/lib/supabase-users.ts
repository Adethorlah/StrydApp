import { supabase } from "./supabase"

export async function getOrCreateProfile(userId: string, email?: string, name?: string) {
  const { data: existing, error: fetchError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single()

  if (fetchError && fetchError.code !== "PGRST116") throw fetchError

  if (existing) return existing

  const { data, error: insertError } = await supabase
    .from("profiles")
    .insert({
      id: userId,
      email: email ?? null,
      name: name ?? null,
    })
    .select()
    .single()

  if (insertError) throw insertError
  return data
}

export async function updateProfileName(userId: string, name: string) {
  const { error } = await supabase
    .from("profiles")
    .update({ name })
    .eq("id", userId)

  if (error) throw error
}

export async function updateNotificationPreference(userId: string, enabled: boolean) {
  const { error } = await supabase
    .from("profiles")
    .update({ notifications_enabled: enabled })
    .eq("id", userId)

  if (error) throw error
}
