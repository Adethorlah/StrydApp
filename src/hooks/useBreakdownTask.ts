import { useState, useCallback, useRef } from "react"
import { generateLocalFallback } from "../lib/localFallback"
import { FallbackResult } from "../types"
import { callTaskBreakdown } from "../lib/supabase-tasks"

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
    async (taskTitle: string, moodScore: number, availableMinutes: number): Promise<FallbackResult> => {
      abortRef.current = false
      setState({ status: "loading", message: "Building your path...", result: null })

      // First attempt
      try {
        setState({ status: "building", message: "Building your path...", result: null })
        const data = await callTaskBreakdown(taskTitle, moodScore, availableMinutes)
        console.log("Breakdown response:", JSON.stringify(data))
        if (data) {
          setState({ status: "done", message: "", result: data })
          return data
        }
      } catch (e) {
        console.log("Breakdown error:", e)
      }

      if (abortRef.current) {
        const fallback = generateLocalFallback(taskTitle)
        setState({ status: "done", message: "", result: fallback })
        return fallback
      }

      // Wait 3 seconds then retry
      setState({ status: "thinking", message: "Still thinking... your goal is a good one.", result: null })
      await new Promise((r) => setTimeout(r, 3000))

      try {
        const data = await callTaskBreakdown(taskTitle, moodScore, availableMinutes)
        console.log("Breakdown retry 2 response:", JSON.stringify(data))
        if (data) {
          setState({ status: "done", message: "", result: data })
          return data
        }
      } catch (e) {
        console.log("Breakdown retry 2 error:", e)
      }

      if (abortRef.current) {
        const fallback = generateLocalFallback(taskTitle)
        setState({ status: "done", message: "", result: fallback })
        return fallback
      }

      // Wait 3 more seconds then final attempt
      setState({ status: "almost_there", message: "Almost there...", result: null })
      await new Promise((r) => setTimeout(r, 3000))

      try {
        const data = await callTaskBreakdown(taskTitle, moodScore, availableMinutes)
        console.log("Breakdown retry 3 response:", JSON.stringify(data))
        if (data) {
          setState({ status: "done", message: "", result: data })
          return data
        }
      } catch (e) {
        console.log("Breakdown retry 3 error:", e)
      }

      // All attempts failed — use local fallback
      console.log("All attempts failed, using local fallback")
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