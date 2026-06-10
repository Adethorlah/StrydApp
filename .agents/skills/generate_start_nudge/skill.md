# Skill: `generate_start_nudge`

## Description

Generates a single, ultra-low-friction prompt when a user opens the app with an active task but has not started a session. Its purpose is to reduce initial resistance and help the user begin with the smallest possible action. This skill only surfaces one step at a time and never exposes task structure.

**Authorized Agents:**
- Start Friction Agent

---

## 1. System Placement & Orchestration Boundary

- **Architectural Implementation:** Deployed as an autonomous, serverless Edge Function at `supabase/functions/start-friction/index.ts`.
- **Core LLM Engine:** `deepseek-chat` (Deepseek-V3) wrapped via the shared edge client abstraction.
- **Trigger Checkpoint:** Fired via client lifecycle orchestration when an active focus session configuration is loaded but the user remains on the initialization slate.
- **Performance SLA Target:** Total round-trip execution must complete in < 2500ms over network.

---

## 2. Core Start Nudge Principles

All generated text must strictly conform to these design anchors:

1. **Single-Step Isolation:** Focus the user's immediate attention on a single, isolated next action. Never reference remaining tasks, timelines, milestones, or project completion goals.
2. **Non-Directive Phrasing:** The tone must be warm, calm, and conversational. Avoid commands, instructional pressure, or moral imperatives.
3. **Zero Urgency Acceleration:** The duration of user stalling must be treated as a neutral metric. Do not introduce phrases that imply rush, delayed performance, or backlog optimization.

---

## 3. Linguistic Restrictions & Prohibitions

- **Disallowed Language Phrases:** `start now`, `hurry up`, `quickly`, `don't delay`, `you should`, `you need to`, `must do`, `come on`, `no time to waste`, `immediately`.
- **Prohibited Syntax:** Zero emojis, zero exclamation marks (`!`), zero uppercase emphasis blocks.
- **Structural Bounds:** Strictly **one sentence max**, capped at an absolute ceiling of **15 words total**.

---

## 4. Input/Output Data Contracts

### 4.1 Inbound Request Payload

```json
{
  "session_id": "uuid (required)",
  "task_title": "string (required)",
  "next_step_description": "string (required, current pending micro-step text)",
  "time_stalled_seconds": "integer (required)"
}
```

### 4.2 Outbound Response Schema

```json
{
  "data": {
    "nudge_text": "string (maximum 15 words, single sentence, calm tone)",
    "next_step": "string (exact same step description passed in input)"
  },
  "metadata": {
    "timestamp": "2026-06-09T20:24:00Z",
    "execution_ms": 1120
  },
  "error": null
}
```

---

## 5. Engineering Prompt Module

```typescript
// supabase/functions/start-friction/buildNudgePrompt.ts
import { NudgeInput } from "../_shared/types.ts"

export function buildNudgePrompt(input: NudgeInput): { systemPrompt: string; userPrompt: string } {
  const systemPrompt = `
You are the STRYD 3.2 Start Friction Engine. Your sole task is to generate a single, short, welcoming sentence to lower cognitive resistance and help a user transition smoothly into their task block.

Linguistic Rules:
1. Max Length Constraint: Exactly 1 sentence. Maximum 15 words total. Keep it minimal and clean.
2. Tone Absolute: Calm, warm, non-directive, and completely free of urgency.
3. Prohibited Syntax: No exclamation marks, no emojis, no uppercase emphasis blocks.
4. Forbidden High-Pressure Phrases: start now, hurry up, quickly, don't delay, you should, you need to, must do, come on, no time to waste, immediately.

You must return a raw JSON payload matching this exact shape:
{ "nudge_text": "Your string here" }
`.trim()

  let toneAdjustment = "Provide a warm, neutral opening baseline statement."
  if (input.time_stalled_seconds > 60 && input.time_stalled_seconds <= 300) {
    toneAdjustment = "Provide a softer, highly low-pressure grounding opening statement."
  } else if (input.time_stalled_seconds > 300) {
    toneAdjustment = "Provide an extra gentle, neutral workspace invitation statement."
  }

  const userPrompt = `
The user has initialized an action workspace for the task objective: "${input.task_title}".
Apply this specific contextual tuning parameter: ${toneAdjustment}

Exemplar Output Frame: "Your next step is ready when you are."
`.trim()

  return { systemPrompt, userPrompt }
}
```

