import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { scanAndRepairText, toneSafetyScan, repairText } from "../_shared/toneSafety.ts"

const DEEPSEEK_API_KEY = Deno.env.get("DEEPSEEK_API_KEY")
const DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

const FALLBACK_RESPONSES = {
  companion: "Take a moment. When you are ready, start with whatever feels most natural.",
}

function stripNameFromPayload(payload: Record<string, unknown>, name: string): Record<string, unknown> {
  const str = JSON.stringify(payload)
  const cleaned = str.replace(new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), "[user]")
  return JSON.parse(cleaned)
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const { messages, userName, options } = await req.json()

    if (!messages) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: messages" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    let payload: Record<string, unknown> = {
      model: "deepseek-chat",
      messages,
      max_tokens: options?.max_tokens ?? 1000,
      temperature: options?.temperature ?? 0.5,
    }

    if (userName) {
      payload = stripNameFromPayload(payload, userName)
    }

    const response = await fetch(DEEPSEEK_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) throw new Error(`Deepseek API error: ${response.status}`)

    const data = await response.json()
    const rawText = data.choices?.[0]?.message?.content ?? ""

    const finalContent = await scanAndRepairText(rawText, FALLBACK_RESPONSES.companion)

    return new Response(JSON.stringify({ content: finalContent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })

  } catch (error: unknown) {
    console.error("Companion chat error:", error)
    return new Response(
      JSON.stringify({ content: FALLBACK_RESPONSES.companion }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})