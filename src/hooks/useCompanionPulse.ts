import { AppState } from "react-native"
import { useState, useEffect, useRef, useCallback } from "react"

export function useCompanionPulse(estimatedMinutes: number | null) {
  const [shouldPulse, setShouldPulse] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef<number | null>(null)

  useEffect(() => {
    if (estimatedMinutes === null || estimatedMinutes === undefined) {
      setShouldPulse(false)
      return
    }

    const thresholdMs = estimatedMinutes * 60 * 1000 * 2
    startTimeRef.current = Date.now()

    const checkPulse = () => {
      const elapsed = Date.now() - (startTimeRef.current ?? Date.now())
      if (elapsed >= thresholdMs) {
        setShouldPulse(true)
      }
    }

    const startInterval = () => {
      timerRef.current = setInterval(checkPulse, 10000)
    }

    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") startInterval()
      else if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    })

    startInterval()

    return () => {
      subscription.remove()
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [estimatedMinutes])

  const pulseOnce = useCallback(() => {
    setShouldPulse(true)
    setTimeout(() => setShouldPulse(false), 3000)
  }, [])

  const clearPulse = useCallback(() => {
    setShouldPulse(false)
    if (timerRef.current) clearInterval(timerRef.current)
  }, [])

  return { shouldPulse, pulseOnce, clearPulse }
}
