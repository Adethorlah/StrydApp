import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { scanAndRepairText } from "../_shared/toneSafety.ts"
import { AgentInput, SafeBreakdownResponse } from "../_shared/types.ts"

const DEEPSEEK_API_KEY = Deno.env.get("DEEPSEEK_API_KEY")
const DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

const FALLBACK_RESPONSES = {
  step: "Open the work and take a look at where you are.",
}

type TaskCategory = "creative" | "learning" | "technical" | "administrative" | "general"

function classifyTaskCategory(title: string): TaskCategory {
  const lower = title.toLowerCase()
  const categories: Record<string, string[]> = {
    creative: ["design", "create", "write", "draw", "paint", "compose", "sketch", "illustrate", "brand", "logo", "campaign", "content", "script", "video", "edit", "strategy", "marketing"],
    learning: ["learn", "study", "practice", "understand", "master", "improve", "tutorial", "course", "skill", "instrument", "guitar", "drums", "piano", "language"],
    technical: ["code", "program", "debug", "refactor", "migrate", "deploy", "configure", "integrate", "api", "database", "server", "frontend", "backend", "feature", "system", "architecture", "engineer", "implement", "build"],
    administrative: ["organize", "clean", "sort", "schedule", "arrange", "prepare", "file", "tidy", "declutter", "pack", "budget", "pay", "bill", "tax", "email", "inbox", "groceries", "shopping", "laundry", "paperwork"],
  }
  let bestCategory: TaskCategory = "general"
  let bestScore = 0
  for (const [category, words] of Object.entries(categories)) {
    const score = words.reduce((count, word) => count + (lower.includes(word) ? 1 : 0), 0)
    if (score > bestScore) {
      bestScore = score
      bestCategory = category as TaskCategory
    }
  }
  return bestCategory
}

const CATEGORY_RULES: Record<string, string> = {
  creative: `Category: Creative, Design, or Strategy (Friction = Infinite Possibilities)\n- First step must force a strict constraint to eliminate blank-canvas paralysis\n- Focus on hierarchy and decision-making, not asset creation`,
  learning: `Category: Learning a Skill or Instrument (Friction = Cognitive Overload)\n- Eliminate "researching" loops — force a single commitment to a resource or method immediately\n- Define a clear, tangible threshold for "done"`,
  technical: `Category: Technical, Engineering, or Logic (Friction = Dependency Entanglement)\n- Enforce strict linear dependency logic\n- Make the first building step a trivial "happy path" end-to-end test`,
  administrative: `Category: Administrative, Execution, or Sorting (Friction = Low Momentum)\n- Focus on categorization or a high-momentum starting point\n- Use time-boxing constraints rather than output constraints`,
  general: `Category: General Purpose\n- Focus on the single decision or action that creates the most momentum\n- Eliminate busywork disguised as progress`,
}

function generateFallbackSteps(taskTitle: string): SafeBreakdownResponse {
  return {
    is_multi_phase: false,
    total_estimated_minutes: 15,
    steps: [
      { step_order: 1, title: "Identify the next action", instruction: `Name the single thing you can do in the next 2 minutes for: ${taskTitle}`, estimated_minutes: 2 },
      { step_order: 2, title: "Complete that action", instruction: "Do it without judging the outcome — just get it done", estimated_minutes: 5 },
      { step_order: 3, title: "Decide what comes next", instruction: "One step is done. Decide whether to continue or stop here. Either is fine.", estimated_minutes: 8 },
    ],
  }
}

function getEnergyContext(mood_score: number): string {
  return mood_score <= 2 ? "Low — prioritize small wins, minimize cognitive load, keep steps very short" 
       : mood_score >= 4 ? "High — ready for substantial work, steps can be more demanding" 
       : "Moderate — standard pacing"
}

function buildPrompt(input: AgentInput): string {
  if (!input.task_title) throw new Error('task_title is required')
  if (!input.mood_score) throw new Error('mood_score is required')
  if (!input.available_minutes) throw new Error('available_minutes is required')

  const category = classifyTaskCategory(input.task_title)
  const categoryRules = CATEGORY_RULES[category]
  const energyContext = getEnergyContext(input.mood_score)

  return `You are an expert cognitive productivity engine. Break down a user's goal into highly actionable steps to eliminate mental friction.

### TASK DETAILS
Title: ${input.task_title}
Description: ${input.task_description || 'none provided'}

### CRITICAL RULES
1. NO MECHANICAL STEPS: Never include basic tool-setup or obvious physical actions.
2. NO GENERIC FLUFF: Avoid vague, low-value steps.
3. TARGET THE FRICTION: Every step must yield a specific decision, constraint, or draft.

### DOMAIN-SPECIFIC BEHAVIORAL RULES
${categoryRules}

### USER CONTEXT
- Energy level: ${energyContext}
- Available time: The user has ${input.available_minutes} minutes available. Size the steps to fit within this time.

### OUTPUT FORMAT (strict JSON only)
{
  "is_multi_phase": false,
  "total_estimated_minutes": number,
  "steps": [
    { "step_order": 1, "title": "short action label", "instruction": "one clear sentence", "estimated_minutes": number }
  ]
}`
}

async function callDeepseek(prompt: string): Promise<string> {
  const response = await fetch(DEEPSEEK_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [{ role: "system", content: prompt }],
      max_tokens: 1000,
      temperature: 0.3,
      response_format: { type: "json_object" },
    }),
  })
  const pathData = await response.json()
  return pathData.choices?.[0]?.message?.content ?? ""
}

async function runToneSafetyPass(result: SafeBreakdownResponse): Promise<void> {
  if (result.is_multi_phase && result.phases) {
    for (const phase of result.phases) {
      for (const step of phase.steps) {
        step.title = await scanAndRepairText(step.title, FALLBACK_RESPONSES.step)
        step.instruction = await scanAndRepairText(step.instruction, FALLBACK_RESPONSES.step)
      }
    }
  } else if (result.steps) {
    for (const step of result.steps) {
      step.title = await scanAndRepairText(step.title, FALLBACK_RESPONSES.step)
      step.instruction = await scanAndRepairText(step.instruction, FALLBACK_RESPONSES.step)
    }
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })

  try {
    const input: AgentInput = await req.json()
    const prompt = buildPrompt(input)
    const rawContent = await callDeepseek(prompt)
    const result: SafeBreakdownResponse = JSON.parse(rawContent)

    if (result.is_multi_phase && result.phases && !result.steps) result.steps = []
    if (!result.is_multi_phase && result.steps && !result.phases) result.phases = []

    await runToneSafetyPass(result)
    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } })

  } catch (error: unknown) {
    console.error("Task breakdown error:", error)
    return new Response(
      JSON.stringify(generateFallbackSteps("your task")),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})