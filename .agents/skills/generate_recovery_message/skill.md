# Skill: `generate_recovery_message`

## Description

Generates a calm, guilt-free message that helps a user return to a task after inactivity or interruption. The goal is to reduce friction and re-entry resistance, not to explain what happened. This skill supports emotional reset, not behavioural correction.

**Authorized Agents:**
- Recovery Agent
- Escape Detection Agent

---

## 1. System Placement & Orchestration Boundary

- **Architectural Implementation:** Deployed as an autonomous, serverless Edge Function at `supabase/functions/focus-recovery/index.ts`.
- **Core LLM Engine:** `deepseek-reasoner` (Deepseek-R1) using low temperature bounds to enforce tight compliance with linguistic constraints.
- **Performance SLA Target:** Total round-trip execution must complete in < 2500ms over network.

---

## 2. Core Recovery Principles

All generated text must strictly conform to these three design anchors:

1. **Fresh Start Framing:** Assume a complete state of neutral initialization. Never reference time gaps, lateness, or what happened.
2. **Linguistic Neutrality:** Zero guilt, zero urgency, and zero correction language. No performance framing (e.g., "failed," "succeeded," "good," "bad").
3. **Minimal Cognitive Load:** The statement must be instantly readable. Avoid complex syntax, phrasing, or instructional explanations.

---

## 3. Linguistic Restrictions & Prohibitions

- **Disallowed Vocabulary:** `failed`, `lazy`, `behind`, `wrong`, `missed`, `should`, `need`, `again`, `overdue`, `problem`, `late`, `wasted`, `incomplete`, `deadline`.
- **Prohibited Syntax:** Zero emojis, zero exclamation marks (`!`), zero negative contractions (`didn't`, `haven't`), and zero references to temporal gaps.
- **Structural Bounds:** Strictly **one sentence max**, capped at an absolute ceiling of **15 words total**.

---

## 4. Input/Output Data Contracts

### 4.1 Inbound Request Payload

```json
{
  "session_id": "uuid (required)",
  "trigger_type": "enum: 'MISSED_INTENTION' | 'ABANDONED_TASK' | 'LONG_ABSENCE'",
  "cumulative_abandonment_count": "integer (required, tracked cross-session via client log telemetry)"
}
```

### 4.2 Outbound Response Schema

```json
{
  "data": {
    "recovery_message": "string (maximum 15 words, calm and neutral)",
    "recovery_options": [
      "continue_next_step",
      "generate_smaller_step",
      "start_short_session",
      "save_and_return_later"
    ],
    "escalation_active": "boolean"
  },
  "metadata": {
    "timestamp": "2026-06-09T20:17:00Z",
    "execution_ms": 1820
  },
  "error": null
}
```

---

## 5. Engineering Prompt Module

```typescript
// supabase/functions/focus-recovery/buildRecoveryPrompt.ts
import { RecoveryInput } from "../_shared/types.ts"

export function buildRecoveryPrompt(input: RecoveryInput): { systemPrompt: string; userPrompt: string } {
  const systemPrompt = `
You are the STRYD 3.2 Focus Recovery Engine. Your sole task is to generate a single, short, calming sentence to help a user smoothly re-enter their work state.

Linguistic Rules:
1. Max Length Constraint: Exactly 1 sentence. Maximum 15 words total. Keep it minimal.
2. Tone Absolute: Complete emotional neutrality. Assume a fresh start. Do not reference time gaps, lateness, or what happened.
3. Prohibited Syntax: No exclamation marks, no emojis, no negative contractions.
4. Forbidden Vocabulary: failed, lazy, behind, wrong, missed, should, need, again, overdue, problem, late, deadline.

Output your raw, single sentence response directly as plain text. Do not wrap it in markdown or JSON code blocks.
`.trim()

  let promptContext = "Provide a neutral restart statement."
  if (input.trigger_type === "ABANDONED_TASK") {
    promptContext = "Provide a light, gentle re-entry statement focused on the immediate present."
  } else if (input.trigger_type === "LONG_ABSENCE") {
    promptContext = "Provide a clear reset statement that ignores any past time gap entirely."
  }

  const userPrompt = `
Generate a message based on this systemic condition: ${promptContext}

Exemplar Output Frame: The workspace is clear and one small action is a valid place to begin.
`.trim()

  return { systemPrompt, userPrompt }
}
```

---

## 6. Production Gateway Implementation

