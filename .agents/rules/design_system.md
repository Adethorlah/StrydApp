# STRYD — Design System
Version 3.2 · June 2026 · Confidential

This document defines the visual architecture, interaction constraints, and accessibility rules of STRYD 3.2.

STRYD is not a traditional productivity application. It is a **digitally synthesized focus environment engineered specifically to eliminate starting friction and cognitive resistance.**

---

## 1. Design Philosophy

The entire STRYD visual landscape is guided by one non-negotiable metric: **cognitive friction minimization.**

The interface must behave as a passive, stabilizing force.

- **Calm Over Engagement:** Design for rapid exit into physical execution, not "stickiness" or prolonged screen time.
- **Structure Over Complexity:** Minimal density. Generous negative space. Clear visual landmarks.
- **Intentionality Over Delight:** No decorative ornaments, unprompted micro-interactions, or unpredictable state shifts.
- **Non-Demanding Stance:** Absolutely no urgency markers, performance pressure telemetry, or gamified feedback.

**Allowed feedback:** Neutral status logs, subtle completion text, structured reflection interfaces.
**Disallowed feedback:** Confetti bursts, celebratory sounds, point totals, streak metrics, exclamation marks, congratulatory text.

---

## 2. Visual Language & Density

The system enforces an ultra-low visual input model. **Less visual noise = more cognitive clarity.**

- **Soft Contrast Strategy:** Text and component boundaries use softened contrast thresholds to eliminate optic fatigue.
- **Muted Saturation:** Core canvas states operate in near-monochromatic color windows.
- **Spacious Structural Padding:** Layouts use isolated, exaggerated margins to frame single pieces of actionable data.

---

## 3. Color System (HSL-Based Core Tokens)

STRYD relies exclusively on **explicit HSL (Hue, Saturation, Lightness) color matrices** to enable consistent rendering across platforms.

### Primary Brand Hue: `H = 239`

### Light Theme (only — no dark mode)

| Token | HSL Value | Intent |
|---|---|---|
| `primary` | `hsl(239, 84%, 67%)` | Key interactive and accent elements |
| `onPrimary` | `hsl(0, 0%, 100%)` | Text and icons on primary backgrounds |
| `primaryContainer` | `hsl(254, 100%, 97%)` | Subtle primary-toned containers |
| `onPrimaryContainer` | `hsl(240, 61%, 46%)` | Text on primary containers |
| `secondary` | `hsl(221, 30%, 41%)` | Supporting interactive elements |
| `onSecondary` | `hsl(0, 0%, 100%)` | Text on secondary backgrounds |
| `tertiary` | `hsl(173, 26%, 32%)` | Contrast accent for balanced variety |
| `error` | `hsl(10, 76%, 39%)` | Error states and destructive actions |
| `success` | `hsl(150, 100%, 21%)` | Completion and confirmation markers |
| `warning` | `hsl(36, 100%, 27%)` | Caution indicators |
| `background` | `hsl(257, 100%, 99%)` | Root canvas |
| `onBackground` | `hsl(231, 12%, 12%)` | Primary text on background |
| `surface` | `hsl(257, 100%, 99%)` | Card and sheet surfaces |
| `onSurface` | `hsl(231, 7%, 20%)` | Text on surface |
| `surfaceVariant` | `hsl(0, 9%, 96%)` | Slightly offset surface |
| `outline` | `hsl(0, 1%, 78%)` | Borders and dividers |
| `outlineVariant` | `hsl(0, 2%, 91%)` | Subtle borders |

### Token usage in code:

```typescript
// src/theme/tokens.ts
export const theme = {
  colors: {
    primary: "hsl(239, 84%, 67%)",
    background: "hsl(257, 100%, 99%)",
    surface: "hsl(257, 100%, 99%)",
    // ... full reference in tokens.ts
  },
  typography: {
    fontFamily: "Outfit",
    // ...
  },
}
```

---

## 4. Typography

- **Font Family:** **Outfit** — loaded via `@expo-google-fonts/outfit`. Uses `useAppFonts` hook for async loading at app bootstrap.
- **Weight Hierarchy:** Three variants only — `Regular (400)`, `Medium (500)`, `Semi-Bold (600)`. No bold weights above 600 (eliminates visual "shouting").
- **Mobile Scale (only):**

| Token | Size | Line Height | Letter Spacing | Usage |
|---|---|---|---|---|
| `title` | 25px | 37.5px | -0.4px | Hero focus display, task titles |
| `body large` | 20px | 30px | -0.2px | Emphasised body, section headers |
| `body medium` | 16px | 24px | -0.2px | Core body text, step instructions |
| `body small` | 14px | 21px | -0.2px | Secondary descriptions |
| `label medium` | 12px | 18px | -0.1px | Button labels, badges |
| `label small` | 11px | 16.5px | -0.1px | Meta timestamps, counters |

