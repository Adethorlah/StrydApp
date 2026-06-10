# STRYD — API & Data Contracts
Version 3.2 · June 2026 · Confidential

This document defines the strict data contracts, runtime request-response schemas, and mutation boundaries for STRYD 3.2.

This contract forms a binding structural agreement between:
- **Client Application:** React Native / Expo Mobile Client
- **Orchestration Layer:** Serverless Supabase Edge Functions (Deno Runtime)
- **AI Core:** Deepseek Engine Infrastructure (V3 Chat / R1 Reasoning)
- **Database Architecture:** Supabase PostgreSQL protected by Row Level Security (RLS)

---

## 1. System Communication Architecture

Data interaction is split into two isolated, non-overlapping channels:

**Direct Data Tier (Client <-> Supabase Database):** Standard CRUD actions (marking a step complete, reading past logs) bypass custom API routing entirely. The Mobile Client reads and writes directly to database tables using the official `@supabase/supabase-js` SDK. Security is completely enforced at the engine level via Row Level Security (RLS).

**Orchestration Tier (Client <-> Supabase Edge Functions <-> Deepseek):** Heavy data transformations, multi-agent evaluation, and AI text synthesis happen inside stateless serverless functions. The client invokes these functions via secure HTTPS POST actions.

**System Invariant:** Deepseek models operate purely as stateless data transformers. They are physically barred from mutating the database directly. They accept input schemas, return verified structural JSON objects, and the system persists those objects through tightly controlled Edge Function execution blocks.

> See `architecture.md` for the full agent registry and performance targets.

---

## 2. Authentication & Header Mechanics

Every outbound network call — whether targeting the Supabase database gateway or a serverless Edge Function — must transmit the authenticated user's signed JSON Web Token (JWT).

```
Authorization: Bearer <supabase_jwt_session_token>
Content-Type: application/json
```

**Gateway Invariants:**
- Requests missing an authorization token header are instantly dropped at the Supabase API Gateway.
- Token validation, user expiration checks, and cryptographic signature decoding occur before executing any application code.

---

## 3. Unified Network Payload Specifications

To eliminate client-side rendering errors, all custom Edge Function invocations communicate via a standardized, predictable wrapper payload.

### 3.1 Global Success Wrapper

```json
{
  "data": {},
  "metadata": {
    "timestamp": "2026-06-09T16:11:58Z",
    "execution_ms": 142
  },
  "error": null
}
```

### 3.2 Global Error Wrapper

```json
{
  "data": null,
  "metadata": {
    "timestamp": "2026-06-09T16:11:58Z",
    "execution_ms": 12
  },
  "error": {
    "code": "AI_PARSE_FAILURE",
    "message": "The downstream AI generated an unparseable JSON structure. Fallback rules applied.",
    "recoverable": true
  }
}
```

### 3.3 Error Code Taxonomy

| Code | Meaning | Recoverable |
|---|---|---|
| `VALIDATION_ERROR` | Input failed schema validation | Yes — fix and retry |
| `AUTHENTICATION_ERROR` | Missing or expired JWT | Yes — re-authenticate |
| `AI_PARSE_FAILURE` | Deepseek returned unparseable JSON | Yes — fallback triggered |
| `AI_TIMEOUT` | Deepseek exceeded response window | Yes — fallback triggered |
| `RATE_LIMITED` | Too many requests (100 req/min per user) | Yes — wait and retry |
| `INTERNAL_ERROR` | Unexpected server failure | No — fallback triggered |

---

## 4. Edge Function Contracts (AI Orchestration Layer)

All Edge Function endpoints follow the pattern: `POST /functions/v1/<function-name>`

### 4.1 Task Decomposition (`task-breakdown`)

Invokes `deepseek-chat` (V3) to slice broad intentions into atomic micro-steps. Automatically flags mega-tasks (project-level input) and restricts output to Phase 1 only.

**Endpoint:** `POST /functions/v1/task-breakdown`

**Inbound Request:**

```json
{
  "task_title": "Build out the authentication UI screens",
  "task_description": "Setup Expo Router layouts, build inputs using HSL tokens, and link to SecureStore tracking hooks.",
  "mood_score": 2,
  "available_minutes": 30
}
```

**Outbound Response (post tone-safety):**

