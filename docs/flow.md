# STRYD — User Flow Document
Version 3.0 · June 2026 · Confidential

---

## Overview

This document defines the complete user experience flow for STRYD v1.0.
It covers every screen, state, transition, and interaction in the app.

The guiding principle across every screen:
> One thing at a time. No decisions. No pressure. Just the next step.

---

## 1. App Entry Logic

Every time the app opens, it checks three things in order:

```
App Opens
│
├── Has onboarding been completed? (AsyncStorage)
│     No → Onboarding Flow
│     Yes → Continue
│
├── Is there an active task in progress?
│     Yes → Home Screen (State B — resume)
│     No → Home Screen (State A — goal input)
│
└── Is the user authenticated?
      Yes → Sync with Supabase
      No → Continue as guest (AsyncStorage only)
```

---

## 2. Onboarding Flow

Triggered once on first app open only.
Target completion time: under 60 seconds.
No login. No sign up. No friction.

### Screen 1 — Welcome 1

Communicates the struggle. The user feels understood before the app asks anything of them.

- STRYD wordmark centered
- Headline: "You know what needs to be done. Starting is the hard part."
- Single button: "I know this feeling"

### Screen 2 — Welcome 2

Communicates the solution. One idea only, nothing else.

- Headline: "STRYD breaks your goal into one step at a time. You never have to figure out what's next."
- Single button: "That sounds good"

### Screen 3 — Welcome 3

Communicates the outcome. Closes the loop on the promise.

- Headline: "Tell us what you want to achieve. We handle everything else."
- Single button: "Let's go"

### Screen 4 — Preferred Name

- Prompt: "What should we call you?"
- Single large text input, centered
- Placeholder: "Your name"
- Keyboard done key auto-advances to next screen
- Button: "Continue"
- First name only — no surname, no email, no account
- Stored in AsyncStorage
- Used to personalise all AI interactions throughout the app
- Name is never sent to Deepseek API — used locally only for UI rendering and greeting templates

### Screen 5 — Mood Check

- Prompt: "How are you feeling right now?"
- 5 emoji options, large and centered, no labels:
  - 😔 Score 1 — Overwhelmed
  - 😞 Score 2 — Low energy
  - 😐 Score 3 — Okay
  - 🙂 Score 4 — Focused
  - 😄 Score 5 — Ready
- Selecting a mood auto-advances to Home (no button)
- Mood score stored in AsyncStorage
- Used to shape the tone of the first AI greeting AND step sizing for the first task

### Onboarding Exit

- Mark onboarding complete in AsyncStorage
- Navigate to Home Screen (State A)
- Never show onboarding again

---

## 3. Bottom Navigation

Present on all main screens after onboarding.
Three tabs only — no clutter.

```
[ 🏠 Home ]  [ 🗺️ Journey ]  [ ⚙️ Settings ]
```

- **Home** — AI greeting, goal input, active task state
- **Journey** — the winding path, step nodes, progress
- **Settings** — name, notifications, account

Bottom navigation is hidden during:
- Onboarding flow
- Focus timer (full screen experience)
- Sign up flow

---

## 4. Home Screen

The heart of STRYD. The conversational entry point.
The AI companion greets the user and waits for their input — exactly like a chat interface. No dashboard. No menus. Just one question and a text input.

### State A — No Active Task (First Visit or Fresh Start)

The AI asks what the user wants to accomplish.

**Screen content:**
- AI greeting at top (chat bubble style):
  - Mood 1–2: "Hey [name], no pressure. What's one thing you'd like to move forward today?"
  - Mood 3: "Hey [name], what would you like to get done today?"
  - Mood 4–5: "Hey [name], you seem ready. What are we working on?"
- Single large text input below greeting
- Placeholder: "Describe your goal..."
- Button: "Let's break it down"
- AI companion bubble visible in bottom right corner
- Nothing else on screen

**After goal is submitted:**

1. Pre-task mood check appears (see Section 5) — skipped on first task, onboarding mood is reused
2. Mood selected → AI begins processing
3. Loading state:
   - AI message: "Building your path..."
   - Soft ambient animated indicator — no spinner, no clock
   - If processing exceeds 10 seconds: "Still thinking... your goal is a good one."
   - If processing exceeds 20 seconds: Edge Function assumed unreachable → local fallback steps generated on device (see Section 15)
   - No error messages shown to user under any circumstance
