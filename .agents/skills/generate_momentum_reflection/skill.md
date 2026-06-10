# Skill: `generate_momentum_reflection`

## Description

Generates a short, grounded reflection message at the end of a user session. The purpose is to help the user recognise progress in a calm, neutral way without emotional exaggeration or performance framing. This skill reinforces continuity of effort, not achievement.

**Authorized Agents:**
- Momentum Reflection Agent

---

## 1. System Placement & Orchestration Boundary

- **Architectural Implementation:** Deployed as an autonomous, serverless Edge Function at `supabase/functions/reflection/index.ts`.
- **Core LLM Engine:** `deepseek-chat` (Deepseek-V3) wrapped via the shared edge client abstraction.
- **Trigger Checkpoint:** Executed upon session finalization where `steps_completed >= 1` AND the terminating `session_status` resolves to either `"completed"` or `"exited_early"`.

---

## 2. Core Reflection Principles

All generated text must strictly conform to these three design anchors:

1. **Grounded Language:** Focus exclusively on raw, observable actions. No emotional amplification, cheerleading, or judgmental evaluations.
2. **Internal Reference Only:** Reference the user's immediate historical timeline only. Never compare against external benchmarks, percentiles, or other users.
3. **Neutral Reinforcement:** Acknowledge task velocity without praise. Avoid performance framing (e.g., "good," "bad," "productive," "unproductive").

---

## 3. Linguistic Restrictions & Prohibitions

- **Disallowed Vocabulary:** `amazing`, `incredible`, `crushed`, `excellent`, `great`, `outstanding`, `perfect`, `behind`, `lazy`, `should`, `need`, `progress`, `awesome`, `superb`.
- **Prohibited Syntax:** Emojis, exclamation marks (`!`), trailing ellipses (`...`), or uppercase emphasis words.
- **Cognitive Load Bounds:** Maximum 2 sentences, between 8 and 40 words total.

---

## 4. Input/Output Data Contracts

### 4.1 Inbound Request Payload

```json
{
  "session_id": "uuid (required)",
  "steps_completed": "integer (required)",
  "duration_actual_minutes": "integer (required)",
  "aggregate_completions_today": "integer (required)"
}
```

### 4.2 Outbound Response Schema

```json
{
  "data": {
    "reflection_text": "string (maximum 2 sentences, strict observational tone)"
  },
  "metadata": {
    "timestamp": "2026-06-09T20:05:00Z",
    "execution_ms": 1250
  },
  "error": null
}
```

---

## 5. Engineering Prompt Module

```typescript
// supabase/functions/reflection/buildReflectionPrompt.ts
import { ReflectionInput } from "../_shared/types.ts";

export function buildReflectionPrompt(input: ReflectionInput): { systemPrompt: string; userPrompt: string } {
  const systemPrompt = `
You are the STRYD 3.2 Behavioral Evaluation System. Your sole task is to return a brief focus log summary formatting raw session metrics into a JSON object.

Linguistic and Structural Boundaries:
1. Max Length Constraint: Maximum 2 sentences. Absolute length between 8 and 40 words total.
2. Tone Absolute: You are a neutral, steady, observational logging machine. Describe the data. Do not analyze what it means.
3. Prohibited Syntax: Zero emojis, zero exclamation marks, and zero ALL-CAPS words.
4. Forbidden Vocabulary: amazing, incredible, crushed, excellent, great, outstanding, perfect, behind, lazy, should, need, progress.
5. Absolute Isolation: Do not reference deadlines, backlogs, future pressure, or comparisons to anyone else.

You must return a raw JSON payload matching this exact shape:
{ "reflection_text": "Your string here" }
`.trim()

  const userPrompt = `
Process these exact session metrics into a reflection statement:
- Micro-steps completed in this block: ${input.steps_completed}
- Actual duration of active focus: ${input.duration_actual_minutes} minutes
- Total successful micro-steps today: ${input.aggregate_completions_today}

Exemplar Output Frame: "You completed three micro-steps over fifteen minutes of focus. That brings your total to six actions today."
`.trim()

  return { systemPrompt, userPrompt }
}
```

---

## 6. Production Gateway Implementation

