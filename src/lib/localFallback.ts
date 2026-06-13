import { FallbackStep, FallbackResult } from "../types"

export function generateLocalFallback(task_title: string): FallbackResult {
  return {
    is_multi_phase: false,
    total_estimated_minutes: 15,
    steps: [
      {
        step_order: 1,
        title: "Start with what you have",
        instruction: `Look at what already exists for ${task_title} and note where you left off.`,
        estimated_minutes: 5,
      },
      {
        step_order: 2,
        title: "Do the first obvious thing",
        instruction: "Do the smallest action that moves this forward.",
        estimated_minutes: 5,
      },
      {
        step_order: 3,
        title: "Keep going from there",
        instruction: "Do the next obvious thing from where you are now.",
        estimated_minutes: 5,
      },
    ],
  }
}
