import { generateStructured } from '@/lib/openrouter/client'
import {
  productBrief,
  productBriefJsonSchema,
  type BriefInput,
  type ProductBrief,
} from '@/schemas/brief'

/**
 * Stage ① — free text → structured context.
 *
 * Purely interpretive: no design decisions are made here. The output exists so
 * Jev has compact, factual state to reason over.
 */

const SYSTEM = `You extract structured product context from a founder's description of what they are building.

Rules:
- Be factual and specific. Do not invent features the brief does not imply.
- Where the brief is silent, infer the most probable answer from the industry and audience rather than leaving a field vague.
- conversionAction must be a concrete verb phrase, e.g. "search for flights", "start a free trial", "book a consultation".
- brandAttributes must be 3-5 single adjectives.
- Do not write marketing copy. This is context, not content.
- Return JSON only.`

export async function extractBrief(input: BriefInput, apiKey?: string): Promise<ProductBrief> {
  const hints = [
    input.audience && `Stated audience: ${input.audience}`,
    input.primaryGoal && `Stated primary goal: ${input.primaryGoal}`,
    input.brandAttributes?.length &&
      `Stated brand attributes: ${input.brandAttributes.join(', ')}`,
  ]
    .filter(Boolean)
    .join('\n')

  return generateStructured({
    system: SYSTEM,
    user: `Brief:\n${input.brief}${hints ? `\n\n${hints}\n(Prefer these stated values over your own inference.)` : ''}`,
    schemaName: 'product_brief',
    jsonSchema: productBriefJsonSchema,
    validator: productBrief,
    stage: 'interpreting',
    apiKey,
  })
}
