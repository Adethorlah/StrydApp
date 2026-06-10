# STRYD — Serverless Edge Function Scaffolding Guide
Version 3.2 · June 2026 · Confidential

This document defines the strict scaffolding criteria and engineering patterns for all backend processes in STRYD 3.2.

Every custom backend capability must be deployed as a serverless **Supabase Edge Function** utilizing the sandboxed Deno TypeScript runtime. Any code implementation that violates these boundaries will fail system integration.

---

## 1. Core Architectural Pipeline

For advanced intelligence tasks, data processing flows through an isolated, stateless transformation pipeline:

```
Mobile Client (Expo)
  -> Edge Function Gateway (Deno)
    -> Input Validation
      -> Prompt Builder (typed, task-specific)
        -> Deepseek Engine
          -> Tone Safety Sanitizer
            -> Structured JSON Response
```

### Invariants:
- **Direct Database Channel:** Basic data mutations (step completion toggle, task title update) bypass custom backend code entirely. The mobile client speaks directly to PostgreSQL via `@supabase/supabase-js`, isolated by Row Level Security (RLS).
- **The Stateless AI Rule:** Edge Functions do not maintain long-term local memory, global state, or direct multi-table mutation loops. They act as pure, predictable transformers: **Inputs -> AI Enrichment -> Sanitization -> Outputs.**
- **Thin Gateways:** Edge Functions handle orchestration, not deep business logic. If a function block exceeds **40 lines**, modularize into explicit file pieces inside the function directory.
- **No AI Calls in Client:** The mobile client is strictly prohibited from running prompt strings, talking directly to Deepseek, or parsing raw AI completions. All generative processes happen inside Edge Functions.

---

## 2. Standard Edge Function Structural Blueprint

Every function inside `supabase/functions/` must mirror this pattern:

```
supabase/functions/<function-name>/
  +-- index.ts              # Entry point — orchestration only
  +-- build<Name>Prompt.ts  # Task-specific prompt (one per agent)
  +-- <name>.test.ts        # Local tests (optional but encouraged)
```

### Required code skeleton:

```typescript
// supabase/functions/task-breakdown/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { runToneSafety } from "../_shared/toneSafety.ts"
import { callDeepseekEngine } from "../_shared/deepseekClient.ts"
import { generateSafeFallbackSteps } from "../_shared/fallback.ts"
import { buildBreakdownPrompt } from "./buildBreakdownPrompt.ts"
import { AgentInput, SafeBreakdownResponse } from "../_shared/types.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',     // Restrict to app domain in production
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const timestampStart = Date.now()

  try {
    const body: AgentInput = await req.json()

    // Validate — fail early before any AI call
    if (!body.task_title || body.mood_score === undefined || !body.available_minutes) {
      return new Response(
        JSON.stringify({
          data: null,
          error: { message: "Required fields: task_title, mood_score, available_minutes", code: "VALIDATION_ERROR" }
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Prompt builder is in its own file per code_style.md §6
    const promptText = buildBreakdownPrompt(body)

    const rawAiResponse = await callDeepseekEngine(promptText, {
      model: "deepseek-chat",
      temperature: 0.3,
      max_tokens: 1000,
      force_json: true
    })

    const structuredData = JSON.parse(rawAiResponse) as SafeBreakdownResponse

    // Tone safety applies to instruction field — matches micro_steps table schema
    structuredData.steps = structuredData.steps.map(step => ({
      ...step,
      instruction: runToneSafety(step.instruction)
    }))

    return new Response(
      JSON.stringify({
        data: structuredData,
        metadata: { timestamp: new Date().toISOString(), execution_ms: Date.now() - timestampStart },
        error: null
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )

  } catch (error) {
    console.error(`[task-breakdown] Fallback triggered:`, error)

    const fallbackPayload = generateSafeFallbackSteps(body?.task_title || "your task")
    return new Response(
      JSON.stringify({
        data: fallbackPayload,
        metadata: { timestamp: new Date().toISOString(), execution_ms: Date.now() - timestampStart },
        error: { message: "Downstream engine anomaly. Deterministic fallback applied.", code: "ENGINE_FALLBACK_ACTIVE" }
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
```

### Prompt lives in its own file (separate from index.ts):

```typescript
// supabase/functions/task-breakdown/buildBreakdownPrompt.ts
import { AgentInput } from "../_shared/types.ts"

export function buildBreakdownPrompt(input: AgentInput): string {
  if (!input.task_title) throw new Error('task_title is required')
  if (!input.mood_score) throw new Error('mood_score is required')
  if (!input.available_minutes) throw new Error('available_minutes is required')

  const max_step_minutes = input.mood_score <= 2 ? 3 :
                           input.mood_score <= 3 ? 7 : 10

  return `
You are STRYD, a calm focus assistant. Break down the exact task into 3-7 concrete micro-steps.

Task: ${input.task_title}
Description: ${input.task_description || 'none provided'}
Mood score: ${input.mood_score}/5
Available time: ${input.available_minutes} minutes

Rules:
- Every step specific to THIS task
- Max ${max_step_minutes} minutes per step
- Ordered and sequential
- No motivational language. No exclamation marks.
- Total time must not exceed ${input.available_minutes} minutes

Return JSON only. No markdown. No preamble.
  `.trim()
}
```

### Fallback in shared module (not duplicated per function):