```typescript
// supabase/functions/focus-recovery/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { runToneSafety } from "../_shared/toneSafety.ts"
import { callDeepseekEngine } from "../_shared/deepseekClient.ts"
import { RecoveryInput } from "../_shared/types.ts"
import { buildRecoveryPrompt } from "./buildRecoveryPrompt.ts"

const ALLOWED_ORIGINS = ["http://localhost:8081", "https://stryd.app"]

const HARDCODED_RECOVERY_OPTIONS = [
  "continue_next_step",
  "generate_smaller_step",
  "start_short_session",
  "save_and_return_later"
]

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
  let payload: RecoveryInput | null = null

  try {
    payload = await req.json()

    // 1. Structural Validation Guard
    if (!payload || !payload.trigger_type || payload.cumulative_abandonment_count === undefined) {
      return new Response(
        JSON.stringify({
          data: null,
          error: { message: "Malformatted payload parameters.", code: "VALIDATION_ERROR" }
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // 2. Evaluate Escalation Rule Deterministically via Cross-Session Telemetry
    const isEscalated = payload.cumulative_abandonment_count >= 3

    // 3. Prompt Construction
    const { systemPrompt, userPrompt } = buildRecoveryPrompt(payload)

    // 4. Centralized Shared Deepseek Integration (R1 — no response_format)
    const rawAiResponse = await callDeepseekEngine(
      systemPrompt,
      userPrompt,
      {
        model: "deepseek-reasoner",
        temperature: 0.1,
        max_tokens: 60
      }
    )

    const strippedMessage = rawAiResponse.trim().replace(/^["']|["']$/g, "")

    // 5. Post-Processing Structural Validation Guards
    const sentenceCount = strippedMessage.split(/[.!?]+/).filter(Boolean).length
    const wordCount = strippedMessage.split(/\s+/).length

    if (sentenceCount > 1 || wordCount > 15 || strippedMessage.length === 0) {
      throw new Error("Downstream AI model violated structural sentence or length limits.")
    }

    // 6. Concatenate Escalation Before Sanitization to Lock Down Security Bounds
    let rawOutputString = strippedMessage
    if (isEscalated) {
      rawOutputString = `${rawOutputString} This task may feel too large right now.`
    }

    // 7. Mandatory Tone Safety Sanitization Pass-Through
    const finalizedMessage = runToneSafety(rawOutputString)

    return new Response(
      JSON.stringify({
        data: {
          recovery_message: finalizedMessage,
          recovery_options: HARDCODED_RECOVERY_OPTIONS,
          escalation_active: isEscalated
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
    console.error(`[focus-recovery] Processing failure: ${error.message}`, error)

    const baseFallback = "Ready when you are. One small step is enough."
    const totalFallback = payload && payload.cumulative_abandonment_count >= 3
      ? `${baseFallback} This task may feel too large right now.`
      : baseFallback

    return new Response(
      JSON.stringify({
        data: {
          recovery_message: totalFallback,
          recovery_options: HARDCODED_RECOVERY_OPTIONS,
          escalation_active: payload ? payload.cumulative_abandonment_count >= 3 : false
        },
        metadata: {
          timestamp: new Date().toISOString(),
          execution_ms: Date.now() - timestampStart
        },
        error: {
          message: "Focus Recovery processing exception caught. Safe fallback active.",
          code: "RECOVERY_MESSAGE_FAILED"
        }
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
```

---

## 7. Client Presentational Mapping

The four recovery options are hardcoded into the mobile Expo frontend in a permanent layout array:

- `continue_next_step`
- `generate_smaller_step`
- `start_short_session`
- `save_and_return_later`

Options are styled with uniform grayscale borders, zero pop-up accent transitions, and zero disruptive UI states, anchoring the low-arousal recovery window.

---

## 8. Trigger Handling Rules

| Trigger Type | Behaviour |
|---|---|
| `MISSED_INTENTION` | Neutral restart framing |
| `ABANDONED_TASK` | Light re-entry framing focused on the present |
| `LONG_ABSENCE` | Clear reset framing, no reference to time gap |

---

## 9. Validation & Failure Rules

| Stage | Behaviour |
|---|---|
| Input missing `trigger_type` or `cumulative_abandonment_count` | Return `VALIDATION_ERROR` at status 400 |
| Sentence count > 1 or word count > 15 | Throw and fallback to deterministic text |
| `cumulative_abandonment_count` >= 3 | Append escalation text before tone safety |
| Tone safety violation | Text scrubbed by `runToneSafety` before return |
| Deepseek API failure | Log error, return fallback at status 200 |

---

## 10. Failure Behaviour

```typescript
// Internal only — never exposed to the user
{ "error": "RECOVERY_MESSAGE_FAILED" }
```

The calling Edge Function must catch this and return fallback data at status 200.

---

## 11. Final Rule

The system does not correct the user. It simply makes restarting easier.
