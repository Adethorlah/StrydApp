# Skill: `calculate_momentum_score`

## Description

Calculates a momentum score for a user session based on steps completed, session duration, and interruption count.

Momentum is processed purely as a behavioral velocity signal representing focus consistency and engagement quality — it is entirely decoupled from performance judgment or task outcome success.

**Authorized Agents:**
- Momentum Tracking Agent
- Momentum Reflection Agent

---

## 1. System Placement & Runtime Constraints

- **Architectural Implementation:** Implemented as a pure, stateless TypeScript utility function inside `supabase/functions/_shared/momentumEngine.ts`.
- **Execution Target:** Must settle in < 10ms locally without external database lookups or downstream API fetches.
- **Immutability Invariant:** Computed strictly server-side inside the Edge Function upon session finalization. Written to `focus_sessions.momentum_score`. Completely immutable thereafter. The mobile client is structurally barred from editing or patching this score.

---

## 2. Input / Output Data Contracts

### 2.1 Inbound Calculation Signature

```typescript
interface MomentumInput {
  steps_completed: number;          // Tally of micro-steps marked complete during block
  duration_actual_minutes: number;  // Continuous clock minutes recorded by mobile device
  interruption_count: number;       // Explicit count of application abandonment events
}
```

### 2.2 Outbound Calculation Signature

```typescript
interface MomentumOutput {
  momentum_score: number;           // Deterministic integer bound between 1 and 5 inclusive
  system_action_hook: "TRIGGER_RECOVERY" | "NORMALIZE_FLOW" | "TRIGGER_REFLECTION";
}
```

---

## 3. Mathematical Scoring Matrix (Core Algorithm)

The engine determines momentum by analyzing sustained execution against structural disruption vectors.

### 3.1 Base Formula Architecture

When inputs satisfy base criteria, the raw momentum score (M_raw) is derived using balanced weight evaluation coefficients that give proportional value to both step execution and time context:

```
M_raw = (steps_completed * 1.0) + (duration_actual_minutes / 5) - (interruption_count * 0.75)
```

### 3.2 Normalization & Guardrails

Before mapping to the final score bands, the engine enforces strict structural constraints in a sequential layout:

1. **Input Guard:** If the input object is undefined, null, or missing fields, the engine intercepts the execution and defaults to a score of 1 with a recovery hook.
2. **The Zero Activity Absolute:** If `steps_completed` is 0 or less, the output immediately defaults to 1. No further calculations are performed.
3. **Minimum Scale Constriction:** If `duration_actual_minutes` is less than 5 minutes, the maximum allowable score is strictly capped at 3 to prevent over-crediting rushed task completions.
4. **High Interruption & Penalty Liquidation:** If `interruption_count` is 3 or more, OR if the mathematical deductions drop M_raw below 1.5 (penalties outpacing execution gains), the final score is hard-capped at a maximum of 2.
5. **Strict Boundary Clamping:** The final output is rounded to the nearest whole integer (Math.round) and clamped explicitly between 1 and 5.

---

## 4. Production Reference Implementation

This pure utility function is shared across Edge Function orchestration routines:

```typescript
// supabase/functions/_shared/momentumEngine.ts

import { MomentumInput, MomentumOutput } from "./types.ts";

export function calculateMomentumScore(input: MomentumInput): MomentumOutput {
  // Rule 1: Input Guard against malformed parameters
  if (!input || input.steps_completed === undefined ||
      input.duration_actual_minutes === undefined ||
      input.interruption_count === undefined) {
    return { momentum_score: 1, system_action_hook: "TRIGGER_RECOVERY" };
  }

  const { steps_completed, duration_actual_minutes, interruption_count } = input;

  // Rule 2: The Zero Activity Absolute
  if (steps_completed <= 0) {
    return { momentum_score: 1, system_action_hook: "TRIGGER_RECOVERY" };
  }

  // Baseline normalization for unexpected negatives in other fields
  const safeDuration = Math.max(0, duration_actual_minutes);
  const safeInterruptions = Math.max(0, interruption_count);

  // Execute Rebalanced Mathematical Model Weighting
  let rawScore = (steps_completed * 1.0) + (safeDuration / 5) - (safeInterruptions * 0.75);

  // Rule 3: Minimum Scale Constriction
  if (safeDuration < 5 && rawScore > 3) {
    rawScore = 3;
  }

  // Rule 4: High Interruption & Penalty Liquidation
  if (safeInterruptions >= 3 || rawScore < 1.5) {
    const clampedScore = Math.max(1, Math.min(2, Math.round(rawScore)));
    return { momentum_score: clampedScore, system_action_hook: "TRIGGER_RECOVERY" };
  }

  // Finalization: Integer rounding and explicit [1, 5] envelope clamping
  const finalScore = Math.max(1, Math.min(5, Math.round(rawScore)));

  // Map behavioral scores directly to functional system action hooks
  let actionHook: MomentumOutput["system_action_hook"] = "NORMALIZE_FLOW";
  if (finalScore <= 2) {
    actionHook = "TRIGGER_RECOVERY";
  } else if (finalScore === 5) {
    actionHook = "TRIGGER_REFLECTION";
  }

  return {
    momentum_score: finalScore,
    system_action_hook: actionHook
  };
}
```

---

## 5. System Action Hooks & Scoring Bands

The mobile client consumes the output payload to dynamically adjust the interface environment without intermediate confirmation steps.

| Score | State Definition | Behavioral Signal Description | App System Action Hook |
|---|---|---|---|
| 1 | Interrupted | Session dropped early or completed zero micro-steps. High friction environment. | `TRIGGER_RECOVERY`: Client layout isolates the active view and routes straight to the focus-recovery agent middleware. |
| 2 | Fractured | Low task engagement with high friction patterns or heavy structural interruptions. | `TRIGGER_RECOVERY`: App drops background saturation down and initializes a low-arousal environment re-entry window. |
| 3 | Consistent | Standard execution metrics. Balanced milestones with normal pause points. | `NORMALIZE_FLOW`: App transitions cleanly back to the standard Home screen focus log. No extra menus. |
| 4 | High Velocity | Strong task serialization, steady focus velocity, and minor operational overhead. | `NORMALIZE_FLOW`: Clean exit path into the regular logging view; background elements remain stable. |
| 5 | Flow State | Complete focus continuity. Rapid task finalization with zero session dropouts. | `TRIGGER_REFLECTION`: App locks open a structured post-session reflection prompt to safely anchor the momentum gain. |

---

## 6. Edge Case Handling Summary

| Case | Behaviour |
|---|---|
| `input` is null / undefined / missing fields | Return `{ momentum_score: 1, system_action_hook: "TRIGGER_RECOVERY" }` |
| `steps_completed` is 0 or negative | Return `{ momentum_score: 1, system_action_hook: "TRIGGER_RECOVERY" }` |
| `duration_actual_minutes` < 5 | Cap raw score at 3 before final clamp |
| `interruption_count` >= 3 | Hard cap at score 2, trigger recovery |
| Raw score drops below 1.5 | Hard cap at score 2, trigger recovery |
| Final score after rounding | Clamped to [1, 5], rounded via `Math.round()` |

---

## 7. Failure Behaviour

```typescript
// Internal only — never exposed to the user
{ "error": "MOMENTUM_CALCULATION_FAILED" }
```

The calling Edge Function must catch this and return fallback data at status 200.

---

## 8. Final Rule

Momentum is a behavioural signal, not a performance judgement. It reflects effort consistency, not success or failure.
