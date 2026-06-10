---
trigger: always_on
---

# STRYD — Security Policy
Version 3.2 · June 2026 · Confidential

At STRYD, security is not an administrative add-on. It is a strict system constraint designed to protect both the digital integrity of user data and the emotional stability of the user environment.

This document defines the protocols governing data insulation, identity verification, AI transport boundaries, and behavioral safety middleware for STRYD 3.2.

---

## 1. Security Philosophy

STRYD implements a strict **Privacy by Design** methodology. Every data pipeline, architecture component, and system interaction is audited against a single defensive question:

> **Does this operation introduce unnecessary exposure to user data, behavioral metrics, or cognitive vulnerabilities?**

### Core Invariants:
- **Absolute User Ownership:** Users maintain absolute rights over their behavioral history, intentions, and tracking logs. Data cannot be shared, cross-referenced, or analyzed for external systems.
- **Zero-Exposure Data Minimization:** The system requests, processes, and persists only the minimum data fields mathematically required to execute an atomic micro-step.
- **No Behavioral Exploitation:** STRYD completely outlaws profiling logic geared toward monetization, commercial advertising telemetry, or algorithmic user retention manipulation.
- **Radical Transparency:** The client runtime uses no background tracking modules, hidden analytic beacons, or unlogged data synchronization lines.

---

## 2. Distributed Data Protection Model

STRYD isolates risks by decoupling the presentation layer from the database through secure serverless gateways.

```
Mobile Client (Expo)
  ├─ SecureStore (Keychain / Keystore) -> JWT tokens, refresh strings
  └─ AsyncStorage (TanStack Query cache) -> offline tasks, step text
        │
        │  HTTPS / TLS 1.3
        ▼
Supabase Edge Gateways
  ├─ Validates JWT on every request
  ├─ Enforces Row Level Security via auth.uid()
  └─ Routes to internal virtual network
        │
        ▼
Supabase PostgreSQL
  ├─ auth schema -> identity ring-fenced
  └─ public schema -> tasks, steps, sessions (RLS-scoped)
```

### 2.1 Database Separation & Isolation (Supabase)
- **Database Access Invariant:** The mobile app is physically barred from initiating direct PostgreSQL socket links. Communication is restricted to standard HTTPS/WSS channels managed by the official `@supabase/supabase-js` SDK gateway.
- **Hardware Row Level Security (RLS):** RLS is universally active across all database tables. Every database query implicitly checks the verified `auth.uid()` from the inbound user JWT. Cross-tenant data leaks are structurally impossible at the database engine level.
- **Multi-Schema Access Controls:** Database migrations segregate system configurations from operational data spaces. The `public` schema containing tasks, steps, and sessions is tightly bound, while user identity variables are completely ring-fenced inside Supabase's internal `auth` schema.

### 2.2 Device-Side Storage & Session Protection
To balance local responsiveness with reliable encryption, the mobile client separates its storage layer into two distinct hardware frameworks:

- **Sensitive Data Cryptography (`Expo.SecureStore`):** User JWT access tokens, long-lived refresh strings, and identity profiles are stored exclusively via hardware-backed encryption. On iOS, this utilizes the **Keychain services API**. On Android, data is locked via the **Android Keystore system**. This encrypts sensitive keys at the chip level, isolating them from other applications on the operating system.
- **Non-Sensitive Application Cache (`AsyncStorage`):** Offline tasks, micro-step texts, and session layout properties are cached inside application-scoped storage handled through TanStack Query to support instantaneous, optimistic UI redrawing.

### 2.3 Network Transport Layer
- All operational traffic traveling between the Expo Mobile Client, Supabase Edge Functions, and the database engine requires **HTTPS / TLS 1.3** protection. Low-grade cipher suites or unencrypted HTTP lines are immediately dropped by gateway configurations.
- Edge Functions enforce **rate limiting** to prevent abuse. Requests exceeding 100 per minute per user are throttled with a 429 response.

---

## 3. AI Isolation & Data Privacy Boundaries

STRYD uses artificial intelligence strictly as a **stateless, real-time data transformation layer.** The AI has no capacity to store, remember, or cross-analyze user behavioral characteristics over time.

### 3.1 Orchestration Boundaries (Supabase Edge Functions)
- **Isolated Serverless Environments:** All AI agent code runs inside serverless, containerized Supabase Edge Functions. The mobile client never contains or transmits Deepseek API keys directly.
- **Zero PII Leakage:** Before any content passes to the AI model, fields are stripped of Personal Identifiable Information (PII). No names, email strings, geographical locations, or device identifiers are ever passed to the generation pipeline.
- **Targeted Context Injection Only:** The AI model operates within a stateless request-response window. It is supplied exclusively with the active `task_title`, `task_description`, user `mood_score`, and `available_minutes`. It has zero visibility into historical logs, aggregate performance metrics, or other tables.