---

## 6. Production Gateway Implementation

```typescript
// supabase/functions/start-friction/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { runToneSafety } from "../_shared/toneSafety.ts"
import { callDeepseekEngine } from "../_shared/deepseekClient.ts"
import { NudgeInput } from "../_shared/types.ts"
import { buildNudgePrompt } from "./buildNudgePrompt.ts"

const ALLOWED_ORIGINS = ["http://localhost:8081", "https://stryd.app"]

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
  let payload: NudgeInput | null = null

  try {
    payload = await req.json()

    // 1. Structural Validation Guard
    if (!payload || !payload.session_id || !payload.task_title ||
        !payload.next_step_description || payload.time_stalled_seconds === undefined) {
      return new Response(
        JSON.stringify({
          data: null,
          error: { message: "Malformatted payload parameters.", code: "VALIDATION_ERROR" }
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // 2. Prompt Split Construction
    const { systemPrompt, userPrompt } = buildNudgePrompt(payload)

    // 3. Centralized Deepseek integration (V3 — supports json_object)
    const rawAiResponse = await callDeepseekEngine(
      systemPrompt,
      userPrompt,
      {
        model: "deepseek-chat",
        temperature: 0.3,
        max_tokens: 100,
        force_json: true
      }
    )

    const parsedData = JSON.parse(rawAiResponse) as { nudge_text: string }

    // 4. Post-Processing Structural Validation Guards
    const sentenceCount = parsedData.nudge_text.split(/[.!?]+/).filter(Boolean).length
    const wordCount = parsedData.nudge_text.split(/\s+/).length

    if (sentenceCount > 1 || wordCount > 15 || parsedData.nudge_text.trim().length === 0) {
      throw new Error("Downstream AI model response broke structural layout parameters.")
    }

    // 5. Mandatory Tone Safety Sanitization Pass-Through
    const finalizedNudge = runToneSafety(parsedData.nudge_text)

    return new Response(
      JSON.stringify({
        data: {
          nudge_text: finalizedNudge,
          next_step: payload.next_step_description
        },
        metadata: {
          timestamp: new Date().toISOString(),
          execution_ms: Date.now() - timestampStart
        },
        error: null
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )

  } catch (error) {
    console.error(`[start-friction] Processing failure: ${error.message}`, error)

    const fallbackText = "Your step is ready whenever you decide to begin."
    const fallbackStep = payload?.next_step_description || "Open workspace step"

    return new Response(
      JSON.stringify({
        data: {
          nudge_text: fallbackText,
          next_step: fallbackStep
        },
        metadata: {
          timestamp: new Date().toISOString(),
          execution_ms: Date.now() - timestampStart
        },
        error: {
          message: "Start Friction exception caught. Safe fallback active.",
          code: "START_NUDGE_FAILED"
        }
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
```

---

## 7. Client UI Integration & Frequency Throttling

- **Single-Card Mounting:** The UI mounts the returned `nudge_text` string immediately above the returned `next_step` description inside a clean, unshaded layout block.
- **Once-Per-Open Throttle:** The Expo mobile client stores an `active_nudge_triggered: boolean` flag in its TanStack cache layer. This flag flips to `true` the moment the function responds. The endpoint must not re-execute if the user minimizes/reopens the app or navigates between tabs within the same task block. The flag resets only when the task session is explicitly finalized or changed.

---

## 8. Timing Behaviour

| Time Stalled | Tone Adjustment |
|---|---|
| 0–60s | Neutral, warm baseline |
| 60–300s | Softer, low-pressure grounding |
| 300s+ | Extra gentle, neutral invitation |

No urgency is ever introduced regardless of stall duration.

---

## 9. Validation & Failure Rules

| Stage | Behaviour |
|---|---|
| Input missing required fields | Return `VALIDATION_ERROR` at status 400 |
| Sentence count > 1 or word count > 15 | Throw and fallback to deterministic text |
| Tone safety violation | Text scrubbed by `runToneSafety` before return |
| Deepseek API failure | Log error, return fallback at status 200 |

---

## 10. Failure Behaviour

```typescript
// Internal only — never exposed to the user
{ "error": "START_NUDGE_FAILED" }
```

The calling Edge Function must catch this and return fallback data at status 200.

---

## 11. Final Rule

The goal is not to motivate action. The goal is to make starting feel effortless.