4. On completion → navigate to Journey tab (Journey Path screen)

### State B — Active Task Exists (Returning Visit)

The AI surfaces exactly where the user left off.
No decisions required. One tap resumes everything.

**Screen content:**
- AI greeting (chat bubble): "Welcome back, [name]. Here's where you are."
- Current task title (subtle, secondary)
- Current active step title (large, prominent)
- Single button: "Continue"
- AI companion bubble visible

### State C — Task Completed

All steps in the current task are done.

**Screen content:**
- AI message (neutral, steady, no hype): "You worked through it, [name]. That's the whole thing."
- Two options:
  - "Start something new" → clears task, returns to State A
  - "Rest for now" → calm holding screen, no prompts, no notifications for 2 hours

---

## 5. Pre-Task Mood Check

Triggered before every new goal submission — except the very first.

**First task only:**
The onboarding mood score is used for both greeting tone and step sizing. The user is not asked twice in the same flow.

**Every subsequent task:**
- AI message: "Before we start — how are you feeling right now?"
- Same 5 emoji options as onboarding
- Auto-advances on selection (no button)
- Mood score passed directly to task breakdown Edge Function

**Step sizing logic:**
- Mood 1–2 → steps shrink to 2–3 minutes, first step must be trivially easy
- Mood 3 → standard sizing (5–7 minutes per step)
- Mood 4–5 → steps up to 10 minutes

---

## 6. Journey Path Screen (Journey Tab)

The visual representation of the user's path.
Displayed after goal breakdown is complete.
Accessible via the Journey tab at any time.

### Layout

- Curved SVG winding path, scrollable vertically
- Step nodes positioned along the path
- Only the current active node is tappable
- Completed nodes are visually marked (subtle, no fanfare)
- Locked nodes are visible but muted
- Phase markers appear between step groups (complex goals)
- AI companion bubble persistent in bottom right corner

### Step Node — Active State

Tapping the active node expands it inline on the path:
- Step title (large, clear)
- Step instruction (one sentence, specific to the exact task)
- Estimated time: "About 5 minutes"
- Button: "Begin this step" → opens Focus Timer
- AI companion bubble remains accessible

### Step Node — Completed State

- Title AND instruction visible when tapped
- Read-only — no interaction, no re-do
- No time estimate shown
- AI companion still accessible for deeper questions

### Step Node — Locked State

- Title visible, muted appearance
- Not tappable
- No time estimate (reduces future pressure)

### Phase Structure (complex goals only)

When a goal is too large for a single list of steps, the AI organises it into phases.

- Phase marker appears as a calm label on the path: "Phase 1 — Getting started"
- Only Phase 1 steps are fully visible and active
- Phase 2 and beyond appear as a faded path continuation
- Phase 2 unlocks automatically after Phase 1 is complete
- No announcement — the path simply opens up

---

## 7. Focus Timer Screen

Triggered when user taps "Begin this step".
Full screen. Calm. No pressure.

### Layout

- Step instruction visible at the top
- Ambient fill animation — the screen background gradually and softly fills with a calm colour as time passes
- No clock. No countdown. No numbers.
- Progress is felt, not measured.
- Single button at the bottom: "I've done this"
- Quiet link: "I need to stop" (small, unobtrusive)

### Timeout and Fallback Logic

```
0–10s    → "Building your path..."
10–20s   → "Still thinking... your goal is a good one."
20s      → Edge Function assumed unreachable
         → Local fallback steps generated on device
         → Journey Path loads with fallback steps
         → No error shown to user under any circumstance
```

Local fallback logic must exist as client-side code. It cannot rely on network or Edge Function availability. See Section 15 for implementation.

### Completing a Step

User taps "I've done this":
- Current step marked as complete in Supabase
- Brief calm AI acknowledgement (one line, no hype): "Good. One step closer."
- Returns to Journey Path with next step now active
- If all steps complete → navigates to Home (State C)

### Stopping Mid-Step

User taps "I need to stop":
- Opens AI companion chat panel
- User can explain what happened
- AI responds with options — rest, shrink the step, come back later
- Progress is never lost
- No shame, no pressure to continue

---

## 8. AI Companion

A persistent conversational interface available throughout the entire app after onboarding. Always present. Never intrusive.