### 3.2 Engine Governance
- Core orchestration layers leverage the **Deepseek (V3/R1)** infrastructure API. All integration profiles are explicitly set to **Zero Data Retention** — guaranteeing that input prompt strings are never stored for model fine-tuning, training passes, or provider-side log indexing. This is contractually enforced, not optional.

---

## 4. Vulnerability Disclosure Workflow

We maintain a proactive stance toward defensive security engineering and coordinate closely with security researchers to address vulnerabilities before public release.

### 4.1 Reporting Process
1. Vulnerability discoveries must **never** be posted to public GitHub issue trackers or community message boards.
2. Reports must be emailed directly to: **security@stryd.app** (Secure Operational Placeholder). For sensitive findings, encrypt with our PGP key (fingerprint: `E4A9 C2F8 1B3D 7A00 9F1C  6D2E 8B45 F731 9C02 4DA7`).
3. Inbound briefs must include:
   - A descriptive overview of the detected vulnerability vector.
   - Sequential, reproducible code steps or request payloads.
   - An estimation of the potential payload impact framework.

### 4.2 SLA Assessment Matrix
- **Initial Verification Response:** Within **48 hours** of email receipt.
- **Technical Validation Assessment:** Within **5 business days** following verification.
- **Deployment & Patch Dissemination:** Remediation timelines are communicated immediately to the discovering party upon verification, prioritizing immediate patching cycles.

---

## 5. Behavioral & Tone Security (System Integrity Middleware)

STRYD treats the user's psychological and emotional state as a core security boundary. Language that triggers avoidance loops, shame responses, or performance anxiety is classified as a **system failure.**

### 5.1 The Automated Tone Safety Sanitizer
All text strings generated by Deepseek-V3 or Deepseek-R1 are interceptively filtered through an automated programmatic sanitization middleware inside the Edge Function runtime before being written to the database or transmitted to the mobile user interface.

### 5.2 Pattern Enforcement
The middleware scans text objects against forbidden language vectors, dynamically mutating text variations to non-threatening equivalent terms:

```typescript
// supabase/functions/_shared/toneSafety.ts

const BLOCKED_PATTERNS: [RegExp, string][] = [
  [/!/g, '.'],                                       // High-arousal punctuation
  [/\b(must|should|have to|need to|ought to)\b/gi, 'can'],  // Coercive imperatives
  [/\b(fail|failed|failure|dropped)\b/gi, 'uncompleted session'],  // Shame language
  [/\b(lazy|procrastinat\w*|slacking)\b/gi, ''],     // Judgment labels (remove)
  [/\b(behind|overdue)\b/gi, 'remaining'],           // Urgency language
  [/[A-Z]{3,}/g, (m: string) => m.toLowerCase()],    // ALL CAPS -> lowercase
]

export function runToneSafety(text: string): string {
  return BLOCKED_PATTERNS.reduce((acc, [pattern, replacement]) => {
    return acc.replace(pattern, replacement as string)
  }, text).trim()
}
```

### 5.3 Fail-Safe Behavior Fallback
If the text normalization phase fails or encounters an unparseable structural anomaly, the Edge Function triggers a deterministic local fallback. The engine bypasses the broken AI output entirely and generates task-specific fallback steps:

```typescript
// supabase/functions/_shared/fallback.ts
export function generateSafeFallbackSteps(task_title: string): SafeBreakdownResponse {
  return {
    steps: [
      { step_order: 1, title: "Open the task",
        instruction: `Open whatever you need to work on ${task_title}`,
        estimated_minutes: 2 },
      { step_order: 2, title: "Do the first thing",
        instruction: "Do the smallest possible first action you can think of",
        estimated_minutes: 5 },
      { step_order: 3, title: "Keep going",
        instruction: "Do the next obvious thing from where you are",
        estimated_minutes: 5 }
    ],
    total_estimated_minutes: 12,
    phase_label: "Getting started"
  }
}
```

---

## 6. System Boundary Invariant

No component within the STRYD engineering landscape is permitted to induce cognitive load, generate artificial urgency, or employ manipulative linguistic feedback mechanics.

Data validation is inextricably bound to psychological safety; safeguarding the user's focus environment is handled with the same rigor as securing our network endpoints.
