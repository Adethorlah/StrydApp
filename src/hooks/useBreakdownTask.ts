import { useState, useCallback, useRef } from "react"
import { generateLocalFallback, FallbackResult } from "../lib/localFallback"

const EDGE_FUNCTION_URL = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/task-breakdown`

interface BreakdownState {
  status: "idle" | "loading" | "building" | "thinking" | "almost_there" | "done" | "error"
  message: string
  result: FallbackResult | null
}

export function useBreakdownTask() {
  const [state, setState] = useState<BreakdownState>({
    status: "idle",
    message: "",
    result: null,
  })

  const abortRef = useRef(false)

  const breakDown = useCallback(
    async (taskTitle: string, moodScore: number): Promise<FallbackResult> => {
      abortRef.current = false
      const startTime = Date.now()

      setState({ status: "loading", message: "Building your path...", result: null })

      const tryEdgeFunction = async (): Promise<FallbackResult | null> => {
        try {
          const response = await fetch(EDGE_FUNCTION_URL, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({
              task_title: taskTitle,
              mood_score: moodScore,
            }),
          })

          if (!response.ok) return null
          const data = await response.json()
          return data as FallbackResult
        } catch {
          return null
        }
      }

      while (true) {
        const elapsed = Date.now() - startTime

        if (elapsed >= 25000 || abortRef.current) {
          break
        }

        if (elapsed < 10000) {
          const result = await tryEdgeFunction()
          if (result) {
            setState({ status: "done", message: "", result })
            return result
          }
          // Wait before checking again
          await new Promise((r) => setTimeout(r, 2000))
          continue
        }

        if (elapsed < 10000) {
          setState({ status: "building", message: "Building your path...", result: null })
        } else if (elapsed < 10000) {
          // First 10s: keep trying
          const result = await tryEdgeFunction()
          if (result) {
            setState({ status: "done", message: "", result })
            return result
          }
          await new Promise((r) => setTimeout(r, 1000))
        } else if (elapsed < 20000) {
          setState({ status: "thinking", message: "Still thinking... your goal is a good one.", result: null })
          // retry 1 at 10s
          if (elapsed >= 10000 && elapsed < 11000) {
            const result = await tryEdgeFunction()
            if (result) {
              setState({ status: "done", message: "", result })
              return result
            }
          }
          await new Promise((r) => setTimeout(r, 1000))
        } else if (elapsed < 25000) {
          setState({ status: "almost_there", message: "Almost there...", result: null })
          // retry 2 at 20s
          if (elapsed >= 20000 && elapsed < 21000) {
            const result = await tryEdgeFunction()
            if (result) {
              setState({ status: "done", message: "", result })
              return result
            }
          }
          await new Promise((r) => setTimeout(r, 1000))
        }
      }

      const fallback = generateLocalFallback(taskTitle)
      setState({ status: "done", message: "", result: fallback })
      return fallback
    },
    []
  )

  const reset = useCallback(() => {
    abortRef.current = true
    setState({ status: "idle", message: "", result: null })
  }, [])

  return { state, breakDown, reset }
}
