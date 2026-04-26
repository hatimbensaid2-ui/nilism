import Anthropic from '@anthropic-ai/sdk'

const SYSTEM_PROMPT = `You are an expert analyst using the Nihilism Pragmatic decision-making framework.
This framework evaluates decisions by scoring the BENEFIT and HARM (0-10 scale) across multiple dimensions,
both for the decision-maker ("On Me") and for others affected ("On Others").

Framework rules:
- Score 0 = no effect, 10 = maximum possible effect
- Weight 1 = normal importance, 2 = double importance, 3 = critical factor
- Be honest and nuanced — most real decisions have both benefits and harms
- Identify the most relevant dimensions for the specific situation (2-4 dimensions per panel)
- Labels should be concise (1-2 words), Arabic field should be the Arabic translation

You MUST respond with ONLY a valid JSON object, no other text, in this exact structure:
{
  "decision": "concise title for this decision (5 words max)",
  "onMe": [
    {"label": "Moral", "arabic": "أخلاقي", "benefit": 0, "harm": 0, "weight": 1},
    {"label": "Material", "arabic": "مادي", "benefit": 0, "harm": 0, "weight": 1}
  ],
  "onOthers": [
    {"label": "Moral", "arabic": "أخلاقي", "benefit": 0, "harm": 0, "weight": 1},
    {"label": "Social", "arabic": "اجتماعي", "benefit": 0, "harm": 0, "weight": 1}
  ],
  "explanation": "2-3 sentences explaining the key tradeoffs in this decision",
  "context": "brief note on cultural or ethical context"
}`

export async function analyzeDecision(situation, apiKey) {
  const client = new Anthropic({
    apiKey,
    dangerouslyAllowBrowser: true,
  })

  const message = await client.messages.create({
    model: 'claude-opus-4-7',
    max_tokens: 1024,
    thinking: { type: 'adaptive' },
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: `Analyze this situation using the Nihilism Pragmatic framework: "${situation}"` }],
  })

  const textBlock = message.content.find((b) => b.type === 'text')
  if (!textBlock) throw new Error('No text response from AI')

  const raw = textBlock.text.trim()
  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('Could not parse AI response as JSON')

  return JSON.parse(jsonMatch[0])
}
