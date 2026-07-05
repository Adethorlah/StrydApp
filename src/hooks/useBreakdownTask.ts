import { useState, useEffect, useCallback, useRef } from "react"
import { useMutation } from "@tanstack/react-query"
import { callTaskBreakdown } from "../services/tasks.service"
import { SafeBreakdownResponse } from "../types"

interface BreakdownState {
  status: "idle" | "loading" | "building" | "thinking" | "almost_there" | "done" | "error"
  message: string
  result: SafeBreakdownResponse | null
}

function validateBreakdownResponse(data: unknown): data is SafeBreakdownResponse {
  if (!data || typeof data !== "object") return false
  const d = data as Record<string, unknown>

  const hasValidSteps = (steps: unknown) =>
    Array.isArray(steps) && steps.length > 0 &&
    steps.every((s: unknown) => {
      const step = s as Record<string, unknown>
      return typeof step?.title === "string" && typeof step?.instruction === "string" && typeof step?.estimated_minutes === "number"
    })

  if (d.is_multi_phase && Array.isArray(d.phases)) {
    return d.phases.length > 0 && d.phases.every((p: unknown) => hasValidSteps((p as Record<string, unknown>).steps))
  }
  return hasValidSteps(d.steps)
}

export function useBreakdownTask() {
  const [state, setState] = useState<BreakdownState>({ status: "idle", message: "", result: null })
  const abortRef = useRef(false)

  const mutation = useMutation({
    mutationFn: async (args: { taskTitle: string, moodScore: number, availableMinutes: number, taskDescription?: string }) => {
      const data = await callTaskBreakdown(args.taskTitle, args.moodScore, args.availableMinutes, args.taskDescription)
      if (!validateBreakdownResponse(data)) throw new Error("Invalid response format")
      return data
    },
    retry: 2,
    retryDelay: 3000,
  })

  useEffect(() => {
    if (!mutation.isPending) return
    setState({ status: "building", message: "Building your path...", result: null })
    const t1 = setTimeout(() => !abortRef.current && setState(s => ({ ...s, status: "thinking", message: "Still thinking... your goal is a good one." })), 10000)
    const t2 = setTimeout(() => !abortRef.current && setState(s => ({ ...s, status: "almost_there", message: "Almost there..." })), 20000)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [mutation.isPending])

  const breakDown = useCallback(async (taskTitle: string, moodScore: number, availableMinutes: number, taskDescription?: string) => {
    abortRef.current = false
    try {
      const data = await mutation.mutateAsync({ taskTitle, moodScore, availableMinutes, taskDescription })
      setState({ status: "done", message: "", result: data })
      return data
    } catch {
      const errorMsg = "Could not break down your goal. Please check your connection and try again."
      setState({ status: "error", message: errorMsg, result: null })
      throw new Error(errorMsg)
    }
  }, [mutation])

  const reset = useCallback(() => {
    abortRef.current = true
    mutation.reset()
    setState({ status: "idle", message: "", result: null })
  }, [mutation])

  return { state, breakDown, reset }
}
