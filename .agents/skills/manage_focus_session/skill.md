# Skill: `manage_focus_session`

## Description

Handles direct state transitions for a focus session in the database. This skill performs only deterministic session state updates. It does not trigger agents, enforce behavioural rules, or generate messages.

**Authorized Agents:**
- Start Friction Agent
- Session Controller (system-level agent if introduced later)

---

## 1. Relational Placement & Security Invariants

- **Architectural Implementation:** Deployed as database operations managed via an Edge Function at `supabase/functions/session-state/index.ts`.
- **Database Targets:** Mutates records across `public.focus_sessions` and updates tracking flags inside `public.micro_steps`.
- **Security & Token Integrity:** Gated via Supabase Row Level Security (RLS). Every operation explicitly decodes the inbound Authorization header to authenticate the active user, ensuring all mutations match `auth.uid()`.

---

## 2. Input/Output Data Contracts

### 2.1 Inbound Session Lifecycle Payload

```json
{
  "session_id": "uuid (required, client-side token continuity)",
  "task_id": "uuid (required, references parent task entry)",
  "step_id": "uuid (required, references active target micro-step)",
  "state_transition": "enum: 'START' | 'PAUSE' | 'RESUME' | 'COMPLETE' | 'EXIT_EARLY'",
  "step_order": "integer (required, tracks structural sequencing position)",
  "calculated_pause_delta_seconds": "integer (optional, passed explicitly during RESUME events)",
  "device_timestamp": "string (ISO 8601 string recorded at client execution boundary)"
}
```

### 2.2 Outbound State Confirmation Schema

```json
{
  "data": {
    "session_id": "uuid",
    "task_id": "uuid",
    "session_status": "enum: 'active' | 'paused' | 'completed' | 'exited_early'",
    "synchronized_at": "2026-06-09T20:29:35Z"
  },
  "metadata": {
    "execution_ms": 12
  },
  "error": null
}
```

---

## 3. Transition Matrix & Relational Side-Effects

| `state_transition` | Target Table | Primary Column Mutations | Enforced Side-Effects |
|---|---|---|---|
| `START` | `focus_sessions` | Insert row. Set `session_status = 'active'`, `started_at = device_timestamp`, `user_id = auth_uid`. | Fails if unclosed session exists matching this `user_id`. |
| `PAUSE` | `focus_sessions` | Update row. Set `session_status = 'paused'`. | Freezes countdown timers on client. |
| `RESUME` | `focus_sessions` | Update row. Set `session_status = 'active'`, increment `paused_duration_seconds`. | Safe increment using client-side delta. |
| `COMPLETE` | `focus_sessions`, `micro_steps` | Set `session_status = 'completed'`, `ended_at = device_timestamp`. Set `is_completed = true`. | Targets matching `step_id` and `step_order`. |
| `EXIT_EARLY` | `focus_sessions` | Update row. Set `session_status = 'exited_early'`, `ended_at = device_timestamp`. | No alteration to micro-step state. |

---

## 4. Production Database Integration

