# Skill: `tone_safety_scan`

## Description

A deterministic safety middleware that evaluates all AI-generated text for prohibited language before it reaches the mobile UI.

This skill does not modify, rewrite, or regenerate content. It only validates and flags unsafe output. All repair or regeneration is handled by a separate agent layer.

---

## Authorized Agents

- Tone Safety Agent
- Task Breakdown Agent (post-generation validation)
- Recovery Agent (post-generation validation)
- Reflection Agent (post-generation validation)
- Start Friction Agent (post-generation validation)

Every agent that produces user-facing text must pass output through this skill before returning it to the client.

---

## Input Parameters

```json
{
  "generated_text": "string",
  "source_agent": "string",
  "request_id": "string"
}
```

`source_agent` identifies which agent produced the text for logging. `request_id` traces the scan back to the originating Edge Function call.

---

## Required Output Schema

```json
{
  "is_safe": "boolean",
  "flagged_items": ["array of detected words or phrases"],
  "source_agent": "string",
  "request_id": "string",
  "scan_duration_ms": "number"
}
```

---

## Prohibited Patterns

### Disallowed Words

| Category | Words |
|---|---|
| Shame | fail, failure, failed, wrong, bad, stupid, disappointing, pathetic |
| Judgment | lazy, weak, careless, irresponsible |
| Urgency | late, behind, overdue, urgent, immediately |
| Pressure | must, should, need to, have to, required |
| Negativity | never, always (when applied to user behaviour), worthless |
| Productivity framing | productive, productivity, efficiency, output |
| Procrastination framing | procrastinate, procrastination, procrastinating, avoidance, resistance (when directed at user) |

### Disallowed Phrases

`you should have`, `why haven't you`, `you need to`, `you failed to`, `you still haven't`, `you're behind`, `you're late`, `you didn't`, `what's stopping you`, `you're not`

### Disallowed Formatting Patterns

`!` (exclamation marks — any usage), ALL CAPS sequences of 3 or more characters, numeric urgency framing (e.g. `"3 days late"`, `"2 hours behind"`)

---

## Matching Rules

- Case insensitive matching on all word and phrase patterns
- Word boundary enforcement on single-word patterns — no partial matches
  - Example: `"badly"` does not match `"bad"`
  - Example: `"failing"` does not match `"fail"` (stem detection disabled)
- Phrase matching detects full sequences including punctuation variations
  - Example: `"you should've"` matches `"you should have"`
- Numeric urgency detection uses pattern: `/\d+\s*(days?|hours?|weeks?)\s*(late|behind|overdue)/gi`
- Exclamation mark detection flags any `!` character regardless of context
- `procrastinate` and its variants use a root match without trailing boundary: `/\bprocrastinat/gi`

---

## Behaviour Rules

### If `is_safe = true`
- Text is approved for display
- No modification is performed
- Output is passed directly to the client response

### If `is_safe = false`
- Text is immediately blocked from the UI pipeline
- Output is never returned to the mobile client
- The flagged payload is passed to the `tone-repair` Edge Function
- The `tone-repair` function regenerates the text and re-submits to `tone_safety_scan` before returning to the client
- Maximum repair attempts: 2
- If repair fails twice, the system returns a deterministic fallback response (see Failure Handling below)

---

## Repair Agent Contract

The repair layer is a separate Edge Function: `supabase/functions/tone-repair/index.ts`.

```typescript
interface ToneRepairRequest {
  original_text: string
  flagged_items: string[]
  source_agent: string
  request_id: string
  attempt_number: number
}

interface ToneRepairResponse {
  repaired_text: string
  is_safe: boolean
  attempt_number: number
}
```

The `tone_safety_scan` skill is never responsible for repair. It only returns the flagged result and passes control upstream.

---

## Constraints

- Must execute in under 200ms
- Must not rewrite, regenerate, or edit text
- Must not infer intent beyond detecting disallowed patterns
- Must be fully deterministic — identical input always produces identical output
- Must never block the execution pipeline without returning a structured response

---

## Failure Handling

If scan fails or times out:

```json
{
  "is_safe": false,
  "flagged_items": ["scan_failure"],
  "source_agent": "unknown",
  "request_id": "unknown",
  "scan_duration_ms": -1
}
```

System defaults to blocking output on any failure. Never display unscanned text to the user.

Deterministic fallback text (used after 2 failed repair attempts):

```json
{
  "fallback_instruction": "Open the task and do the first thing that comes to mind.",
  "fallback_reason": "tone_repair_exhausted"
}
```

Fallback text is pre-approved and does not require scanning.

---

## Shared Client Exports

The shared client at `supabase/functions/_shared/toneSafety.ts` exposes two functions:

```typescript
// Quick inline cleansing for post-generation validation steps
export function runToneSafety(text: string): string

// Full scan with flagged items metadata for the middleware layer
export function toneSafetyScan(
  generated_text: string,
  source_agent: string,
  request_id: string
): ToneScanResult
```

Every Edge Function that produces user-facing text imports and calls `runToneSafety` before returning. The middleware layer (orchestrator function) calls `toneSafetyScan` for full audit logging.

---

## Implementation Reference

```typescript
// supabase/functions/_shared/toneSafety.ts

interface ToneScanResult {
  is_safe: boolean
  flagged_items: string[]
  source_agent: string
  request_id: string
  scan_duration_ms: number
}

const BLOCKED_WORDS: RegExp[] = [
  /\b(fail|failure|failed|wrong|bad|stupid|disappointing|pathetic)\b/gi,
  /\b(lazy|weak|careless|irresponsible)\b/gi,
  /\b(late|behind|overdue|urgent|immediately)\b/gi,
  /\b(must|should|need to|have to|required)\b/gi,
  /\b(never|always|worthless)\b/gi,
  /\b(productive|productivity|efficiency|output)\b/gi,
  /\bprocrastinat/gi,
  /\b(avoidance|resistance)\b/gi,
]

const BLOCKED_PHRASES: RegExp[] = [
  /you should have/gi,
  /why haven't you/gi,
  /you need to/gi,
  /you failed to/gi,
  /you still haven't/gi,
  /you're behind/gi,
  /you're late/gi,
  /you didn't/gi,
  /what's stopping you/gi,
  /you're not/gi,
]

const BLOCKED_FORMATTING: RegExp[] = [
  /!/g,
  /[A-Z]{3,}/g,
  /\d+\s*(days?|hours?|weeks?)\s*(late|behind|overdue)/gi,
]

const ALL_PATTERNS: RegExp[] = [
  ...BLOCKED_WORDS,
  ...BLOCKED_PHRASES,
  ...BLOCKED_FORMATTING,
]

export function toneSafetyScan(
  generated_text: string,
  source_agent: string,
  request_id: string
): ToneScanResult {
  const start = Date.now()
  const flagged_items: string[] = []

  ALL_PATTERNS.forEach(pattern => {
    const matches = generated_text.match(pattern)
    if (matches) {
      flagged_items.push(...matches.map(m => m.toLowerCase()))
    }
  })

  return {
    is_safe: flagged_items.length === 0,
    flagged_items: [...new Set(flagged_items)],
    source_agent,
    request_id,
    scan_duration_ms: Date.now() - start,
  }
}

export function runToneSafety(text: string): string {
  let safe = text
  ALL_PATTERNS.forEach(pattern => {
    safe = safe.replace(pattern, "")
  })
  return safe.trim()
}
```

---

## Validation & Failure Rules

| Stage | Behaviour |
|---|---|
| No prohibited patterns matched | `is_safe: true`, text passed through |
| Prohibited word matched | Flagged in `flagged_items`, text blocked from UI |
| Prohibited phrase matched | Flagged in `flagged_items`, text blocked from UI |
| Exclamation mark detected | Flagged, text blocked |
| ALL CAPS sequence detected | Flagged, text blocked |
| Numeric urgency detected | Flagged, text blocked |
| Scan timeout or error | `is_safe: false`, `flagged_items: ["scan_failure"]`, block output |
| Repair attempt 1 fails | Retry with repaired text |
| Repair attempt 2 fails | Return deterministic fallback, no further retries |
