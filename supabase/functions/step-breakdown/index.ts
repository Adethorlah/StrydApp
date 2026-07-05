import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { scanAndRepairText } from "../_shared/toneSafety.ts"

const DEEPSEEK_API_KEY = Deno.env.get("DEEPSEEK_API_KEY")
const DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

interface StepBreakdownInput {
  step_title: string
  step_instruction: string
  estimated_minutes: number
}

interface SubStep {
  step_order: number
  title: string
  instruction: string
  estimated_minutes: number
}

function buildPrompt(input: StepBreakdownInput): string {
  return `You are an expert at breaking down a single step into smaller, easier pieces.

Break this step into 2-3 smaller sub-steps that make it easier to start.

### STEP TO BREAK DOWN
Title: ${input.step_title}
Instruction: ${input.step_instruction}
Estimated time: ${input.estimated_minutes} minutes

### RULES
1. Each sub-step must be concrete and actionable
2. The first sub-step must be very easy to start (under 2 minutes)
3. Total estimated minutes of all sub-steps should roughly equal ${input.estimated_minutes} minutes
4. Return exactly 2 or 3 sub-steps

### OUTPUT FORMAT (strict JSON only)
{
  "sub_steps": [
    { "step_order": 1, "title": "short action label", "instruction": "one clear sentence", "estimated_minutes": number },
    { "step_order": 2, "title": "short action label", "instruction": "one clear sentence", "estimated_minutes": number }
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
      max_tokens: 800,
      temperature: 0.3,
      response_format: { type: "json_object" },
    }),
  })
  const pathData = await response.json()
  return pathData.choices?.[0]?.message?.content ?? ""
}

function generateFallbackSubSteps(input: StepBreakdownInput): { sub_steps: SubStep[] } {
  const half = Math.max(1, Math.floor(input.estimated_minutes / 2))
  return {
    sub_steps: [
      { step_order: 1, title: `Start ${input.step_title.toLowerCase()}`, instruction: `Take the first small action on: ${input.step_title}`, estimated_minutes: Math.min(2, half) },
      { step_order: 2, title: `Continue working on ${input.step_title.toLowerCase()}`, instruction: `Build on what you started. Keep going for ${half} minutes.`, estimated_minutes: half },
      { step_order: 3, title: `Finish up ${input.step_title.toLowerCase()}`, instruction: `Complete what remains. Stop when the time feels right.`, estimated_minutes: Math.max(1, input.estimated_minutes - half - 2) },
    ],
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })

  try {
    const input: StepBreakdownInput = await req.json()
    const prompt = buildPrompt(input)
    const rawContent = await callDeepseek(prompt)
    const result = JSON.parse(rawContent)

    if (result.sub_steps && result.sub_steps.length >= 2) {
      for (const step of result.sub_steps) {
        step.title = await scanAndRepairText(step.title, "Break this step down")
        step.instruction = await scanAndRepairText(step.instruction, "Work on this step")
      }
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    throw new Error("Invalid sub-step format")
  } catch (error: unknown) {
    console.error("Step breakdown error:", error)
    return new Response(
      JSON.stringify(generateFallbackSubSteps(await req.json().catch(() => ({ step_title: "this step", step_instruction: "", estimated_minutes: 10 })))),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
