import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

const DEEPSEEK_API_KEY = Deno.env.get("DEEPSEEK_API_KEY")
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const { task_title, task_description, mood_score, user_id } = await req.json()

    if (!task_title || mood_score === undefined || !user_id) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: task_title, mood_score, user_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Step 1: Determine complexity
    const complexityResponse = await fetch("https://api.deepseek.com/v1/chat/completions", {
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

    // Step 3: Generate the path
    const pathResponse = await fetch("https://api.deepseek.com/v1/chat/completions", {
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
        max_tokens: 2000,
        temperature: 0.5,
      }),
    })

    const pathData = await pathResponse.json()
    const rawContent = pathData.choices?.[0]?.message?.content ?? ""
    
    // Parse JSON from response (handle potential wrapping)
    const jsonMatch = rawContent.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error("Failed to parse AI response as JSON")
    }
    const result = JSON.parse(jsonMatch[0])

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (error) {
    console.error("Task breakdown error:", error.message)
    return new Response(
      JSON.stringify({ error: "Internal error", is_multi_phase: false, total_estimated_minutes: 15, steps: [] }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
