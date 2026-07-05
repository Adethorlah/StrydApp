const DEEPSEEK_API_KEY = Deno.env.get("DEEPSEEK_API_KEY")
const DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions"

export interface ToneScanResult {
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

export function toneSafetyScan(text: string): ToneScanResult {
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

const REPAIR_AGENT_PROMPT = `You are rewriting AI-generated text for STRYD, a calm focus app.

Rewrite the text so it:
- Removes all flagged items
- Keeps the same meaning and helpful intent
- Uses calm, direct, non-judgmental language
- Contains no exclamation marks
- Contains no urgency or pressure framing
- Sounds like a steady, trusted friend

Return rewritten text only. No explanation.`

export async function repairText(text: string, flagged: string[]): Promise<string> {
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

export async function scanAndRepairText(text: string, fallbackText: string): Promise<string> {
  const scan = toneSafetyScan(text)
  if (scan.is_safe) return text

  let repaired = await repairText(text, scan.flagged_items)
  const rescan = toneSafetyScan(repaired)

  if (!rescan.is_safe) {
    repaired = await repairText(repaired, rescan.flagged_items)
    const finalScan = toneSafetyScan(repaired)
    if (!finalScan.is_safe) return fallbackText
  }

  return repaired
}
