import { useState, useEffect, useCallback } from "react"
import { useAuth } from "./useAuth"
import { getInboxMessages, markMessageAsRead, markAllAsRead } from "../services/inbox.service"
import type { InboxMessage } from "../types"

export function useInbox() {
  const { user } = useAuth()
  const [messages, setMessages] = useState<InboxMessage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [unreadCount, setUnreadCount] = useState(0)

  const refresh = useCallback(async () => {
    if (!user) {
      setMessages([])
      setUnreadCount(0)
      setIsLoading(false)
      return
    }
    try {
      const data = await getInboxMessages(user.id)
      setMessages(data)
      setUnreadCount(data.filter((m) => !m.is_read).length)
    } catch {
      setMessages([])
      setUnreadCount(0)
    } finally {
      setIsLoading(false)
    }
  }, [user])

  useEffect(() => {
    refresh()
  }, [refresh])

  const markRead = useCallback(async (messageId: string) => {
    await markMessageAsRead(messageId)
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, is_read: true } : m))
    )
    setUnreadCount((prev) => Math.max(0, prev - 1))
  }, [])

  const markAllRead = useCallback(async () => {
    if (!user) return
    await markAllAsRead(user.id)
    setMessages((prev) => prev.map((m) => ({ ...m, is_read: true })))
    setUnreadCount(0)
  }, [user])

  return {
    messages,
    isLoading,
    unreadCount,
    hasUnread: unreadCount > 0,
    refresh,
    markRead,
    markAllRead,
  }
}
