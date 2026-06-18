import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const DEEPSEEK_API_KEY = Deno.env.get("DEEPSEEK_API_KEY")
const DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

// --- Tone Safety ---

interface ToneScanResult {
  is_safe: boolean
  flagged_items: string[]
}

const BLOCKED_WORDS = [
  "fail", "failure", "failed", "wrong", "bad", "stupid", "lazy",
  "late", "behind", "overdue", "must", "should", "productive",
  "procrastinat", "urgent", "disappointing", "pathetic", "weak",
  "worthless", "output", "efficiency",
]

const BLOCKED_PHRASES = [
  "you should have", "why haven't you", "you need to",
  "you failed to", "you still haven't", "you're behind",
  "you're late", "you didn't", "what's stopping you", "you're not",
]

function toneSafetyScan(text: string): ToneScanResult {
  const lower = text.toLowerCase()
  const flagged: string[] = []

  if (/!/.test(text)) flagged.push("exclamation mark")
  if (/[A-Z]{3,}/.test(text)) flagged.push("ALL CAPS")

  for (const word of BLOCKED_WORDS) {
    if (lower.includes(word)) flagged.push(word)
  }

  for (const phrase of BLOCKED_PHRASES) {
    if (lower.includes(phrase)) flagged.push(phrase)
  }

  const numericUrgency = /\d+\s*(days?|hours?|minutes?|weeks?)\s*(late|behind|overdue|left)/i
  if (numericUrgency.test(text)) flagged.push("numeric urgency")

  return { is_safe: flagged.length === 0, flagged_items: flagged }
}

const FALLBACK_RESPONSES = {
  step: "Open the work and take a look at where you are.",
}

const REPAIR_AGENT_PROMPT = `You are rewriting AI-generated text for STRYD, a calm focus app.

Rewrite the text so it:
- Removes all flagged items
- Keeps the same meaning and helpful intent
- Uses calm, direct, non-judgmental language
- Contains no exclamation marks
- Contains no urgency or pressure framing
- Sounds like a steady, trusted friend

Return rewritten text only. No explanation.`

async function repairText(text: string, flagged: string[]): Promise<string> {
  try {
    const response = await fetch(DEEPSEEK_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: REPAIR_AGENT_PROMPT },
          {
            role: "user",
            content: `Flagged items: ${flagged.join(", ")}\nOriginal text: ${text}`,
          },
        ],
        max_tokens: 300,
        temperature: 0.3,
      }),
    })
    const data = await response.json()
    return data.choices?.[0]?.message?.content ?? text
  } catch {
    return text
  }
}

async function scanAndRepairText(text: string): Promise<string> {
  const scan = toneSafetyScan(text)
  if (scan.is_safe) return text

  let repaired = await repairText(text, scan.flagged_items)
  const rescan = toneSafetyScan(repaired)

  if (!rescan.is_safe) {
    repaired = await repairText(repaired, rescan.flagged_items)
    const finalScan = toneSafetyScan(repaired)
    if (!finalScan.is_safe) return FALLBACK_RESPONSES.step
  }

  return repaired
}

// --- Category Classifier ---

function classifyTaskCategory(title: string): "creative" | "learning" | "technical" | "administrative" | "general" {
  const lower = title.toLowerCase()

  const categories: Record<string, string[]> = {
    creative: [
      "design", "create", "write", "draw", "paint", "compose",
      "sketch", "illustrate", "brand", "logo", "campaign", "content",
      "script", "video", "edit", "strategy", "marketing",
    ],
    learning: [
      "learn", "study", "practice", "understand", "master", "improve",
      "tutorial", "course", "skill", "instrument", "guitar", "drums",
      "piano", "language",
    ],
    technical: [
      "code", "program", "debug", "refactor", "migrate", "deploy",
      "configure", "integrate", "api", "database", "server",
      "frontend", "backend", "feature", "system", "architecture",
      "engineer", "implement", "build",
    ],
    administrative: [
      "organize", "clean", "sort", "schedule", "arrange",
      "prepare", "file", "tidy", "declutter", "pack",
      "budget", "pay", "bill", "tax", "email", "inbox",
      "groceries", "shopping", "laundry", "paperwork",
    ],
  }

  let bestCategory = "general" as const
  let bestScore = 0

  for (const [category, words] of Object.entries(categories)) {
    const score = words.reduce((count, word) => count + (lower.includes(word) ? 1 : 0), 0)
    if (score > bestScore) {
      bestScore = score
      bestCategory = category
    }
  }

  return bestCategory as "creative" | "learning" | "technical" | "administrative" | "general"
}

const CATEGORY_RULES: Record<string, string> = {
  creative: `Category: Creative, Design, or Strategy (Friction = Infinite Possibilities)
- First step must force a strict constraint to eliminate blank-canvas paralysis (e.g., defining a single action, constraint, or emotional tone)
- Focus on hierarchy and decision-making, not asset creation
- Enforce low-fidelity work before high-fidelity execution`,

  learning: `Category: Learning a Skill or Instrument (Friction = Cognitive Overload)
- Eliminate "researching" loops — force a single commitment to a resource or method immediately
- Isolate variables — break the skill into a micro-action (e.g., separating rhythm from speed, or isolating one element)
- Define a clear, tangible threshold for "done" using metrics like duration, tempo, or consistency`,

  technical: `Category: Technical, Engineering, or Logic (Friction = Dependency Entanglement)
- Enforce strict linear dependency logic — isolate the core logic before touching peripherals
- Make the first building step a trivial "happy path" end-to-end test`,

  administrative: `Category: Administrative, Execution, or Sorting (Friction = Low Momentum)
- Focus on categorization or a high-momentum starting point
- Use time-boxing constraints rather than output constraints (e.g., "sort for 10 minutes" not "sort the entire room")`,

  general: `Category: General Purpose
- Focus on the single decision or action that creates the most momentum
- Eliminate busywork disguised as progress
- Each step must produce a tangible, verifiable outcome`,
}

