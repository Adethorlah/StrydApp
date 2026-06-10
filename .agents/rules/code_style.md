---
trigger: always_on
---

# STRYD — Code Style Guide
Version 3.2 · June 2026 · Confidential

This document defines the strict engineering standards for STRYD 3.2.
The goal is to maintain a predictable, completely decoupled, mobile-first 
codebase that reduces psychological friction for the user and development 
friction for the engineer.

---

## 1. Core Philosophy

STRYD code must be:
- **Readable** before it is clever.
- **Predictable** before it is optimized.
- **Stable** before it is scalable.

> **Clarity of intent over density of logic.** The application must feel 
> mathematically consistent to the developer and effortlessly supportive 
> to the user.

---

## 2. Language & Type Safety

- **TypeScript Explicitly Everywhere:** Active across both the Expo Mobile 
  Client and serverless Supabase Edge Functions.
- **The Anti-`any` Directive:** The use of `any` or `unknown` (without an 
  immediate type guard) is strictly blocked. Every object must map to a 
  deterministic contract.
- **Unified Types Strategy:**
  - Shared entity types (database tables, API payloads) live in `src/types/` 
    on the client and are mirrored to `supabase/functions/_shared/types.ts` 
    on the server.
  - Every function requires explicit input and output signatures.
  - No implicit returns allowed anywhere.

---

## 3. Separation of Layers

Separation of concerns is strict, absolute, and lint-enforced.

| Layer | Location | Responsibility |
|---|---|---|
| **Screens** | `app/` | Presentational view controllers. Reflects hook state. Zero business logic. |
| **Components** | `src/components/` | Pure UI elements. Props in, JSX out. |
| **Hooks** | `src/hooks/` | Local state, session timers, TanStack Query wrappers. |
| **Services** | `src/services/` | Supabase client calls only. Pure data mapping. |
| **Edge Functions** | `supabase/functions/` | All AI calls, all agent logic, all orchestration. |
| **Types** | `src/types/` | Global type declarations and database schemas. |
| **Theme** | `src/theme/` | HSL design tokens only. No logic. |

### The Absolute Hard Rule:
> The mobile client is strictly prohibited from running prompt strings, 
> talking directly to Deepseek, or parsing raw AI completions.
> All generative processes must happen inside Supabase Edge Functions.

---

## 4. Function Design Standards

- **Single Responsibility:** A function does exactly one atomic operation.
- **Action-Oriented Naming:** `breakTaskIntoSteps`, `calculateMomentum`, 
  `reconstructSessionContext`, `runToneSafety`.
- **Purity:** Side effects are forbidden unless explicitly documented via 
  a comment header above the function.
- **Line Budget:** Functions must never exceed 40 lines. If exceeded, 
  decompose into smaller utilities.
- **Nesting Limit:** Maximum 3 levels of nested logic.

---

## 5. Agent Orchestration (Supabase Edge Functions)

Edge Functions are serverless orchestration pipelines. They accept typed 
requests, invoke Deepseek safely via environment-secured API keys, process 
responses through safety middleware, and return clean structured payloads.

### The Agent Execution Pattern:
```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { runToneSafety } from "../_shared/toneSafety.ts"
import { AgentInput, SafeBreakdownResponse } from "../_shared/types.ts"

serve(async (req) => {
  try {
    // 1. Parse and strictly cast inbound payload
    const input: AgentInput = await req.json()

    // 2. Fail early — reject missing required fields before any AI call
    if (!input.task_title || !input.mood_score || !input.available_minutes) {
      return new Response(
        JSON.stringify({ error: "Missing required fields." }),
        { status: 400 }
      )
    }

    // 3. Build fully typed, task-specific prompt
    const prompt = buildBreakdownPrompt(input)

    // 4. Call Deepseek
    const rawAIOutput = await callDeepseekEngine(prompt, input.mood_score)

    // 5. Validate structure maps to required contract
    const validatedJSON = JSON.parse(rawAIOutput) as SafeBreakdownResponse

    // 6. Mandatory tone safety pass — scrub all step text
    validatedJSON.steps = validatedJSON.steps.map(step => ({
      ...step,
      instruction: runToneSafety(step.instruction)
    }))

    // 7. Return clean payload to mobile client
    return new Response(JSON.stringify(validatedJSON), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    })

  } catch (error) {
    // 8. Deterministic fallback — never expose raw errors to the client
    return new Response(
      JSON.stringify(generateSafeFallbackSteps()),
      { status: 200 }
    )
  }
})
```

---

## 6. Prompt Engineering Standards

Prompts are code. They follow the same standards as functions.

### Rules:
- Every prompt lives in its own file: `buildBreakdownPrompt.ts`, 
  `buildRecoveryPrompt.ts`
