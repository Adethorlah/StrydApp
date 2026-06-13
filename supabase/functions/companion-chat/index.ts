import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const DEEPSEEK_API_KEY = Deno.env.get("DEEPSEEK_API_KEY")
const DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

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
  companion: "Take a moment. When you are ready, start with whatever feels most natural.",
}

function stripNameFromPayload(payload: Record<string, unknown>, name: string): Record<string, unknown> {
  const str = JSON.stringify(payload)
  const cleaned = str.replace(new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), "[user]")
  return JSON.parse(cleaned)
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
        max_tokens: 500,
        temperature: 0.3,
      }),
    })
    const data = await response.json()
    return data.choices?.[0]?.message?.content ?? text
  } catch {
    return text
  }
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

    const scan = toneSafetyScan(rawText)
    let finalContent = rawText

    if (!scan.is_safe) {
      let repaired = await repairText(rawText, scan.flagged_items)
      let rescan = toneSafetyScan(repaired)

      if (!rescan.is_safe) {
        repaired = await repairText(rawText, rescan.flagged_items)
        rescan = toneSafetyScan(repaired)
      }

      if (!rescan.is_safe) {
        finalContent = FALLBACK_RESPONSES.companion
      } else {
        finalContent = repaired
      }
    }

    return new Response(JSON.stringify({ content: finalContent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error"
    console.error("Companion chat error:", message)
    return new Response(
      JSON.stringify({ content: FALLBACK_RESPONSES.companion }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})