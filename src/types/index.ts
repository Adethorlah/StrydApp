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

export interface CompanionContext {
    userName: string
    currentTask?: string
    currentStepTitle?: string
    currentStepInstruction?: string
    moodScore?: number
    completedSteps: number
    totalSteps: number
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