# Skill: `break_task_into_steps`

## Description

Converts a user's task into a structured sequence of small, clear, and immediately actionable micro-steps, independent of the user's domain or professional specialization. The goal is to reduce cognitive load and help the user begin quickly without needing to plan. This skill defines structure and constraints — it does not rely on AI to decide rules.

**Authorized Agents:**
- Task Breakdown Agent
- Adaptive Breakdown Agent

---

## 1. System Placement & Orchestration Boundary

- **Architectural Implementation:** Deployed as an autonomous serverless Edge Function at `supabase/functions/task-breakdown/index.ts`.
- **Core LLM Engine:** `deepseek-chat` (Deepseek-V3) with low temperature (0.2).
- **Security & Tenancy:** Access requires a valid bearer user token mapping directly to `auth.uid()`.

---

## 2. Core Operational & Structural Rules

1. **Dynamic Step Range Limits:**
   - If `time_preference_minutes` < 30: Range capped at **3 to 4 steps**.
   - If `time_preference_minutes` >= 60: Range expanded to **6 to 7 steps**.
   - Default / Unspecified: Target **5 steps**.
2. **Atomic Execution Actions:** Every step must represent exactly one physical or digital action starting with an active verb (`Open`, `Write`, `Find`, `Create`, `Read`, `Review`).
3. **Forbidden Cognitive Verbs:** `consider`, `reflect`, `explore`, `think`, `understand`, `plan`, `analyze`.
4. **Instruction Constraints:** Maximum 10 words, sentence case, **no trailing punctuation** (`.`, `!`, `?`), zero conjunctions (`and`, `then`).
5. **Hint Restrictions:** Max 12 words. Must not introduce secondary action steps.
6. **Clarification Constraints:** Max 15 words, exactly one sentence, no punctuation except a final question mark.

---

## 3. Input/Output Data Contracts

### 3.1 Inbound Request Payload

```json
{
  "task_title": "string (required)",
  "task_description": "string (optional)",
  "time_preference_minutes": "integer (optional)"
}
```

### 3.2 Outbound Unified Response Schema

```json
{
  "data": {
    "is_clarification_required": "boolean",
    "clarification_question": "string (nullable)",
    "micro_steps": [
      {
        "step_order": "integer (1-based sequential index)",
        "title": "string (short action label)",
        "instruction": "string (max 10 words, no punctuation)",
        "hint": "string (nullable, short supportive guidance)",
        "estimated_minutes": "integer (2-10 inclusive)"
      }
    ]
  },
  "metadata": {
    "timestamp": "2026-06-09T20:49:00Z",
    "execution_ms": 1450
  },
  "error": null
}
```

---

## 4. Engineering Prompt Module

```typescript
// supabase/functions/task-breakdown/buildBreakdownPrompt.ts
import { BreakdownInput } from "../_shared/types.ts"

export function buildBreakdownPrompt(input: BreakdownInput): { systemPrompt: string; userPrompt: string } {
  let targetStepRule = "Generate exactly 5 highly actionable micro-steps."
  if (input.time_preference_minutes && input.time_preference_minutes < 30) {
    targetStepRule = "Generate between 3 and 4 highly actionable micro-steps total due to limited time constraints."
  } else if (input.time_preference_minutes && input.time_preference_minutes >= 60) {
    targetStepRule = "Generate between 6 and 7 highly actionable micro-steps total to leverage the extended time allotment."
  }

  const systemPrompt = `
You are the STRYD 3.2 Universal Task Breakdown Engine. Your task is to split a macro objective into an actionable sequence of atomic micro-steps, regardless of the field or area of specialization.

CRITICAL STRUCTURAL RULES:
1. Target Step Constraint: ${targetStepRule}
2. Every step must map to the 'instruction' field. Max 10 words, sentence case, NO trailing punctuation, NO conjunctions (and, then).
3. Every step 'instruction' must begin with a clear verb: Open, Write, Find, Create, Read, Review.
4. Forbidden Cognitive Verbs: consider, reflect, explore, think, understand, plan, analyze.
5. Hints are optional, short (max 12 words), and must NOT introduce any secondary action verbs or tools.
6. Step duration must be an integer between 2 and 10 minutes inclusive.
7. Step orders must begin at 1 and increment sequentially by 1 without gaps or duplicates.

CLARIFICATION CRITERIA:
If the objective is completely vague (e.g., "Work", "Study", "Stuff") and an actionable digital or physical outcome cannot be inferred, set "is_clarification_required" to true, return an empty "micro_steps" array, and write a gentle, short clarification question (MAX 15 words, single sentence).

You must return a raw JSON object matching this exact shape:
{
  "is_clarification_required": false,
  "clarification_question": null,
  "micro_steps": [
    { "step_order": 1, "title": "Open document", "instruction": "Open a new document", "hint": "Use Word or Google Docs", "estimated_minutes": 2 }
  ]
}
`.trim()

  const userPrompt = `
Task Title: "${input.task_title}"
Task Description: "${input.task_description || 'None provided'}"
Time Preference Minutes: ${input.time_preference_minutes || 'None specified'}
`.trim()

  return { systemPrompt, userPrompt }
}
```

---

## 5. Production Gateway Implementation