```typescript
// supabase/functions/_shared/fallback.ts
import { SafeBreakdownResponse } from "../_shared/types.ts"

export function generateSafeFallbackSteps(task_title: string): SafeBreakdownResponse {
  return {
    steps: [
      {
        step_order: 1,
        title: "Open the task",
        instruction: `Open whatever you need to work on ${task_title}`,
        estimated_minutes: 2
      },
      {
        step_order: 2,
        title: "Do the first thing",
        instruction: "Do the smallest possible first action you can think of",
        estimated_minutes: 5
      },
      {
        step_order: 3,
        title: "Keep going",
        instruction: "Do the next obvious thing from where you are",
        estimated_minutes: 5
      }
    ],
    total_estimated_minutes: 12,
    phase_label: "Getting started"
  }
}
```

---

## 3. Deployment & Folder Mapping

All capabilities reside inside `supabase/functions/`.

```
supabase/
 +-- functions/
 |   +-- _shared/                    # Shared logic — no index.ts here
 |   |   +-- types.ts                # Mirrored data type contracts
 |   |   +-- toneSafety.ts           # Text normalization regex library
 |   |   +-- deepseekClient.ts       # Unified Deepseek network gateway
 |   |   +-- fallback.ts             # Deterministic fallback generators
 |   +-- task-breakdown/             # Deepseek-V3 (temp: 0.3)
 |   |   +-- index.ts
 |   |   +-- buildBreakdownPrompt.ts
 |   +-- tone-safety/                # Deepseek-V3 (temp: 0.0)
 |   |   +-- index.ts
 |   +-- start-friction/             # Deepseek-R1 (default temp)
 |   |   +-- index.ts
 |   +-- focus-recovery/             # Deepseek-R1 (default temp)
 |   |   +-- index.ts
 |   +-- momentum-tracking/          # Deepseek-V3 (temp: 0.2)
 |   |   +-- index.ts
 |   +-- reflection/                 # Deepseek-V3 (temp: 0.5)
 |       +-- index.ts
 +-- migrations/                     # Versioned SQL updates
 +-- import_map.json                 # Deno dependency management
```

> See `architecture.md` §4.3 for the full agent table (model, temperature, max_tokens per agent).

---

## 4. User Identity Validation Invariants

Edge Functions must **never** accept `user_id` declared directly in the inbound JSON payload.

- **JWT Decoding:** Extract identity server-side by decoding the `Authorization` header token against Supabase's internal cryptographic key infrastructure.
- **Context Allocation:** The unpacked `auth.uid()` maps to all transactional validation checks, eliminating spoofing vectors.

```typescript
// Correct — extract from JWT, not from body
const authHeader = req.headers.get('Authorization')
const jwt = authHeader?.replace('Bearer ', '')
const { data: { user } } = await supabaseClient.auth.getUser(jwt)
const userId = user?.id   // never body.user_id
```

---

## 5. Defensive Exception Management

The primary objective of STRYD's backend is to protect the user from crashes, endless spinners, and disruptive error traces.

- **Total Interception:** All core operations wrap in safe execution fields. A JSON parse failure or Deepseek timeout must never reach the client as a `500`.
- **The Fallback Absolute:** If an error occurs, catch it, log it server-side, map output to deterministic fallback data (`generateSafeFallbackSteps`), and return `200 OK`. The user never knows the AI failed.
- **Idempotency:** Endpoints that create resources (session start, task generation) accept a client-generated `idempotency_key` in the body. If the same key arrives twice, return the existing result — never duplicate.

---

## 6. Performance & SLA Parameters

| Metric | Target | Strategy |
|---|---|---|
| Cold start runtime | < 400ms | Minimize module imports, avoid heavy NPM trees |
| Deepseek roundtrip | < 2500ms | Hard `max_tokens` bounds, temperature lock |
| Data normalization | < 15ms | Optimized precompiled regex |
| Response (DB-only) | < 500ms | Direct channel via `@supabase/supabase-js` |

---

## 7. Operational Logging Boundaries

- **Prohibited:** Raw PII, user intention text, AI output payloads, JWT tokens.
- **Permitted:** Invocation timestamps, latency metrics, error codes, downstream API response times.

---

## 8. Environment & Dependencies

- **Secrets:** Access via `Deno.env.get('DEEPSEEK_API_KEY')`, `Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')`. Never hardcode.
- **Import Map:** Manage Deno module versions in `supabase/import_map.json`. Pin versions — never use `@latest`.
- **Local Testing:** Use `supabase functions serve <name> --env-file ./supabase/.env.local` for local development.

---

## 9. Non-Negotiable System Checkpoints

1. **Deno Standardization:** Use native browser-standard modules (`Request`, `Response`, `fetch`). Node globals are banned.
2. **Mandatory Tone Normalization:** Every AI-generated string passes through `runToneSafety` before returning to the client.
3. **Step field naming:** All step objects use `step_order`, `title`, `instruction`, `estimated_minutes` — must match `micro_steps` table schema and `api_contract.md`.
4. **Prompts in their own files:** Every prompt lives in `build<Name>Prompt.ts` — never inlined in `index.ts`.
5. **No raw user_id:** Extract identity from JWT, never from request body.
6. **Fail at 200:** All errors return status `200` with deterministic fallback data — never `500`.
7. **No AI calls in mobile client:** All generative processes happen inside Edge Functions.
