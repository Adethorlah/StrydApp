import { AppState } from "react-native"
import { useState, useEffect, useRef, useCallback } from "react"

export function useCompanionPulse(estimatedMinutes: number | null) {
  const [shouldPulse, setShouldPulse] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const sessionStartRef = useRef<number | null>(null)
  const accumulatedRef = useRef(0)
  const thresholdRef = useRef(0)

  useEffect(() => {
    if (estimatedMinutes === null || estimatedMinutes === undefined) {
      setShouldPulse(false)
      return
    }

    thresholdRef.current = estimatedMinutes * 60 * 1000 * 2
    accumulatedRef.current = 0
    sessionStartRef.current = Date.now()

    const checkPulse = () => {
      const elapsed = accumulatedRef.current + (Date.now() - (sessionStartRef.current ?? Date.now()))
      if (elapsed >= thresholdRef.current) {
        setShouldPulse(true)
      }
    }

    const startInterval = () => {
      sessionStartRef.current = Date.now()
      timerRef.current = setInterval(checkPulse, 10000)
    }

    const stopInterval = () => {
      if (sessionStartRef.current) {
        accumulatedRef.current += Date.now() - sessionStartRef.current
      }
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }

    startInterval()

    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        startInterval()
      } else {
        stopInterval()
      }
    })

    return () => {
      subscription.remove()
      stopInterval()
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