```json
{
  "data": {
    "task_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "is_mega_task": false,
    "steps": [
      {
        "step_order": 1,
        "title": "Open the file",
        "instruction": "Open the /app/onboarding.tsx file inside the editor.",
        "estimated_minutes": 5
      },
      {
        "step_order": 2,
        "title": "Map form inputs",
        "instruction": "Map the primary form input configurations to matching local tracking variables.",
        "estimated_minutes": 10
      },
      {
        "step_order": 3,
        "title": "Verify state mutations",
        "instruction": "Verify state mutations transition cleanly without layout shifts.",
        "estimated_minutes": 10
      }
    ],
    "total_estimated_minutes": 25,
    "phase_label": "Getting started"
  },
  "metadata": { "execution_ms": 2150 },
  "error": null
}
```

> **Step field naming:** `step_order`, `title`, `instruction`, `estimated_minutes` — must match `micro_steps` table schema and `code_style.md` conventions.

---

### 4.2 Tone Safety Scan (`tone-safety`)

Validates and sanitizes AI-generated text against blocked language patterns. Runs as middleware on all agent outputs.

**Endpoint:** `POST /functions/v1/tone-safety`

**Inbound Request:**

```json
{
  "text": "You MUST complete this task NOW! Don't fail.",
  "source_agent": "task-breakdown"
}
```

**Outbound Response:**

```json
{
  "data": {
    "original_text": "You MUST complete this task NOW! Don't fail.",
    "sanitized_text": "You can complete this task now. Don't uncompleted session.",
    "was_modified": true,
    "violations_found": ["EXCLAMATION", "COERCIVE_IMPERATIVE", "SHAME_LANGUAGE"]
  },
  "metadata": { "execution_ms": 45 },
  "error": null
}
```

> See `tone_safety_scan` skill for the full pattern list and implementation.

---

### 4.3 Start Friction Nudge (`start-friction`)

Invokes `deepseek-reasoner` (R1) to generate the single lowest-resistance first action for a task. Used when the user is stuck on starting.

**Endpoint:** `POST /functions/v1/start-friction`

**Inbound Request:**

```json
{
  "task_title": "Write research paper",
  "task_description": "Psychology assignment on cognitive load theory",
  "mood_score": 2
}
```

**Outbound Response:**

```json
{
  "data": {
    "nudge_text": "Open a blank document and type the title.",
    "estimated_minutes": 2,
    "rationale": "Starting with a zero-resistance action builds momentum without requiring decisions."
  },
  "metadata": { "execution_ms": 1200 },
  "error": null
}
```

> See `generate_start_nudge` skill for full prompt and validation logic.

---

### 4.4 Escape & Recovery (`focus-recovery`)

Invokes `deepseek-reasoner` (R1) to evaluate an ongoing session dropout event, reconstructing user context cleanly without introducing guilt markers or pressure tactics.

**Endpoint:** `POST /functions/v1/focus-recovery`

**Inbound Request:**

```json
{
  "session_id": "c10b7d4d-5e8f-4a3d-9c2b-1a2b3c4d5e6f",
  "elapsed_minutes": 14,
  "last_active_step_id": "e22c8d4d-6f9f-5b4e-8d3c-2b3c4d5e6f7a",
  "interruption_count": 3
}
```

**Outbound Response:**

```json
{
  "data": {
    "recovery_message": "The session context is preserved. When you are ready, you can return directly to step two with zero tracking penalties.",
    "suggested_action": "RESUME_STEP",
    "recalibration_required": true
  },
  "metadata": { "execution_ms": 1850 },
  "error": null
}
```

> See `generate_recovery_message` skill and `detect_escape_signal` skill for the full pipeline.

---

### 4.5 Momentum Reflection (`reflection`)

Invokes `deepseek-chat` (V3) to generate a calm, non-hype completion acknowledgement after a session ends.

**Endpoint:** `POST /functions/v1/reflection`

**Inbound Request:**

```json
{
  "task_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "session_id": "c10b7d4d-5e8f-4a3d-9c2b-1a2b3c4d5e6f",
  "steps_completed": 3,
  "total_duration_minutes": 25
}
```

**Outbound Response:**

```json
{
  "data": {
    "reflection_text": "You completed three steps across twenty-five minutes. The session is logged and progress is preserved.",
    "momentum_score": 0.7
  },
  "metadata": { "execution_ms": 900 },
  "error": null
}
```

