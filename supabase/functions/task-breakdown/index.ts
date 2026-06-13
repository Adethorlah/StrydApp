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

// --- Fallback Steps ---

function generateFallbackSteps(taskTitle: string) {
  return {
    is_multi_phase: false,
    total_estimated_minutes: 15,
    steps: [
      {
        step_order: 1,
        title: "Get ready to start",
        instruction: `Clear your space and open everything you need for: ${taskTitle}`,
        estimated_minutes: 2,
      },
      {
        step_order: 2,
        title: "Do the first small piece",
        instruction: `Pick the smallest part of "${taskTitle}" and work on just that for 5 minutes`,
        estimated_minutes: 5,
      },
      {
        step_order: 3,
        title: "Keep the momentum going",
        instruction: `Continue with the next part of "${taskTitle}" until you feel done`,
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
    const { task_title, task_description, mood_score, available_minutes } = await req.json()

    if (!task_title || mood_score === undefined) {
      return new Response(
        JSON.stringify(generateFallbackSteps(task_title ?? "your task")),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Step 1: Determine complexity
    const complexityResponse = await fetch(DEEPSEEK_API_URL, {
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
            content: `You determine if a task needs a single phase or multiple phases.

Single-phase indicators:
- Can be completed in one sitting
- Has a clear, singular output

Multi-phase indicators:
- Requires multiple distinct stages of work
- Output of one stage feeds the next
- Would feel overwhelming as a flat list

Respond with JSON only: { "is_multi_phase": boolean, "reasoning": "brief explanation" }`,
          },
          {
            role: "user",
            content: `Task: ${task_title}${task_description ? `\nDescription: ${task_description}` : ""}`,
          },
        ],
        max_tokens: 200,
        temperature: 0.3,
        response_format: { type: "json_object" },
      }),
    })

    const complexityData = await complexityResponse.json()
    const complexity = JSON.parse(complexityData.choices?.[0]?.message?.content ?? '{"is_multi_phase": false}')

    // Step 2: Determine step sizing from mood
    let stepSize: string
    let firstStepRule: string

    if (mood_score <= 2) {
      stepSize = "2-3 minutes per step"
      firstStepRule = "The first step must be trivially easy to start — something the user can do in under 30 seconds."
    } else if (mood_score === 3) {
      stepSize = "5-7 minutes per step"
      firstStepRule = "Standard sizing."
    } else {
      stepSize = "up to 10 minutes per step"
      firstStepRule = "Steps can be more substantial."
    }

    const timeContext = available_minutes
      ? `The user has ${available_minutes} minutes available. Size the steps to fit within this time.`
      : ""

    // Step 3: Generate the path
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
            content: `You generate step-by-step task breakdowns for STRYD, a calm focus app.

STRICT RULES:
- Every step must be specific to this exact goal — generic steps are a system failure
- Every step must pass the 30-second start test: the user can begin within 30 seconds of reading it
- Every step must have a clear definition of done
- Steps describe scope and outcome only — never tell the user how to use specific tools or software
- Never reference specific software by name
- Never tell users how to perform skills they already have
- Each step must feel like it was written for this exact user and this exact goal
- Step sizing: ${stepSize}
- ${firstStepRule}
- ${timeContext}

${complexity.is_multi_phase ? `This task needs multiple phases.
Phase labels must describe purpose, not sequence. Examples:
- "Get the thinking clear" not "Phase 1"
- "Build the content" not "Phase 2"
- "Review and close" not "Phase 4"

Output format (strict JSON only, no markdown, no preamble):
{
  "is_multi_phase": true,
  "total_estimated_minutes": number,
  "phases": [
    {
      "phase_order": 1,
      "phase_label": "purpose-driven label",
      "steps": [
        {
          "step_order": 1,
          "title": "short action label",
          "instruction": "one clear sentence describing scope and outcome",
          "estimated_minutes": number
        }
      ]
    }
  ]
}` : `This task needs a single phase.

Output format (strict JSON only, no markdown, no preamble):
{
  "is_multi_phase": false,
  "total_estimated_minutes": number,
  "steps": [
    {
      "step_order": 1,
      "title": "short action label",
      "instruction": "one clear sentence describing scope and outcome",
      "estimated_minutes": number
    }
  ]
}`}`,
          },
          {
            role: "user",
            content: `Task: ${task_title}${task_description ? `\nDescription: ${task_description}` : ""}`,
          },
        ],
        max_tokens: 800,
        temperature: 0.3,
        response_format: { type: "json_object" },
      }),
    })

    const pathData = await pathResponse.json()
    const rawContent = pathData.choices?.[0]?.message?.content ?? ""
    const result = JSON.parse(rawContent)

    // Step 4: Run tone safety on every step title and instruction
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