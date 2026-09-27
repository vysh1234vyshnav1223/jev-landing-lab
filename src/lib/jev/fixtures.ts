import type { DecisionsResponse } from '@/schemas/decisions'
import { QUESTIONS } from '@/lib/jev/questions'

/**
 * A synthetic but shape-accurate Jev response, used by tests and by
 * USE_FIXTURES=1 so UI work costs none of the 50 daily free requests.
 *
 * Deliberately includes near-ties (heroStrategy, contentHierarchy) so the
 * entropy-driven direction logic has something real to bite on.
 */
const CHOICE_SHAPES: Record<string, number[]> = {
  heroStrategy: [0.44, 0.31, 0.15, 0.1],
  ctaStrategy: [0.68, 0.18, 0.09, 0.05],
  socialProofType: [0.52, 0.27, 0.13, 0.08],
  contentHierarchy: [0.41, 0.36, 0.23],
  visualDirection: [0.61, 0.21, 0.12, 0.06],
  pageArchitecture: [0.55, 0.33, 0.12],
}

const SCORE_SHAPES: Record<string, number[]> = {
  navigationComplexity: [0.62, 0.3, 0.08],
  interactionDensity: [0.11, 0.58, 0.31],
  offerProminence: [0.18, 0.34, 0.48],
}

const NOUL_SHAPES: Record<string, number> = {
  trustIsPrimaryBarrier: 0.88,
  audienceIsPriceSensitive: 0.73,
  requiresEducation: 0.22,
}

export function fixtureDecisionsResponse(): DecisionsResponse {
  const answers: DecisionsResponse['answers'] = {}

  for (const [id, q] of Object.entries(QUESTIONS)) {
    if (q.type === 'choice') {
      const keys = Object.keys(q.criteria)
      const probs = CHOICE_SHAPES[id] ?? keys.map(() => 1 / keys.length)
      const probabilities = Object.fromEntries(keys.map((k, i) => [k, probs[i] ?? 0]))
      const top = keys[probs.indexOf(Math.max(...probs))]
      answers[id] = {
        type: 'choice',
        choice: top,
        probabilities,
        confidence: Math.max(...probs),
      }
    } else if (q.type === 'score') {
      const probs = SCORE_SHAPES[id] ?? q.criteria.map(() => 1 / q.criteria.length)
      const probabilities = Object.fromEntries(probs.map((p, i) => [String(i), p]))
      // Expected value, as Jev returns a float position rather than an index.
      const score = probs.reduce((sum, p, i) => sum + p * i, 0)
      answers[id] = {
        type: 'score',
        score,
        legend: Object.fromEntries(q.criteria.map((c, i) => [String(i), c])),
        probabilities,
        confidence: Math.max(...probs),
      }
    } else {
      answers[id] = { type: 'noul', noul: NOUL_SHAPES[id] ?? 0.5 }
    }
  }

  return {
    answers,
    id: 'gen-dec-fixture',
    model: 'typesafe/jev-1.13-fixture',
    provider: 'TypeSafe',
    usage: { input_tokens: 512, output_tokens: 0, cost: 0.0000215 },
  }
}
