# Skill: `detect_escape_signal`

## Description

Detects disengagement signals during active focus sessions. This utility monitors behavioral state changes to protect focus continuity. It operates entirely as a pass-through analyzer — it does not store state natively, and it never generates user-facing messages directly.

**Authorized Agents:**
- Escape Detection Agent

---

## 1. System Placement & Core Constraints

- **Architectural Implementation:** Pure, stateless TypeScript utility inside `supabase/functions/_shared/escapeDetection.ts`.
- **Execution Target:** Must settle in < 15ms locally without nested database operations or external API requests.
- **Throttling Invariant:** Strict 10-minute rolling restriction layer evaluated via pass-through timestamps to prevent recovery loop pollution.
- **Downstream Routing:** If `escape_detected` is `true`, the orchestrating Edge Function immediately invokes the `focus-recovery` agent middleware.

---

## 2. Input/Output Data Contracts

### 2.1 Inbound Analysis Signature

```typescript
interface EscapeInput {
  session_id: string;                 // Validated target UUID
  last_active_timestamp: string;      // ISO 8601 string recorded at last user interaction
  device_current_timestamp: string;   // Explicit current ISO 8601 timestamp sent by mobile app
  last_escape_triggered_at: string | null; // Timestamp of previous escape match (for rate limiting)
  app_state: "foreground" | "background"; // Captured native mobile operating system state
  is_step_completed: boolean;         // Unified boolean state from public.micro_steps
  user_initiated_escape: boolean;     // Flag tripped instantly if user explicitly exits active route
}
```

### 2.2 Outbound Analysis Signature

```typescript
interface EscapeOutput {
  escape_detected: boolean;
  signal_type: "STEP_ABANDONED" | "APP_BACKGROUNDED" | "INACTIVITY" | null;
  minutes_inactive: number | null;
}
```

---

## 3. Deterministic Edge Case Truth Table

When evaluating state permutations, the engine processes inputs against this absolute behavioral map:

| `is_step_completed` | `user_initiated_escape` | `app_state` | Time Delta | Rate Limit Active? | Expected Output |
|---|---|---|---|---|---|
| `true` | Any | Any | Any | Any | `escape_detected: false` (Session finished) |
| `false` | `true` | Any | Any | `false` | `escape_detected: true`, `STEP_ABANDONED` |
| `false` | `false` | `"background"` | Any | `false` | `escape_detected: true`, `APP_BACKGROUNDED` |
| `false` | `false` | `"foreground"` | >= 10 min | `false` | `escape_detected: true`, `INACTIVITY` |
| `false` | `false` | `"foreground"` | < 10 min | Any | `escape_detected: false` (Active flow) |
| Any | Any | Any | Any | `true` | `escape_detected: false` (Throttled) |

---

## 4. Detection Hierarchy Rules (Deterministic Logic)

### 4.1 The Rate Limiting Gatekeeper (Pre-Check)

If `last_escape_triggered_at` is provided, the engine calculates the time delta against `device_current_timestamp`. If the difference is less than 10 minutes, the engine returns a negative evaluation instantly to prevent duplicate processing loops.

### 4.2 Step Abandonment Rule (Priority 1)

**Condition:** `is_step_completed` is `false` AND `user_initiated_escape` is `true`.

**Output:** `escape_detected = true`, `signal_type = "STEP_ABANDONED"`, `minutes_inactive = null`.

### 4.3 Operating System Background Rule (Priority 2)

**Condition:** `app_state === "background"`.

**Output:** `escape_detected = true`, `signal_type = "APP_BACKGROUNDED"`, `minutes_inactive = calculated_value`.

### 4.4 Passive Inactivity Rule (Priority 3)

**Condition:** The duration delta between `device_current_timestamp` and `last_active_timestamp` evaluates to 10 minutes or greater.

**Output:** `escape_detected = true`, `signal_type = "INACTIVITY"`, `minutes_inactive = calculated_value`.

---

## 5. Production Reference Implementation

