export interface BreakdownStep {
  step_order: number
  title: string
  instruction: string
  estimated_minutes: number
}

export interface BreakdownPhase {
  phase_order: number
  phase_label: string
  steps: BreakdownStep[]
}

export interface SafeBreakdownResponse {
  is_multi_phase: boolean
  total_estimated_minutes: number
  phases?: BreakdownPhase[]
  steps?: BreakdownStep[]
}

export interface AgentInput {
  task_title: string
  task_description?: string
  mood_score: number
  available_minutes?: number
}
