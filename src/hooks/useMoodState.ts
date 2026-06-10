import { useState, useEffect, useCallback } from "react"
import { getSessionMood, setSessionMood } from "../lib/storage"

export function useMoodState() {
  const [mood, setMoodState] = useState<number | null>(null)

  useEffect(() => {
    getSessionMood().then(setMoodState)
  }, [])

  const setMood = useCallback(async (value: number) => {
    await setSessionMood(value)
    setMoodState(value)
  }, [])

  return { mood, setMood }
}
