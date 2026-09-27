import { z } from 'zod'

/** What the user types. Only the free-text brief is required. */
export const briefInput = z.object({
  brief: z.string().min(20, 'Tell us a little more about what you are building.').max(4000),
  audience: z.string().max(200).optional(),
  primaryGoal: z.string().max(200).optional(),
  brandAttributes: z.array(z.string().max(40)).max(6).optional(),
})

export type BriefInput = z.infer<typeof briefInput>

/**
 * The structured context the generative model extracts. This is what Jev
 * reasons over, so it stays compact and free of marketing prose.
 */
export const productBrief = z.object({
  industry: z.string(),
  product: z.string(),
  audience: z.string(),
  primaryGoal: z.string(),
  secondaryGoals: z.array(z.string()).default([]),
  brandAttributes: z.array(z.string()).default([]),
  conversionAction: z.string(),
  geography: z.string().nullable().default(null),
  competitors: z.array(z.string()).default([]),
  priceContext: z.string().nullable().default(null),
  productName: z.string(),
})

export type ProductBrief = z.infer<typeof productBrief>

/** JSON Schema handed to OpenRouter for structured output. */
export const productBriefJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'industry',
    'product',
    'audience',
    'primaryGoal',
    'secondaryGoals',
    'brandAttributes',
    'conversionAction',
    'geography',
    'competitors',
    'priceContext',
    'productName',
  ],
  properties: {
    productName: {
      type: 'string',
      description:
        'A short plausible brand name for this product. Invent one if the brief does not name it.',
    },
    industry: { type: 'string', description: 'e.g. travel, fintech, developer tools' },
    product: { type: 'string', description: 'One sentence: what the product actually is.' },
    audience: { type: 'string', description: 'Who it is for, specifically.' },
    primaryGoal: {
      type: 'string',
      description: 'The single most important thing a visitor should do.',
    },
    secondaryGoals: { type: 'array', items: { type: 'string' } },
    brandAttributes: {
      type: 'array',
      items: { type: 'string' },
      description: 'Three to five adjectives describing how the brand should feel.',
    },
    conversionAction: {
      type: 'string',
      description: 'The concrete action, phrased as a verb phrase, e.g. "search for flights".',
    },
    geography: { type: ['string', 'null'] },
    competitors: { type: 'array', items: { type: 'string' } },
    priceContext: {
      type: ['string', 'null'],
      description: 'Anything known about pricing, budget or cost positioning.',
    },
  },
} as const
