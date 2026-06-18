import { useState, useCallback, useRef } from "react"
import { callTaskBreakdown } from "../lib/supabase-tasks"

interface BreakdownState {
  status: "idle" | "loading" | "building" | "thinking" | "almost_there" | "done" | "error"
  message: string
  result: any | null
}

function validateBreakdownResponse(data: any): boolean {
  if (!data || typeof data !== "object") return false

  const hasValidSteps = (steps: any[]) =>
    Array.isArray(steps) &&
    steps.length > 0 &&
    steps.every(
      (s) =>
        typeof s?.title === "string" &&
        typeof s?.instruction === "string" &&
        typeof s?.estimated_minutes === "number"
    )

  if (data.is_multi_phase && Array.isArray(data.phases)) {
    return data.phases.length > 0 && data.phases.every((p: any) => hasValidSteps(p.steps))
  }

  return hasValidSteps(data.steps)
}

export function useBreakdownTask() {
  const [state, setState] = useState<BreakdownState>({
    status: "idle",
    message: "",
    result: null,
  })

  const abortRef = useRef(false)

  const breakDown = useCallback(
    async (taskTitle: string, moodScore: number, availableMinutes: number): Promise<any> => {
      abortRef.current = false
      setState({ status: "loading", message: "Building your path...", result: null })

      // Attempt 1
      try {
        setState({ status: "building", message: "Building your path...", result: null })
        const data = await callTaskBreakdown(taskTitle, moodScore, availableMinutes)

        if (data && validateBreakdownResponse(data)) {
          setState({ status: "done", message: "", result: data })
          return data
        }
      } catch (e) {
        console.log("Breakdown error:", e)
      }

      if (abortRef.current) throw new Error("Task creation cancelled")

      // Attempt 2 (after 3s wait)
      setState({ status: "thinking", message: "Still thinking... your goal is a good one.", result: null })
      await new Promise((r) => setTimeout(r, 3000))

      try {
        const data = await callTaskBreakdown(taskTitle, moodScore, availableMinutes)

        if (data && validateBreakdownResponse(data)) {
          setState({ status: "done", message: "", result: data })
          return data
        }
      } catch (e) {
        console.log("Breakdown retry 2 error:", e)
      }

      if (abortRef.current) throw new Error("Task creation cancelled")

      // Attempt 3 (after 3s wait)
      setState({ status: "almost_there", message: "Almost there...", result: null })
      await new Promise((r) => setTimeout(r, 3000))

      try {
        const data = await callTaskBreakdown(taskTitle, moodScore, availableMinutes)

        if (data && validateBreakdownResponse(data)) {
          setState({ status: "done", message: "", result: data })
          return data
        }
      } catch (e) {
        console.log("Breakdown retry 3 error:", e)
      }

      // All attempts failed
      const errorMsg = "Could not break down your goal. Please check your connection and try again."
      setState({ status: "error", message: errorMsg, result: null })
      throw new Error(errorMsg)
    },
    []
  )

  const reset = useCallback(() => {
    abortRef.current = true
    setState({ status: "idle", message: "", result: null })
  }, [])

  return { state, breakDown, reset }
}