- Prompts use typed template injection — no raw string concatenation
- All dynamic values must be validated before injection
- Prompts must specify JSON output format in the system message
- Temperature must be set explicitly per agent (see architecture doc 4.3)

### The Task Breakdown Bug Rule:
> `task_title`, `task_description`, `mood_score`, and `available_minutes` 
> MUST be injected into every breakdown prompt.
> A prompt missing any of these fields must throw before the Deepseek 
> call is made.
> Generic outputs are a system failure, not an acceptable result.

### Correct pattern:
```typescript
// buildBreakdownPrompt.ts

interface BreakdownPromptInput {
  task_title: string
  task_description: string
  mood_score: number          // 1–5
  available_minutes: number
}

export function buildBreakdownPrompt(input: BreakdownPromptInput): string {
  if (!input.task_title) throw new Error('task_title is required')
  if (!input.mood_score) throw new Error('mood_score is required')
  if (!input.available_minutes) throw new Error('available_minutes is required')

  const max_step_minutes = input.mood_score <= 2 ? 3 : 
                           input.mood_score <= 3 ? 7 : 10

  return `
You are STRYD, a calm focus assistant. Your only job is to break down 
the EXACT task the user submits into 3–7 specific, concrete micro-steps.

RULES:
1. Every step must be SPECIFIC to this exact task: "${input.task_title}"
2. Every step must be completable in under ${max_step_minutes} minutes
3. Steps must be ordered — each one leads directly to the next
4. Use simple, direct language. No motivational language. No exclamation marks.
5. Never generate steps that could apply to any other task
6. If the task is vague, ask one clarifying question instead of guessing

MOOD CONTEXT:
The user's resistance level is ${input.mood_score}/5.
- Score 1–2: First step must be trivially easy (2–3 minutes max)
- Score 3: Standard step sizing (5–7 minutes)
- Score 4–5: Steps can be up to 10 minutes

TIME CONTEXT:
User has ${input.available_minutes} minutes right now.
Total estimated minutes across all steps must not exceed this.

TASK DETAILS:
Title: ${input.task_title}
Description: ${input.task_description || 'none provided'}

OUTPUT FORMAT — strict JSON only. No markdown. No preamble:
{
  "steps": [
    {
      "step_order": 1,
      "title": "Short action label",
      "instruction": "One clear sentence describing exactly what to do",
      "estimated_minutes": 5
    }
  ],
  "total_estimated_minutes": 20,
  "phase_label": "Getting started"
}
  `.trim()
}
```

### Wrong pattern (root cause of generic breakdown bug):
```typescript
// NEVER DO THIS
const prompt = `Break this task into steps: ${task}`   // too vague
const prompt = `Give me productivity steps`            // no task context
const prompt = hardcodedTemplate                       // never hardcode
const prompt = buildPrompt()                           // missing task input
```

---

## 7. Deepseek API Call Standards

All Deepseek calls use a single shared wrapper in 
`supabase/functions/_shared/deepseek.ts`. Never inline API calls.

```typescript
// supabase/functions/_shared/deepseek.ts

interface DeepseekOptions {
  model: 'deepseek-chat' | 'deepseek-reasoner'
  temperature: number
  max_tokens: number
  force_json?: boolean
}

export async function callDeepseekEngine(
  systemPrompt: string,
  userMessage: string,
  options: DeepseekOptions
): Promise<string> {
  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('DEEPSEEK_API_KEY')}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: options.model,
      temperature: options.temperature,
      max_tokens: options.max_tokens,
      response_format: options.force_json 
        ? { type: 'json_object' } 
        : undefined,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ]
    })
  })

  if (!response.ok) throw new Error(`Deepseek error: ${response.status}`)
  const data = await response.json()
  return data.choices[0].message.content
}
```

### Agent settings reference:

| Agent | Model | Temperature | max_tokens | force_json |
|---|---|---|---|---|
| Task Breakdown | deepseek-chat | 0.3 | 800 | true |
| Tone Safety | deepseek-chat | 0.0 | 400 | true |
| Start Friction | deepseek-reasoner | default | 400 | false |
| Adaptive Sizer | deepseek-chat | 0.4 | 600 | true |
| Escape & Recovery | deepseek-reasoner | default | 600 | false |
| Momentum Tracking | deepseek-chat | 0.2 | 300 | true |
| Reflection | deepseek-chat | 0.5 | 400 | false |

---

## 8. Mobile Client Data Rules

- UI state lives in React hooks only
- Server state is managed exclusively by TanStack Query
- No manual fetch calls inside screens or components
- Supabase calls only happen inside `src/services/` files
- Optimistic updates are used for all step completions

