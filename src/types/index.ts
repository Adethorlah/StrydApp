export interface Step {
    step_order: number
    title: string
    instruction: string
    estimated_minutes: number
    phase?: number
    is_completed?: boolean
    is_active?: boolean
    id?: string
}

export interface Task {
    id?: string
    title: string
    steps: Step[]
    is_multi_phase?: boolean
    phases?: { phase_order: number; phase_label: string }[]
    created_at?: string
    is_completed?: boolean
}

export interface FallbackStep {
    step_order: number
    title: string
    instruction: string
    estimated_minutes: number
}

export interface FallbackResult {
    is_multi_phase: false
    total_estimated_minutes: number
    steps: FallbackStep[]
}

export interface CompanionContext {
    userName: string
    currentTask?: string
    currentStepTitle?: string
    currentStepInstruction?: string
    moodScore?: number
    completedSteps: number
    totalSteps: number
}

export interface IconProps {
    size?: number
    color?: string
}