### Appearance

- Plain chat bubble icon, bottom right corner
- Visible on: Home, Journey Path, Focus Timer, Settings
- Hidden during: Onboarding, Pre-task mood check, Sign up flow
- Tapping opens a slide-up chat panel (250–350ms, linear ease)
- Panel sits over current screen — context remains visible
- Closes by swiping down or tapping outside

### First Appearance

When the user reaches Home for the first time after onboarding, the companion sends one introductory message:

> "Hey [name], I'm here whenever you need me. Just tap here if you get stuck or want to talk through anything."

After this, the bubble is silent unless tapped or triggered.

### How It Works

The companion already knows:
- The user's name
- Their current task and which step they are on
- Their mood score for this session
- Their history of completed steps

The user types naturally — no buttons, no categories:
- "I don't understand step 3"
- "This feels too hard"
- "Can you explain this like I'm 5"
- "Break this down further"
- "I'm stuck"
- "What does this even mean"
- "I want to approach this differently"

The AI reads the message, understands the full context, and responds with exactly what the user needs — clarification, a smaller action, a reframe, or simply a calm acknowledgement that they're doing fine.

The companion can:
- Explain a step in simpler terms
- Break a step into an even smaller first action
- Suggest a different approach to the same step
- Reassure the user without pressure or hype
- Adapt the path if the user's situation has changed

### Companion Tone

- Steady and human — like a trusted friend who knows your work
- Never clinical, never a cheerleader
- No exclamation marks
- No urgency language
- Always addresses user by name in the UI (name stripped before reaching Deepseek API)
- Never implies the user has failed, is behind, or is doing it wrong

### Companion Pulse Triggers

The bubble gains a gentle pulse animation (never intrusive) when:
- User has been on the same step longer than expected (2x estimated step time — see Section 15)
- User returns after inactivity
- A step is just completed (brief, then stops)

The pulse is a soft invitation. Never a demand.

---

## 9. Settings Screen

Accessible via the Settings tab in bottom navigation.
Minimal. Only what is necessary.

### Sections

**Profile**
- Name (editable — updates AsyncStorage and Supabase if signed in)

**Notifications**
- Toggle: Enable / disable
- Quiet hours: 10pm – 8am (fixed in v1.0)
  - Note: Fixed quiet hours is a known limitation for shift workers and night-owl users. Editable quiet hours is planned for v1.1.
- Max 2 notifications per day (system enforced, not shown to user)
- Notification style: gentle nudges only
  - "Ready to continue, [name]?"
  - "Your path is waiting."

**Account**
- Guest state: "Save your progress" → triggers sign up flow
- Signed in state: Email shown, "Sign out" option

**About**
- App version
- Link to privacy policy

---

## 10. Save Progress — Sign Up Screen

### When It Triggers

- After the user completes their first task (primary trigger — natural high point, highest conversion likelihood)
- Returns after 7+ days of inactivity
- Taps "Save your progress" in Settings

### Purpose

Protect the user's journey by creating an account.
Only shown after the user has invested enough to care.

### Screen Content

The companion delivers the message — not a system alert:

> "Want to pick up from here next time, [name]? Create an account and your progress is always waiting."

- Button: "Save my progress" → sign up flow
- Link: "Not now" → continues as guest

"Not now" never implies progress will be lost.
AsyncStorage persists until app uninstall.
No manufactured urgency. Ever.

### Guest Experience Ceiling

After 1 completed task, the sign up screen is shown once, clearly and warmly. If the user dismisses it, they continue as a guest with no further forced interruptions — only gentle Settings nudges.

If a guest user's device is lost or app is uninstalled, their data cannot be recovered. This is acknowledged as a known trade-off of the guest model. The app never communicates this as a threat or warning.

### Sign Up Options

- **Continue with Google** (primary, prominent)
- **Use email instead** (secondary, smaller)

On success:
- AsyncStorage data migrated to Supabase seamlessly
- User never loses current step or task
- Companion confirms: "You're all set, [name]. Your progress is saved."

### Sign Up Flow (Email)

- Email input
- Password input
- Button: "Create my account"
- No social login in v1.0

---

## 11. Notification Strategy

Max 2 notifications per day.
No delivery between 10pm and 8am.
Frequency reduces automatically if ignored repeatedly.

