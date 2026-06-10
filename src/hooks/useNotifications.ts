import { useState, useEffect, useCallback } from "react"
import { getNotificationsEnabled, setNotificationsEnabled, getRestUntil, getUserName } from "../lib/storage"
import { supabase } from "../lib/supabase"
import { updateNotificationPreference } from "../lib/supabase-users"

export function useNotifications() {
  const [enabled, setEnabledState] = useState(true)

  useEffect(() => {
    getNotificationsEnabled().then(setEnabledState)
  }, [])

  const toggleEnabled = useCallback(async (value: boolean) => {
    await setNotificationsEnabled(value)
    setEnabledState(value)

    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await updateNotificationPreference(user.id, value)
    }
  }, [])

  const canSendNotification = useCallback(async (): Promise<boolean> => {
    if (!enabled) return false

    const restUntil = await getRestUntil()
    if (restUntil) {
      const restDate = new Date(restUntil)
      if (restDate > new Date()) return false
    }

    const hour = new Date().getHours()
    if (hour >= 22 || hour < 8) return false

    return true
  }, [enabled])

  const scheduleNotification = useCallback(async (title: string, body: string) => {
    const canSend = await canSendNotification()
    if (!canSend) return

    try {
      const userName = await getUserName()
      const personalizedBody = userName ? body.replace("[name]", userName) : body

      // Uses expo-notifications if available
      const Notifications = require("expo-notifications")
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body: personalizedBody,
          sound: true,
        },
        trigger: null,
      })
    } catch {
      // Notifications unavailable — fail silently
    }
  }, [canSendNotification])

  return { enabled, toggleEnabled, scheduleNotification, canSendNotification }
}