> Momentum score is calculated server-side by the `calculate_momentum` skill — never sent by the client. See `generate_momentum_reflection` skill.

---

## 5. Direct Database Table Contracts

Basic mutations operate over database instances directly using optimistic UI patterns on the client.

### 5.1 Table: `tasks`

Tracks user macro intentions.

| Column | Type | Constraints |
|---|---|---|
| `id` | `uuid` | Primary Key, default `gen_random_uuid()` |
| `user_id` | `uuid` | Foreign Key -> `auth.users`, not null |
| `title` | `text` | Not null |
| `description` | `text` | Nullable |
| `is_completed` | `boolean` | Default `false` |
| `created_at` | `timestamptz` | Default `now()` |
| `completed_at` | `timestamptz` | Nullable |

**Client SDK write:**

```typescript
const { data, error } = await supabase
  .from('tasks')
  .insert([{ title: 'Refactor types schema', description: 'Align server shared folder interfaces' }])
  .select()
```

### 5.2 Table: `micro_steps`

Atomic items extracted during decomposition.

| Column | Type | Constraints |
|---|---|---|
| `id` | `uuid` | Primary Key, default `gen_random_uuid()` |
| `task_id` | `uuid` | Foreign Key -> `public.tasks`, not null |
| `step_order` | `integer` | Not null, 1-based sequential |
| `title` | `text` | Not null, max 10 words |
| `instruction` | `text` | Not null |
| `estimated_minutes` | `integer` | Not null (2-10 inclusive) |
| `is_completed` | `boolean` | Default `false` |
| `completed_at` | `timestamptz` | Nullable |

**Optimistic completion:**

```typescript
const { error } = await supabase
  .from('micro_steps')
  .update({ is_completed: true, completed_at: new Date().toISOString() })
  .eq('id', activeStepId)
```

### 5.3 Table: `focus_sessions`

Tracks telemetry during focused work blocks.

| Column | Type | Constraints |
|---|---|---|
| `id` | `uuid` | Primary Key, default `gen_random_uuid()` |
| `user_id` | `uuid` | Foreign Key -> `auth.users`, not null |
| `task_id` | `uuid` | Foreign Key -> `public.tasks`, not null |
| `step_id` | `uuid` | Foreign Key -> `public.micro_steps`, nullable |
| `duration_target_minutes` | `integer` | Not null |
| `duration_actual_minutes` | `integer` | Default `0` |
| `paused_duration_seconds` | `integer` | Default `0` |
| `interruption_count` | `integer` | Default `0` |
| `session_status` | `text` | Enum: `active` / `completed` / `exited_early` |
| `started_at` | `timestamptz` | Default `now()` |
| `ended_at` | `timestamptz` | Nullable |

**Constraint:** Only one active session per user at a time.

---

## 6. Pagination

List endpoints use cursor-based pagination:

**Request query params:**
- `cursor` — the `created_at` timestamp of the last item from the previous page
- `limit` — page size (default 20, max 50)

**Response:**

```json
{
  "data": [ ... ],
  "pagination": {
    "next_cursor": "2026-06-09T15:30:00Z",
    "has_more": true
  },
  "metadata": { "execution_ms": 85 },
  "error": null
}
```

---

## 7. Real-Time Sync & Idempotency

**Idempotency (Multi-Submit Protection):** Endpoints that orchestrate system state transitions (session creation, task generation) use unique client-generated UUIDs passed in the request body. If a user taps twice due to latency, the system matches the original transaction ID and returns the existing result without duplicating resources.

**WebSocket Sync:** Focus session status tracking relies on active Supabase real-time subscription sockets (WSS). If a socket drops mid-session, the local TanStack Query cache records state changes sequentially and queues mutations until the connection restores.

---

## 8. Operational Design Rules

- **Data Overload:** Payload schemas are limited to the current processing view. The mobile app must never query complex nested lists or deep history during focus tracking.
- **Fail-Safe Compliance:** If a Deepseek call fails, the Edge Function catches the exception, generates deterministic fallback steps, and returns status 200. The mobile UI never sees an error screen.
- **Cognitive Load:** If a response is too large, too complex, or too frequent, simplify it at the server layer before sending to the client.