### Correct pattern:
```typescript
// src/services/tasks.service.ts
export async function completeStep(stepId: string): Promise<void> {
  const { error } = await supabase
    .from('micro_steps')
    .update({ is_completed: true })
    .eq('id', stepId)
  if (error) throw error
}

// src/hooks/useCompleteStep.ts
export function useCompleteStep() {
  return useMutation({
    mutationFn: completeStep,
    onMutate: async (stepId) => {
      // Optimistic update — UI reflects completion instantly
      await queryClient.cancelQueries({ queryKey: ['steps'] })
      queryClient.setQueryData(['steps'], (old: Step[]) =>
        old.map(s => s.id === stepId ? { ...s, is_completed: true } : s)
      )
    }
  })
}
```

---

## 9. Naming Conventions

| Type | Convention | Example |
|---|---|---|
| Edge Function folders | kebab-case | `task-breakdown/` |
| Prompt builder files | camelCase | `buildBreakdownPrompt.ts` |
| Service files | camelCase + `.service.ts` | `tasks.service.ts` |
| Hook files | camelCase + `use` prefix | `useActiveSession.ts` |
| Component files | PascalCase | `MicroStepCard.tsx` |
| Screen files | camelCase | `breakdown.tsx` |
| Type interfaces | PascalCase | `BreakdownRequest` |
| Constants | SCREAMING_SNAKE_CASE | `MAX_STEP_MINUTES` |
| Shared utilities | camelCase + `_shared/` | `_shared/toneSafety.ts` |

---

## 10. Error Handling

| Layer | Rule |
|---|---|
| Screens | Fail silently — show fallback UI, never raw errors |
| Hooks | Catch and surface user-friendly error states |
| Services | Throw typed errors — never swallow silently |
| Edge Functions | Log centrally, always return fallback data at status 200 |
| Deepseek calls | Always catch — return deterministic fallback on failure |

### The fallback rule:
> A Deepseek failure must never crash the app or block the user.
> Edge Functions always return status 200 with fallback steps.
> The user never knows the AI failed.

```typescript
// generateSafeFallbackSteps.ts
export function generateSafeFallbackSteps(task_title: string): SafeBreakdownResponse {
  return {
    steps: [
      { step_order: 1, title: "Open the task", 
        instruction: `Open whatever you need to work on ${task_title}`, 
        estimated_minutes: 2 },
      { step_order: 2, title: "Do the first thing", 
        instruction: "Do the smallest possible first action you can think of", 
        estimated_minutes: 5 },
      { step_order: 3, title: "Keep going", 
        instruction: "Do the next obvious thing from where you are", 
        estimated_minutes: 5 }
    ],
    total_estimated_minutes: 12,
    phase_label: "Getting started"
  }
}
```

---

## 11. Tone Safety Enforcement

The Tone Safety agent runs as middleware on ALL AI outputs.
It is not optional. It is not skippable under any condition.

```typescript
// supabase/functions/_shared/toneSafety.ts

const BLOCKED_PATTERNS: RegExp[] = [
  /!/g,                         // exclamation marks
  /\b(must|should)\b/gi,        // pressure language
  /\b(failure|failed)\b/gi,     // shame language
  /\b(lazy|procrastinat)\b/gi,  // judgment language
  /[A-Z]{3,}/g,                 // ALL CAPS words
  /\b(behind|overdue)\b/gi,     // urgency language
  /\b(productive|productivity)\b/gi, // pressure framing
]

export function runToneSafety(text: string): string {
  let safe = text
  BLOCKED_PATTERNS.forEach(pattern => {
    safe = safe.replace(pattern, '')
  })
  return safe.trim()
}

export function validateToneSafety(text: string): boolean {
  return BLOCKED_PATTERNS.every(pattern => !pattern.test(text))
}
```

---

## 12. Performance Rules

- Lazy-load all inactive Expo Router screens
- TanStack Query handles all caching — no manual cache logic
- All AI calls are async and non-blocking
- Step completions use optimistic updates — no spinner for local actions
- Edge Function response targets:
  - AI calls: under 3 seconds
  - Database-only calls: under 500ms
  - Recovery messages: under 1 second

---

## 13. Non-Negotiable Rules

1. No AI calls in the mobile client — Edge Functions only
2. No business logic in screens or components
3. Task breakdown prompts must always inject task-specific context
4. `task_title`, `mood_score`, and `available_minutes` are required 
   fields — reject any breakdown request missing them
5. Tone Safety runs on every AI output without exception
6. Deepseek failures always return fallback steps at status 200
7. Functions never exceed 40 lines
8. No `any` types without an immediate type guard

> If code complexity increases user confusion — refactor immediately.
> If an output could apply to any task — it is wrong.