// --- Fallback Steps ---

function generateFallbackSteps(taskTitle: string) {
  return {
    is_multi_phase: false,
    total_estimated_minutes: 15,
    steps: [
      {
        step_order: 1,
        title: "Identify the next action",
        instruction: `Name the single thing you can do in the next 2 minutes for: ${taskTitle}`,
        estimated_minutes: 2,
      },
      {
        step_order: 2,
        title: "Complete that action",
        instruction: `Do it without judging the outcome — just get it done`,
        estimated_minutes: 5,
      },
      {
        step_order: 3,
        title: "Decide what comes next",
        instruction: `One step is done. Decide whether to continue or stop here. Either is fine.`,
        estimated_minutes: 8,
      },
    ],
  }
}

// --- Main Handler ---

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const { task_title, mood_score, available_minutes } = await req.json()

    if (!task_title || mood_score === undefined) {
      return new Response(
        JSON.stringify(generateFallbackSteps(task_title ?? "your task")),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Classify the task into a category
    const category = classifyTaskCategory(task_title)
    const categoryRules = CATEGORY_RULES[category]

    // Build mood and time context
    const energyContext = mood_score <= 2
      ? "Low — prioritize small wins, minimize cognitive load, keep steps very short"
      : mood_score >= 4
      ? "High — ready for substantial work, steps can be more demanding"
      : "Moderate — standard pacing"

    const timeContext = available_minutes
      ? `The user has ${available_minutes} minutes available. Size the steps to fit within this time.`
      : "Unspecified — size steps for a typical session"

    // Step 1: Generate the path (single DeepSeek call — no separate complexity router)
    const pathResponse = await fetch(DEEPSEEK_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          {
            role: "system",
            content: `You are an expert cognitive productivity engine. Your job is to break down a user's goal into 4-6 highly actionable steps designed to eliminate mental friction, executive dysfunction, and procrastination.

You do not write generic checklists; you act as a strategic thinking partner.

### CRITICAL RULES (THE "ANTI-INSULT" GUARDRAILS)
1. NO MECHANICAL STEPS: Never include basic tool-setup or obvious physical actions the user already knows how to do. (e.g., Never say "Open Figma," "Create a new document," "Turn on your computer," or "Pick up your drumsticks"). Assume the user is a competent adult who knows how to access their tools.
2. NO GENERIC FLUFF: Avoid vague, low-value steps that offer no direction. (e.g., Never say "Research competitors," "Practice hard," "Brainstorm ideas," or "Track your progress").
3. TARGET THE FRICTION: Focus entirely on the exact points where a person's brain gets stuck, paralyzed by options, or distracted. Every step must yield a specific decision, a constraint, or a concrete draft.

### DOMAIN-SPECIFIC BEHAVIORAL RULES
${categoryRules}

### USER CONTEXT
- Energy level: ${energyContext}
- Available time: ${timeContext}

### OUTPUT FORMAT (strict JSON only — no markdown, no preamble)
Determine whether this task needs a single phase (one sitting, clear output) or multiple phases (distinct stages, one feeds the next).

If multi-phase:
{
  "is_multi_phase": true,
  "total_estimated_minutes": number,
  "phases": [
    {
      "phase_order": 1,
      "phase_label": "purpose-driven label",
      "steps": [
        { "step_order": 1, "title": "short action label", "instruction": "one clear sentence describing scope and outcome", "estimated_minutes": number }
      ]
    }
  ],
  "steps": []
}

If single-phase:
{
  "is_multi_phase": false,
  "total_estimated_minutes": number,
  "steps": [
    { "step_order": 1, "title": "short action label", "instruction": "one clear sentence describing scope and outcome", "estimated_minutes": number }
  ]
}

Phase labels must describe purpose, not sequence (e.g., "Get the thinking clear" not "Phase 1").`,
          },
          {
            role: "user",
            content: `Task: ${task_title}`,
          },
        ],
        max_tokens: 1000,
        temperature: 0.3,
        response_format: { type: "json_object" },
      }),
    })

    const pathData = await pathResponse.json()
    const rawContent = pathData.choices?.[0]?.message?.content ?? ""
    const result = JSON.parse(rawContent)

    // Normalise: ensure all step arrays exist for the format the client expects
    if (result.is_multi_phase && result.phases && !result.steps) {
      result.steps = []
    }
    if (!result.is_multi_phase && result.steps && !result.phases) {
      result.phases = []
    }

    // Step 2: Run tone safety on every step title and instruction
    if (result.is_multi_phase && result.phases) {
      for (const phase of result.phases) {
        for (const step of phase.steps) {
          step.title = await scanAndRepairText(step.title)
          step.instruction = await scanAndRepairText(step.instruction)
        }
      }
    } else if (result.steps) {
      for (const step of result.steps) {
        step.title = await scanAndRepairText(step.title)
        step.instruction = await scanAndRepairText(step.instruction)
      }
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error"
    console.error("Task breakdown error:", message)
    return new Response(
      JSON.stringify(generateFallbackSteps("your task")),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})