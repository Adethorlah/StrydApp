export type TaskStatus = "active" | "paused" | "completed" | "archived"

export interface Step {
    step_order: number
    title: string
    instruction: string
    estimated_minutes: number
    phase?: number
    is_completed?: boolean
    is_active?: boolean
    id?: string
    parent_step_id?: string | null
    sub_steps?: Step[]
}

export interface Task {
    id?: string
    title: string
    description?: string
    steps: Step[]
    is_multi_phase?: boolean
    phases?: { phase_order: number; phase_label: string; steps: Step[] }[]
    created_at?: string
    is_completed?: boolean
    status?: TaskStatus
    paused_at?: string | null
    completedStepIds?: string[]
}

export type PauseReason =
  | "need_urgent"
  | "feeling_stuck"
  | "priorities_changed"
  | "completed_other_way"
  | "no_longer_matters"
  | "other"

export interface FeedbackEntry {
  id?: string
  user_id?: string
  task_id?: string
  reason: PauseReason
  feedback_text?: string
  created_at?: string
}

export interface SafeBreakdownResponse {
    is_multi_phase: boolean
    total_estimated_minutes: number
    phases?: { phase_order: number; phase_label: string; steps: Step[] }[]
    steps?: Step[]
}

export type RecencyLevel = "fresh" | "returning" | "cold"

export interface CompanionContext {
    userName: string
    currentTask?: string
    currentStepTitle?: string
    currentStepInstruction?: string
    moodScore?: number
    completedSteps: number
    totalSteps: number
    recency?: RecencyLevel
}

export interface InboxMessage {
    id: string
    user_id: string
    title: string
    content: string
    category: "insight" | "re_entry" | "milestone"
    is_read: boolean
    created_at: string
}

export interface IconProps {
    size?: number
    color?: string
}