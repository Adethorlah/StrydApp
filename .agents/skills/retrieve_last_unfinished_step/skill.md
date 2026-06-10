# Skill: `retrieve_last_unfinished_step`

## Description

Retrieves the most recent incomplete micro-step from the user's latest active or abandoned task session. This skill does not determine user messaging or UX flow. It only returns structured step context for downstream agents.

**Authorized Agents:**
- Smart Restart Agent

---

## 1. System Placement & Security Invariants

- **Architectural Implementation:** Deployed as an optimized relational query engine at `supabase/functions/retrieve-unfinished-step/index.ts`.
- **Database Targets:** Read-only operations across `public.focus_sessions`, `public.tasks`, and `public.micro_steps`.
- **Security & Multi-Tenancy:** Strictly gated via Row Level Security (RLS). Every operation decodes the bearer token to resolve `auth.uid()`. Raw user IDs are never accepted in request bodies.
- **Authorized Downstream Systems:** `Smart Restart Agent`.

---

## 2. Input/Output Data Contracts

### 2.1 Inbound Request Payload

```json
{}
```

This route is authenticated payload-free. User identification is decoded exclusively from the HTTP bearer token.

### 2.2 Outbound Core Context Schema

```json
{
  "data": {
    "task_id": "uuid (nullable)",
    "task_title": "string (nullable)",
    "step_id": "uuid (nullable)",
    "step_description": "string (nullable)",
    "step_order": "integer (nullable)",
    "session_status": "enum: 'active' | 'paused' | 'exited_early' | 'completed'",
    "is_step_completed": "boolean"
  },
  "metadata": {
    "execution_ms": 15
  },
  "error": null
}
```

---

## 3. Deterministic Retrieval Traversal Path

To guarantee predictable results under heavy concurrency, the engine executes a strict, single-step filtering pipeline:

1. **Session Isolation:** Query `public.focus_sessions` matching decoded `user_id`. Filter where `session_status` is `active`, `paused`, or `exited_early`.
2. **Chronological Sorting:** Order by `started_at DESC`, limit to the single most recent record.
3. **Step Extraction:** Using the session's `task_id`, query `public.micro_steps` where `is_completed = false`.
4. **Sequence Lock:** Order by `step_order ASC`, select the first element. This isolates the absolute next micro-step causing task friction.

---

## 4. Production Gateway Implementation

```typescript
// supabase/functions/retrieve-unfinished-step/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

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

  try {
    const authHeader = req.headers.get("Authorization")!
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    )

    // 1. Explicitly Decode User Token Context
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) {
      return new Response(
        JSON.stringify({
          data: null,
          error: { message: "User session identification missing.", code: "UNAUTHORIZED" }
        }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // 2. Fetch Latest Open Focus Session (sorted by started_at)
    const { data: latestSession, error: sessionError } = await supabaseClient
      .from("focus_sessions")
      .select("id, task_id, session_status")
      .eq("user_id", user.id)
      .in("session_status", ["active", "paused", "exited_early"])
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (sessionError) throw sessionError

    // Edge Case: No open or abandoned sessions exist
    if (!latestSession) {
      return new Response(
        JSON.stringify({
          data: {
            task_id: null,
            task_title: null,
            step_id: null,
            step_description: null,
            step_order: null,
            session_status: "completed",
            is_step_completed: true
          },
          metadata: { execution_ms: Date.now() - timestampStart },
          error: null
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // 3. Pull Parent Task Metadata and Next Incomplete Step (uses instruction column)
    const { data: stepContext, error: stepError } = await supabaseClient
      .from("micro_steps")
      .select(`
        id,
        instruction,
        step_order,
        tasks ( id, title )
      `)
      .eq("task_id", latestSession.task_id)
      .eq("is_completed", false)
      .order("step_order", { ascending: true })
      .limit(1)
      .maybeSingle()

    if (stepError) throw stepError

    const taskData = stepContext?.tasks as unknown as { id: string; title: string } | null

    return new Response(
      JSON.stringify({
        data: {
          task_id: latestSession.task_id,
          task_title: taskData ? taskData.title : null,
          step_id: stepContext ? stepContext.id : null,
          step_description: stepContext ? stepContext.instruction : null,
          step_order: stepContext ? stepContext.step_order : null,
          session_status: latestSession.session_status,
          is_step_completed: false
        },
        metadata: { execution_ms: Date.now() - timestampStart },
        error: null
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )

  } catch (error) {
    console.error(`[retrieve-unfinished-step] Retrieval failure: ${error.message}`, error)

    return new Response(
      JSON.stringify({
        data: {
          task_id: null,
          task_title: null,
          step_id: null,
          step_description: null,
          step_order: null,
          session_status: "completed",
          is_step_completed: true
        },
        metadata: { execution_ms: Date.now() - timestampStart },
        error: { message: "Context retrieval pipeline exception encountered.", code: "RETRIEVAL_FAILED" }
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
```

---

## 5. Downstream Execution Invariant Rules

- **Immutability Contract:** This endpoint never updates rows. It reads the database snapshot as it exists, passing the exact token positions to the client.
- **Orchestration Layer Integration:** The mobile client reads this snapshot upon foreground reload. If a valid `task_id` is returned with `is_step_completed: false` and a status of `exited_early` or `paused`, the routing workflow passes these payload properties to the Start Friction Agent endpoint to generate a localized start nudge.

---

## 6. Edge Cases

| Case | Output |
|---|---|
| No open, paused, or abandoned sessions | All fields null, `session_status: "completed"`, `is_step_completed: true` |
| Session exists but all steps completed | `step_id` / `step_description` / `step_order` all null, `is_step_completed: true` |
| Multiple open sessions | Returns most recent by `started_at DESC` |
| Auth token missing or invalid | Returns `UNAUTHORIZED` at status 401 |

---

## 7. Failure Behaviour

```typescript
// Internal only — never exposed to the user
{ "error": "RETRIEVAL_FAILED" }
```

The calling Edge Function must catch this and return fallback data at status 200.

---

## 8. Final Rule

This skill retrieves step context. It does not generate messages or trigger downstream agents directly.
