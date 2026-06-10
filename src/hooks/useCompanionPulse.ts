import { useState, useEffect, useRef, useCallback } from "react"

export function useCompanionPulse(estimatedMinutes: number | null) {
  const [shouldPulse, setShouldPulse] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
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

    timerRef.current = setInterval(checkPulse, 10000)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
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