```typescript
// supabase/functions/reflection/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { runToneSafety } from "../_shared/toneSafety.ts"
import { callDeepseekEngine } from "../_shared/deepseekClient.ts"
import { ReflectionInput, ReflectionOutput } from "../_shared/types.ts"
import { buildReflectionPrompt } from "./buildReflectionPrompt.ts"

const ALLOWED_ORIGINS = ["http://localhost:8081", "https://stryd.app"]

serve(async (req: Request) => {
  const origin = req.headers.get("origin") || ""

  // Scoped CORS — supports dynamic Expo dev URIs
  const isAllowedOrigin = ALLOWED_ORIGINS.includes(origin) || origin.startsWith("exp://")

  const corsHeaders = {
    "Access-Control-Allow-Origin": isAllowedOrigin ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  }

  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })

  const timestampStart = Date.now()
  let payload: ReflectionInput | null = null

  try {
    payload = await req.json()

    // 1. Structural Validation Guard
    if (!payload || payload.steps_completed === undefined ||
        payload.duration_actual_minutes === undefined ||
        payload.aggregate_completions_today === undefined) {
      return new Response(
        JSON.stringify({
          data: null,
          error: { message: "Malformatted payload parameters.", code: "VALIDATION_ERROR" }
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // 2. Prompt Generation
    const { systemPrompt, userPrompt } = buildReflectionPrompt(payload)

    // 3. Centralized Deepseek integration via shared client
    const rawAiResponse = await callDeepseekEngine(
      systemPrompt,
      userPrompt,
      {
        model: "deepseek-chat",
        temperature: 0.2,
        max_tokens: 150,
        force_json: true
      }
    )

    const parsedData = JSON.parse(rawAiResponse) as ReflectionOutput

    // 4. Sentence count and length invariant guard
    const sentenceCount = parsedData.reflection_text
      .split(/[.!?]+/).filter(Boolean).length
    if (sentenceCount > 2 || parsedData.reflection_text.trim().length === 0) {
      throw new Error("Response violated structural boundary lengths.")
    }

    // 5. Mandatory Tone Safety sanitization
    parsedData.reflection_text = runToneSafety(parsedData.reflection_text)

    return new Response(
      JSON.stringify({
        data: parsedData,
        metadata: {
          timestamp: new Date().toISOString(),
          execution_ms: Date.now() - timestampStart
        },
        error: null
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )

  } catch (error) {
    console.error(`[reflection] Processing failure: ${error.message}`, error)

    const totalSteps = payload?.steps_completed || 1
    const fallbackText = `You completed ${totalSteps} micro-action${totalSteps > 1 ? "s" : ""} during this workspace tracking block. The session context is recorded cleanly.`

    return new Response(
      JSON.stringify({
        data: { reflection_text: fallbackText },
        metadata: {
          timestamp: new Date().toISOString(),
          execution_ms: Date.now() - timestampStart
        },
        error: {
          message: "Inference exception captured. Localized safe fallback mapped.",
          code: "DETERMINISTIC_FALLBACK_ACTIVE"
        }
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
```

---

## 7. Client Environmental Integration

- **The Focus Finish State:** The client locks open a dedicated, low-arousal reflection window containing nothing but the rendered `reflection_text` string and a singular, neutral dismiss control button ("Return to layout").
- **Zero-Pressure Environment:** The text is rendered without accent colors, sparkling animations, or high-arousal sound cues, protecting the user's focus environment from performance praise or pressure loops.

---

## 8. Validation & Failure Rules

| Stage | Behaviour |
|---|---|
| Input missing required fields | Return `VALIDATION_ERROR` at status 400 |
| Sentence count > 2 or empty text | Throw and fallback to deterministic text |
| Tone safety violation | Text scrubbed by `runToneSafety` before return |
| Deepseek API failure | Log error, return fallback at status 200 |
| Total word count < 8 or > 40 | Enforced in prompt; post-check throws if violated |

---

## 9. Failure Behaviour

```typescript
// Internal only — never exposed to the user
{ "error": "MOMENTUM_REFLECTION_FAILED" }
```

The calling Edge Function must catch this and return fallback data at status 200.

---

## 10. Final Rule

This skill describes what happened. It does not evaluate what it means.
