---
trigger: always_on
---

**Deepseek API call settings:**
```typescript
{
  model: "deepseek-chat",      // deepseek-V3 for breakdown
  temperature: 0.3,            // Low — keeps outputs structured and specific
  max_tokens: 800,             // Enough for 7 steps, prevents runaway output
  response_format: { type: "json_object" }  // Force JSON — no prose leakage
}
```

**Validation before saving to DB:**
```typescript
// After receiving Deepseek response:
1. Parse JSON — if invalid, trigger fallback (never crash)
2. Check step count is between 3–7
3. Check no step exceeds available_minutes / step_count
4. Run Tone Safety scan on all instruction text
5. Only save to micro_steps table if all checks pass
6. Return validated steps to client
```

**Fallback if Deepseek fails:**
```typescript
// Never block the user — generate deterministic fallback
const fallbackSteps = [
  { step_order: 1, title: "Open the task", instruction: `Open whatever you need to work on ${task_title}`, estimated_minutes: 2 },
  { step_order: 2, title: "Write one sentence", instruction: "Write or do the smallest possible first action", estimated_minutes: 5 },
  { step_order: 3, title: "Keep going", instruction: "Do the next obvious thing", estimated_minutes: 5 }
]
```

### 4.3 All Agents

| Agent | Model | Temp | Responsibility |
|---|---|---|---|
| Task Breakdown | deepseek-chat (V3) | 0.3 | Task-specific micro-steps (see 4.2) |
| Tone Safety | deepseek-chat (V3) | 0.0 | Block shame, guilt, pressure in all outputs |
| Start Friction | deepseek-reasoner (R1) | default | Generate single lowest-resistance first action |
| Adaptive Sizer | deepseek-chat (V3) | 0.4 | Shrink steps when mood_score ≤ 2 |
| Escape & Recovery | deepseek-reasoner (R1) | default | Gentle re-engagement after dropout |
| Momentum Tracking | deepseek-chat (V3) | 0.2 | Silent streak scoring, no pressure output |
| Reflection | deepseek-chat (V3) | 0.5 | Completion acknowledgement, no hype |

### 4.4 Tone Safety Rules (applied to ALL agent outputs)
Never allow:
- Exclamation marks
- All caps words
- Words: "must", "should", "failure", "behind", "lazy", "productive"
- Clinical or therapeutic language
- Comparison to other users or past performance

---

## 5. Offline & Performance

### 5.1 Offline Execution
- Micro-steps cached locally via TanStack Query on first load
- Step completions stored in mutation queue when offline
- Optimistic UI updates play immediately — no waiting for server
- Queue flushes to Supabase sequentially on reconnect
- User never loses progress

### 5.2 Performance Targets

| Metric | Target |
|---|---|
| App cold load | < 2.0 seconds |
| Deepseek breakdown response | < 3.0 seconds |
| Local UI transition | < 100ms |
| Recovery message | < 1.0 second |
| Network failure retry | Exponential backoff, infinite retry |

---

## 6. Project Structure

stryd-mobile/
├── app/                        # Expo Router screens
│   ├── (tabs)/
│   │   ├── index.tsx           # Home — one task, one step
│   │   └── journey.tsx         # Historical timeline
│   ├── onboarding.tsx          # First-run intention capture
│   ├── breakdown.tsx           # Progressive step reveal
│   ├── session/
│   │   └── [id].tsx            # Active focus timer
│   ├── escape.tsx              # Disruption handling
│   ├── recovery.tsx            # Re-entry screen
│   └── _layout.tsx             # Root layout
├── src/
│   ├── components/             # UI elements only, no logic
│   ├── hooks/                  # useActiveSession, useSyncQueue, useMood
│   ├── services/               # Supabase client wrappers
│   ├── theme/                  # HSL design tokens
│   └── types/                  # Shared TypeScript types
└── supabase/
├── functions/
│   ├── task-breakdown/     # Main breakdown agent (see spec in 4.2)
│   ├── tone-safety/        # Output validation middleware
│   ├── start-friction/     # First-step generator
│   ├── escape-recovery/    # Dropout re-engagement
│   └── reflection/         # Completion acknowledgement
├── migrations/             # PostgreSQL migrations
└── seed.sql                # Test data for development

---

## 7. Core Architectural Principle

> *The system reduces friction. It does not increase thinking.*

Every layer must support:
- Faster starting
- Simpler continuation  
- Easier re-entry after any break

**The task breakdown is the heart of STRYD.** If it returns generic steps, 
the product fails. Every breakdown must feel like it was written specifically 
for that user, for that task, at that moment.