```typescript
// supabase/functions/session-state/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { SessionPayload } from "../_shared/types.ts"

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
  let payload: SessionPayload | null = null

  try {
    const authHeader = req.headers.get("Authorization")!
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    )

    // 1. Explicitly Decode Token Context to Resolve User Scoping
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

    payload = await req.json()

    // 2. Defensive Structural Parameter Guard
    if (!payload || !payload.session_id || !payload.task_id || !payload.step_id ||
        !payload.state_transition || payload.step_order === undefined || !payload.device_timestamp) {
      return new Response(
        JSON.stringify({
          data: null,
          error: { message: "Required payload contract parameters missing.", code: "BAD_PARAMS" }
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const {
      session_id, task_id, step_id, state_transition,
      step_order, calculated_pause_delta_seconds, device_timestamp
    } = payload
    let databaseStatusValue = "active"

    // 3. Execution Routing Matrix via Relational Transactions
    switch (state_transition) {
      case "START": {
        const { data: activeCheck } = await supabaseClient
          .from("focus_sessions")
          .select("id")
          .eq("user_id", user.id)
          .eq("session_status", "active")
          .maybeSingle()

        if (activeCheck) {
          return new Response(
            JSON.stringify({
              data: null,
              error: { message: "Concurrent focus tracking blocks are prohibited.", code: "CONCURRENCY_LOCK_ACTIVE" }
            }),
            { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          )
        }

        await supabaseClient.from("focus_sessions").insert({
          id: session_id,
          user_id: user.id,
          task_id,
          step_id,
          session_status: "active",
          started_at: device_timestamp,
          paused_duration_seconds: 0,
          interruption_count: 0
        })
        databaseStatusValue = "active"
        break
      }

      case "PAUSE":
        await supabaseClient
          .from("focus_sessions")
          .update({ session_status: "paused" })
          .eq("id", session_id)
          .eq("user_id", user.id)
        databaseStatusValue = "paused"
        break

      case "RESUME": {
        const delta = calculated_pause_delta_seconds || 0

        const { data: currentSession } = await supabaseClient
          .from("focus_sessions")
          .select("paused_duration_seconds")
          .eq("id", session_id)
          .eq("user_id", user.id)
          .single()

        const updatedPauseTotal = (currentSession?.paused_duration_seconds || 0) + delta

        await supabaseClient
          .from("focus_sessions")
          .update({
            session_status: "active",
            paused_duration_seconds: updatedPauseTotal
          })
          .eq("id", session_id)
          .eq("user_id", user.id)

        databaseStatusValue = "active"
        break
      }

      case "COMPLETE":
        await supabaseClient
          .from("focus_sessions")
          .update({ session_status: "completed", ended_at: device_timestamp })
          .eq("id", session_id)
          .eq("user_id", user.id)

        await supabaseClient
          .from("micro_steps")
          .update({ is_completed: true })
          .eq("id", step_id)
          .eq("task_id", task_id)
          .eq("step_order", step_order)

        databaseStatusValue = "completed"
        break

      case "EXIT_EARLY":
        await supabaseClient
          .from("focus_sessions")
          .update({ session_status: "exited_early", ended_at: device_timestamp })
          .eq("id", session_id)
          .eq("user_id", user.id)
        databaseStatusValue = "exited_early"
        break
    }

    return new Response(
      JSON.stringify({
        data: {
          session_id,
          task_id,
          session_status: databaseStatusValue,
          synchronized_at: new Date().toISOString()
        },
        metadata: { execution_ms: Date.now() - timestampStart },
        error: null
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )

  } catch (error) {
    console.error(`[session-state] Transaction failure: ${error.message}`, error)

    return new Response(
      JSON.stringify({
        data: null,
        metadata: { execution_ms: Date.now() - timestampStart },
        error: { message: "Internal relational sync exception recorded.", code: "RELATIONAL_WRITE_FAILED" }
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
```

---

## 5. Failure Recovery Policy

Because this endpoint manages critical session state changes, an error must never destabilize the interface:

- **Local Optimistic Updates:** The Expo client mutates state flags locally instantly inside the active view. It does not await network confirmation before updating screen timer components, preserving ultra-low UI lag.
- **Background Sync Backlog:** If the endpoint responds with a `RELATIONAL_WRITE_FAILED` error within a status 200 return, transaction payloads are buffered securely inside the client's offline cache. The client re-queues and syncs rows sequentially when connectivity is re-established.

---

## 6. Failure Behaviour

```typescript
// Internal only — never exposed to the user
{ "error": "SESSION_STATE_FAILED" }
```

The calling Edge Function must catch this and return fallback data at status 200.

---

## 7. Final Rule

Session state is deterministic and stateless. It tracks what happened — it does not evaluate why.
