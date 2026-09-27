import { z } from 'zod'

/**
 * Wire shapes for the OpenRouter Decisions API (alpha).
 *
 * Parsed permissively on purpose: the endpoint is alpha, published examples
 * disagree on whether `confidence` accompanies a `noul`, and we would rather
 * degrade a field than fail a whole run. `normalize.ts` turns these into the
 * typed shapes the rest of the app uses.
 */

const probabilities = z.record(z.string(), z.number())

export const rawChoiceAnswer = z.object({
  type: z.literal('choice'),
  choice: z.string(),
  probabilities: probabilities.optional(),
  confidence: z.number().optional(),
})

export const rawNoulAnswer = z.object({
  type: z.literal('noul'),
  /** A probability 0..1, NOT a boolean. */
  noul: z.number(),
  confidence: z.number().optional(),
})

export const rawScoreAnswer = z.object({
  type: z.literal('score'),
  /** A float position on the rubric, e.g. 1.05 — not an integer index. */
  score: z.number(),
  legend: z.record(z.string(), z.string()).optional(),
  probabilities: probabilities.optional(),
  confidence: z.number().optional(),
})

export const rawAnswer = z.discriminatedUnion('type', [
  rawChoiceAnswer,
  rawNoulAnswer,
  rawScoreAnswer,
])

export const decisionsResponse = z.object({
  answers: z.record(z.string(), rawAnswer),
  id: z.string().optional(),
  model: z.string().optional(),
  provider: z.string().optional(),
  usage: z
    .object({
      input_tokens: z.number().optional(),
      output_tokens: z.number().optional(),
      cost: z.number().optional(),
    })
    .optional(),
})

export type RawAnswer = z.infer<typeof rawAnswer>
export type DecisionsResponse = z.infer<typeof decisionsResponse>

/* ------------------------------------------------------------------ */
/* Normalized shapes used by the rest of the application               */
/* ------------------------------------------------------------------ */

export type ChoiceDecision = {
  id: string
  type: 'choice'
  question: string
  /** Ranked high → low. Always non-empty. */
  ranked: { option: string; label: string; probability: number }[]
  selected: string
  confidence: number | null
  /** Shannon entropy, normalized to 0..1. Drives direction B. */
  entropy: number
}

export type NoulDecision = {
  id: string
  type: 'noul'
  question: string
  probability: number
  value: boolean
  confidence: number | null
  entropy: number
}

export type ScoreDecision = {
  id: string
  type: 'score'
  question: string
  /** Raw float position on the rubric. */
  score: number
  /** Ordered rubric labels, low → high. */
  levels: string[]
  ranked: { option: string; label: string; probability: number }[]
  /** Nearest rubric index. */
  selected: number
  confidence: number | null
  entropy: number
}

export type Decision = ChoiceDecision | NoulDecision | ScoreDecision

export type DecisionSet = {
  decisions: Record<string, Decision>
  meta: {
    decisionId: string | null
    model: string | null
    latencyMs: number
    cost: number | null
  }
}

/**
 * Validates a DecisionSet coming back FROM the client — e.g. the compare
 * endpoint, which needs the set the browser already holds to rebuild a
 * strategy with a person's overrides. The server produced this data moments
 * earlier; this only guards against a tampered or stale payload, so it stays
 * structural rather than re-deriving every business rule.
 */
const rankedEntry = z.object({ option: z.string(), label: z.string(), probability: z.number() })

const decision = z.discriminatedUnion('type', [
  z.object({
    id: z.string(),
    type: z.literal('choice'),
    question: z.string(),
    ranked: z.array(rankedEntry).min(1),
    selected: z.string(),
    confidence: z.number().nullable(),
    entropy: z.number(),
  }),
  z.object({
    id: z.string(),
    type: z.literal('noul'),
    question: z.string(),
    probability: z.number(),
    value: z.boolean(),
    confidence: z.number().nullable(),
    entropy: z.number(),
  }),
  z.object({
    id: z.string(),
    type: z.literal('score'),
    question: z.string(),
    score: z.number(),
    levels: z.array(z.string()),
    ranked: z.array(rankedEntry).min(1),
    selected: z.number(),
    confidence: z.number().nullable(),
    entropy: z.number(),
  }),
])

export const decisionSet = z.object({
  decisions: z.record(z.string(), decision),
  meta: z.object({
    decisionId: z.string().nullable(),
    model: z.string().nullable(),
    latencyMs: z.number(),
    cost: z.number().nullable(),
  }),
})