```typescript
// supabase/functions/_shared/escapeDetection.ts

import { EscapeInput, EscapeOutput } from "./types.ts";

export function detectEscapeSignal(input: EscapeInput): EscapeOutput {
  const negativeState: EscapeOutput = {
    escape_detected: false,
    signal_type: null,
    minutes_inactive: null
  };

  // 1. Input Protection Guard
  if (!input || !input.last_active_timestamp || !input.device_current_timestamp) {
    return negativeState;
  }

  const {
    last_active_timestamp,
    device_current_timestamp,
    last_escape_triggered_at,
    app_state,
    is_step_completed,
    user_initiated_escape
  } = input;

  // 2. Complete Exemption Guard (Step is already finished)
  if (is_step_completed) {
    return negativeState;
  }

  // Parse chronological structures safely
  const lastActive = Date.parse(last_active_timestamp);
  const deviceCurrent = Date.parse(device_current_timestamp);
  if (isNaN(lastActive) || isNaN(deviceCurrent)) {
    return negativeState;
  }

  // 3. Rate Limiting Gatekeeper Layer
  if (last_escape_triggered_at) {
    const lastTrigger = Date.parse(last_escape_triggered_at);
    if (!isNaN(lastTrigger)) {
      const rateLimitDeltaMs = deviceCurrent - lastTrigger;
      const minutesSinceLastEscape = Math.floor(rateLimitDeltaMs / 1000 / 60);
      if (minutesSinceLastEscape < 10) {
        return negativeState;
      }
    }
  }

  // Calculate precise inactive whole minute delta
  const msDelta = deviceCurrent - lastActive;
  const computedMinutesInactive = Math.max(0, Math.floor(msDelta / 1000 / 60));

  // --- EVALUATE PRIORITY HIERARCHY ---

  // Priority 1: Explicit Route Escape Abandonment
  if (user_initiated_escape) {
    return {
      escape_detected: true,
      signal_type: "STEP_ABANDONED",
      minutes_inactive: computedMinutesInactive > 0 ? computedMinutesInactive : null
    };
  }

  // Priority 2: OS Background Intercept
  if (app_state === "background") {
    return {
      escape_detected: true,
      signal_type: "APP_BACKGROUNDED",
      minutes_inactive: computedMinutesInactive
    };
  }

  // Priority 3: Passive Inactivity Window Threshold
  if (computedMinutesInactive >= 10) {
    return {
      escape_detected: true,
      signal_type: "INACTIVITY",
      minutes_inactive: computedMinutesInactive
    };
  }

  return negativeState;
}
```

---

## 6. Mobile Interface Integration & Behavioral Mapping

When this utility processes an active escape state, the client framework maps the output parameters directly to target view configurations:

| Triggered Signal | Root Cause Event | Client UI State Reconfiguration |
|---|---|---|
| `STEP_ABANDONED` | User explicitly tapped out of the active focus route prior to step expiration. | Client safely clears the session view layout and flags the low-arousal re-entry slate. |
| `APP_BACKGROUNDED` | Mobile operating system reported application minimization or device sleep. | Screen saturation drops down instantly. The interface pauses the countdown overlay to protect the user from artificial deadline pressure. |
| `INACTIVITY` | Screen left open with zero touch inputs recorded for 10 minutes or more. | Client transitions the primary container card into a soft focus recovery layout, presenting exactly one question: "Continue with this step or reset time parameters?" |

---

## 7. Edge Cases

| Case | Behaviour |
|---|---|
| Missing timestamps | Return negative state (no escape) |
| Step already completed | Always return negative state |
| Both `user_initiated_escape` and `app_state === "background"` true | `STEP_ABANDONED` wins (Priority 1) |
| Both `app_state === "background"` and inactivity >= 10 min | `APP_BACKGROUNDED` wins (Priority 2) |
| Escape triggered less than 10 minutes ago | Return negative state (rate limited) |

---

## 8. Failure Behaviour

```typescript
// Internal only — never exposed to the user
{ "error": "ESCAPE_DETECTION_FAILED" }
```

The calling Edge Function must catch this and return fallback data at status 200.

---

## 9. Final Rule

This skill detects disengagement. It does not interpret emotion, intent, or motivation.