```typescript
// supabase/functions/task-breakdown/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { runToneSafety } from "../_shared/toneSafety.ts"
import { callDeepseekEngine } from "../_shared/deepseekClient.ts"
import { BreakdownInput } from "../_shared/types.ts"
import { buildBreakdownPrompt } from "./buildBreakdownPrompt.ts"

const ALLOWED_ORIGINS = ["http://localhost:8081", "https://stryd.app"]
const VAGUE_KEYWORDS = ["work", "study", "practice", "stuff", "things", "task", "project"]
const DISALLOWED_VERBS = ["consider", "reflect", "explore", "think", "understand", "plan", "analyze"]

serve(async (req: Request) => {
  const origin = req.headers.get("origin") || ""
  const isAllowedOrigin = ALLOWED_ORIGINS.includes(origin) || origin.startsWith("exp://")

  const corsHeaders = {
    "Access-Control-Allow-Origin": isAllowedOrigin ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  }

  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })

  const timestampStart = Date.now()

  try {
    const payload: BreakdownInput = await req.json()

    if (!payload || !payload.task_title) {
      return new Response(
        JSON.stringify({
          data: null,
          error: { message: "Task title is required.", code: "VALIDATION_ERROR" }
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const trimmedTitle = payload.task_title.trim().toLowerCase()
    const words = trimmedTitle.split(/\s+/).filter(Boolean)

    // Deep keyword token evaluation — catches multi-word combinations
    const containsVagueToken = words.some(word => VAGUE_KEYWORDS.includes(word))

    if (words.length < 2 || (words.length <= 3 && containsVagueToken)) {
      return new Response(
        JSON.stringify({
          data: {
            is_clarification_required: true,
            clarification_question: "What specific action or objective would you like to focus on right now?",
            micro_steps: []
          },
          metadata: {
            timestamp: new Date().toISOString(),
            execution_ms: Date.now() - timestampStart
          },
          error: null
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const { systemPrompt, userPrompt } = buildBreakdownPrompt(payload)

    const rawAiResponse = await callDeepseekEngine(systemPrompt, userPrompt, {
      model: "deepseek-chat",
      temperature: 0.2,
      max_tokens: 800,
      force_json: true
    })

    const parsedResult = JSON.parse(rawAiResponse)

    if (parsedResult.is_clarification_required === false) {
      const steps = parsedResult.micro_steps
      if (!Array.isArray(steps) || steps.length < 3 || steps.length > 7) {
        throw new Error("Generated steps count breached deterministic bounds.")
      }

      let expectedOrder = 1
      for (const step of steps) {
        if (step.step_order !== expectedOrder) {
          throw new Error("Step sequencing tracking orders are fractured.")
        }
        if (!step.title) {
          step.title = step.instruction.split(/\s+/).slice(0, 4).join(" ")
        }
        if (step.estimated_minutes < 2 || step.estimated_minutes > 10) {
          throw new Error("Step duration bounds constraint violation caught.")
        }

        step.instruction = runToneSafety(
          step.instruction.trim().replace(/[.!?]+$/, "")
        )

        if (step.hint) {
          step.hint = runToneSafety(step.hint.trim())
          const hintWords = step.hint.toLowerCase().split(/\s+/)
          const containsForbiddenAction = DISALLOWED_VERBS.some(v => hintWords.includes(v))
          if (containsForbiddenAction) {
            step.hint = null
          }
        }
        expectedOrder++
      }
    } else {
      const cleanQuestion = parsedResult.clarification_question.trim()
      const questionWords = cleanQuestion.split(/\s+/).length

      parsedResult.clarification_question = questionWords > 15
        ? "Could you clarify the next small action you intend to take for this task?"
        : runToneSafety(cleanQuestion)
    }

    return new Response(
      JSON.stringify({
        data: parsedResult,
        metadata: {
          timestamp: new Date().toISOString(),
          execution_ms: Date.now() - timestampStart
        },
        error: null
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )

  } catch (error) {
    console.error(`[task-breakdown] Processing failure: ${error.message}`, error)

    return new Response(
      JSON.stringify({
        data: {
          is_clarification_required: false,
          clarification_question: null,
          micro_steps: [
            { "step_order": 1, "title": "Open workspace", "instruction": "Open your immediate workspace module", "hint": "Get ready with your primary tool interface", "estimated_minutes": 5 },
            { "step_order": 2, "title": "Write baseline", "instruction": "Write down the first baseline bullet point", "hint": "Focus entirely on the initial line entry", "estimated_minutes": 5 },
            { "step_order": 3, "title": "Review block", "instruction": "Review the initial execution block", "hint": "A single step is an excellent start", "estimated_minutes": 5 }
          ]
        },
        metadata: {
          timestamp: new Date().toISOString(),
          execution_ms: Date.now() - timestampStart
        },
        error: { message: "Task breakdown exception caught. Safe fallback baseline active.", code: "STEP_GENERATION_FAILED" }
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
```

---

## 6. Validation & Failure Rules

| Stage | Behaviour |
|---|---|
| Input missing `task_title` | Return `VALIDATION_ERROR` at status 400 |
| Vague input detected (few words + vague keyword) | Return clarification request at status 200 |
| Step count < 3 or > 7 | Throw and fallback to deterministic steps |
| Step order non-sequential or gaps detected | Throw and fallback |
| Duration outside 2–10 min | Throw and fallback |
| Hint contains forbidden cognitive verb | Suppress hint (set to null) |
| Clarification question > 15 words | Replace with safe fallback question |
| Deepseek API failure | Log error, return fallback at status 200 |

---

## 7. Failure Behaviour

```typescript
// Internal only — never exposed to the user
{ "error": "STEP_GENERATION_FAILED" }
```

The calling Edge Function must catch this and return fallback data at status 200.

---

## 8. Final Rule

This skill defines structure, not intelligence. All reasoning about structure must remain deterministic and consistent. The AI is only used for language shaping, not decision-making.