### Notification Types (priority order)

1. **Near completion nudge** — "You're close, [name]. One more step."
2. **Recovery nudge** (after inactivity) — "Your path is still here whenever you're ready."
3. **Mid-task nudge** — "Ready to continue, [name]?"

### Notification Rules
- No urgency language
- No guilt framing
- Always optional — user can disable in Settings
- Never sent during quiet hours

---

## 12. Full Screen Map

```
App Opens
│
├── First time
│     └── Onboarding
│           Welcome 1 → Welcome 2 → Welcome 3 → Name → Mood
│           → Home (State A)
│
└── Returning
      └── Home
            │
            ├── No active task (State A)
            │     → Goal input
            │     → Pre-task mood check (from task 2+; onboarding mood reused for first task)
            │     → "Building your path..."
            │     → Journey Path (Journey tab)
            │           │
            │           └── Tap active step
            │                 → Focus Timer
            │                       │
            │                       ├── "I've done this"
            │                       │     → Next step unlocks
            │                       │     → All done → Home (State C)
            │                       │
            │                       └── "I need to stop"
            │                             → AI Companion chat
            │
            ├── Active task (State B)
            │     → "Continue" → Journey Path
            │
            └── Task complete (State C)
                  → "Start something new" → State A
                  → "Rest for now" → Holding screen
```

---

## 13. AI Companion Availability Map

| Screen | Companion Visible | Companion Active |
|---|---|---|
| Onboarding | No | No |
| Pre-task mood check | No | No |
| Home (all states) | Yes | On tap |
| Journey Path | Yes | On tap + pulse triggers |
| Focus Timer | Yes | On "I need to stop" |
| Settings | Yes | On tap |
| Sign Up | No | Delivers message only |

---

## 14. Out of Scope for v1.0

- Manual task editing UI (companion handles this conversationally)
- Dark mode (light theme only)
- Social features
- Gamification or streaks
- Analytics dashboard
- Multiple active tasks simultaneously

---

## 15. Key Technical Notes for Builders

### Name Handling
Name is stored in AsyncStorage and rendered locally in UI only. It is never passed to the Deepseek API.

### Mood Collection Strategy
- Onboarding mood → stored in AsyncStorage → used for first greeting tone AND first task step sizing
- Pre-task mood (2nd task onwards) → collected fresh → passed to Edge Function → used for step sizing only
- Mood is never stored permanently — it is session-scoped

### AI Text Safety
All AI text passes through tone_safety_scan middleware before reaching the UI. No exceptions.

### Task Breakdown Architecture
Task breakdown happens in a Supabase Edge Function. The mobile client sends the goal and mood score and receives structured steps. No AI logic runs on the client.

### AsyncStorage and Supabase Roles
- AsyncStorage is the source of truth for guest users
- Supabase is the source of truth for authenticated users
- On sign up, AsyncStorage data migrates to Supabase

### Focus Timer Implementation
Focus timer uses ambient fill animation only. No clock, no countdown, no numbers.

### Companion Pulse Threshold
The companion bubble pulses when the user has spent 2x the estimated step time on the current step. Example: step estimated at 5 minutes → pulse triggers at 10 minutes. This is calculated client-side using a timer started when the step is first opened.

### Local Fallback Steps
Client must contain a deterministic fallback function that generates 3 calm steps when the Edge Function is unreachable. This function runs entirely offline with no API calls. It uses the task title from local state only.

```typescript
function generateLocalFallback(task_title: string) {
  return [
    {
      step_order: 1,
      title: `Open ${task_title}`,
      instruction: `Open whatever you need to work on for ${task_title}`,
      estimated_minutes: 2,
    },
    {
      step_order: 2,
      title: "Do the first thing",
      instruction: "Do the smallest possible first action you can think of",
      estimated_minutes: 5,
    },
    {
      step_order: 3,
      title: "Keep going",
      instruction: "Do the next obvious thing from where you are",
      estimated_minutes: 5,
    },
  ]
}
```

### Google Auth
- Implemented via Supabase Auth (Google OAuth)
- On first Google sign in → create profile in Supabase
- On returning Google sign in → fetch existing profile
- AsyncStorage guest data migrated on first sign in

### Navigation Rules
Bottom navigation is hidden during onboarding, focus timer, and sign up flow.
