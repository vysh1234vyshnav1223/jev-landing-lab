import type { DecisionsResponse } from '@/schemas/decisions'
import { QUESTIONS, type JevQuestion } from '@/lib/jev/questions'
import { strategyQuestions } from '@/lib/jev/strategies'
import type { StrategyHypothesis } from '@/schemas/strategy'

/**
 * A synthetic but shape-accurate Jev response, used by tests and by
 * USE_FIXTURES=1 so UI work costs none of the 50 daily free requests.
 *
 * Strategy criteria deliberately disagree with each other (the runner-up wins
 * on audience fit and differentiation) so the combined ranking and the
 * inspector's per-criterion breakdown have something real to show.
 */
const CHOICE_SHAPES: Record<string, number[]> = {
  socialProofType: [0.52, 0.27, 0.13, 0.08],
  visualDirection: [0.61, 0.21, 0.12, 0.06],
  // Strategy criteria: probability by candidate position.
  strategyOverall: [0.52, 0.33, 0.15],
  strategyAudienceFit: [0.38, 0.47, 0.15],
  strategyProductFit: [0.55, 0.3, 0.15],
  strategyConversion: [0.6, 0.25, 0.15],
  strategyCoherence: [0.45, 0.35, 0.2],
  strategyDifferentiation: [0.3, 0.5, 0.2],
  strategyEvidence: [0.5, 0.2, 0.3],
}

const SCORE_SHAPES: Record<string, number[]> = {
  navigationComplexity: [0.62, 0.3, 0.08],
  offerProminence: [0.18, 0.34, 0.48],
}

const NOUL_SHAPES: Record<string, number> = {
  trustIsPrimaryBarrier: 0.88,
  requiresEducation: 0.22,
}

/** Answers every execution question, plus the strategy criteria when given candidates. */
export function fixtureDecisionsResponse(hypotheses: StrategyHypothesis[] = []): DecisionsResponse {
  const answers: DecisionsResponse['answers'] = {}
  const questions: Record<string, JevQuestion> = {
    ...(hypotheses.length ? strategyQuestions(hypotheses) : {}),
    ...QUESTIONS,
  }

  for (const [id, q] of Object.entries(questions)) {
    if (q.type === 'choice') {
      const keys = Object.keys(q.criteria)
      const shape = CHOICE_SHAPES[id] ?? []
      // Candidates past the shape's length get a small equal share.
      const probs = keys.map((_, i) => shape[i] ?? 0.05)
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