> Display (64px, 48px) and Headline (36px, 32px) sizes exist in the token source for potential landing page use but are **not used** in the mobile app.

---

## 5. Layout & Spatial Architecture

Layouts map across a rigid, highly predictable structural matrix.

- **Single-Column Principle:** All layouts parse vertically in one stream. No split interfaces, side-by-side grids, or multi-column feeds.
- **One Decision Paradigm:** Every screen presents exactly one clear next step. No nested menus or optional secondary forks.
- **Progressive Disclosures Rule:** During execution, the user sees precisely one item at a time. The overall task list remains hidden behind atomic step changes.

### Spacing Scale

| Token | Pixels |
|---|---|
| `xs` | 4px |
| `sm` | 8px |
| `md` | 16px |
| `lg` | 24px |
| `xl` | 32px |

### Border Radius

| Token | Pixels |
|---|---|
| `sm` | 4px |
| `md` | 8px |
| `lg` | 12px |
| `xl` | 16px |
| `full` | 9999px (pill) |

---

## 6. Component Specification

Components are pure presentational containers — stateless templates with zero embedded business logic.

### 6.1 `MicroStepCard`
- **Presentation:** Spacious surface holding a single step description, sequence indicator, and toggle state.
- **Colors:** `surface` background, `onSurface` text, `primary` accent for sequence number.
- **Behavior:** On tap, immediate local completion animation with optimistic state update before syncing to the hook layer.

### 6.2 `SessionTimer`
- **Presentation:** Stripped numeric clock displaying elapsed/remaining focus time.
- **Font:** Outfit `body large` (20px), monospace-aligned to prevent layout vibration.
- **Constraints:** No countdown circles or shrinking progress lines.

### 6.3 `ActionButton`
- **Presentation:** High-contrast tap target with explicit verb commands (`"Open Workspace"`, `"Commit"`).
- **Colors:** `primary` fill, `onPrimary` text. Disabled state uses `surfaceVariant` with `onSurfaceVariant` text.
- **Constraints:** Solid fill or transparent border only. No gradients, heavy shadows, or bounce animations.

---

## 7. Interaction & Motion System

Motion exists exclusively to communicate state transitions — never for entertainment.

- **Velocity Boundary:** All transitions use linear ease timings between **250ms and 350ms**. No sudden pops or hyper-accelerated jumps.
- **Anti-Bounce Mandate:** Spring physics, elastic curves, and bounce movements are strictly banned (they introduce subtle visual erraticism that triggers micro-anxiety).
- **Non-Interruption:** Loading states do not freeze the screen with spinners. State updates optimistically so the user moves to the next step uninterrupted.

---

## 8. Focus Environment Rules

When a `focus_session` activates, the mobile interface enters a deep lockout phase:

1. **Global Navigation Stripping:** Tab bars, profile entries, and back buttons are removed. The user cannot wander into setup menus.
2. **Context Erasure:** Everything except the current micro-step text is hidden.
3. **Ambient Background:** The surface shifts to its lowest lightness setting — a dark, distraction-free canvas.

---

## 9. Accessibility Governance (WCAG POUR)

The interface must remain accessible to users in high-stress, low-attention, or cognitive fatigue states.

### 9.1 Perceivable
- **Dynamic Type:** All text layout uses relative units. Adapts automatically to system font scaling changes.
- **Contrast:** Enforces **WCAG AA compliance at minimum — 4.5:1 contrast ratio** across all active modes.
- **Dual-Channel Encoding:** Color is never the sole signifier of state. Error/completion must also change typography or icon markers.

### 9.2 Operable
- **Touch Targets:** Minimum **44 x 44 density-independent pixels (dp)** for all interactive components.
- **Gesture Constraints:** No multi-finger inputs, swipe paths, or long-press dependencies. Simple taps only.

### 9.3 Understandable
- **State Predictability:** Modals or orientation changes never occur unless triggered by a user tap.
- **Error Prevention:** Forms use progressive disclosure so validation errors never overwhelm the view.

### 9.4 Robust
- **Platform Invariance:** Style definitions map uniformly across iOS and Android without different placement rules.

---

## 10. The Golden Rule

> **If the user is forced to think about the application interface, the design has failed.**

The objective of the STRYD design system is to dissolve into the background, leaving zero cognitive obstacles between intention and execution.
