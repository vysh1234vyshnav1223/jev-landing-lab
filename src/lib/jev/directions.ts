import type { Decision, DecisionSet } from '@/schemas/decisions'
import type { QuestionId } from '@/lib/jev/questions'

/**
 * Jev's execution decisions → the unambiguous values the blueprint reads.
 *
 * Plain TypeScript, no model. Takes Jev's highest-probability answer on every
 * decision unless a person overrode it in the inspector (a rank per decision);
 * deterministic either way. Which STRATEGY gets built is decided separately —
 * see `strategies.ts` — this only resolves how it is executed.
 */

export type Execution = {
  socialProofType: string
  visualDirection: string
  navigationComplexity: number
  offerProminence: number
  trustIsPrimaryBarrier: boolean
  requiresEducation: boolean
}

export type Departure = {
  decisionId: string
  question: string
  from: string
  to: string
  fromProbability: number
  toProbability: number
}

/** Value at rank n (0-based) for any decision type, as a string|number|boolean. */
function pickAtRank(decision: Decision, n: number): string | number | boolean {
  if (decision.type === 'choice') {
    return (decision.ranked[n] ?? decision.ranked[0]).option
  }
  if (decision.type === 'score') {
    const entry = decision.ranked[n] ?? decision.ranked[0]
    return Number(entry.option)
  }
  // noul: rank 0 is Jev's side of 0.5, rank 1 is the other side.
  return n === 0 ? decision.value : !decision.value
}

function probabilityOfRank(decision: Decision, n: number): number {
  if (decision.type === 'noul') {
    const top = Math.max(decision.probability, 1 - decision.probability)
    return n === 0 ? top : 1 - top
  }
  return decision.ranked[n]?.probability ?? 0
}

function labelOfRank(decision: Decision, n: number): string {
  if (decision.type === 'noul') {
    const yes = n === 0 ? decision.value : !decision.value
    return yes ? 'Yes' : 'No'
  }
  return (decision.ranked[n] ?? decision.ranked[0]).label
}

/**
 * Resolves Jev's execution decisions, taking rank 0 (Jev's top pick) on every
 * decision except the ones named in `overrides` — those take the given rank
 * instead. Called with no overrides, this is Jev's own answer.
 */
export function buildExecution(
  set: DecisionSet,
  overrides: Map<string, number> = new Map(),
): { execution: Execution; departures: Departure[] } {
  const departures: Departure[] = []
  const value = (id: QuestionId) => {
    const d = set.decisions[id]
    if (!d) {
      throw new Error(
        `Jev returned no usable answer for "${id}" — cannot resolve the page.`,
      )
    }
    const rank = overrides.get(id) ?? 0
    if (rank !== 0) {
      departures.push({
        decisionId: id,
        question: d.question,
        from: labelOfRank(d, 0),
        to: labelOfRank(d, rank),
        fromProbability: probabilityOfRank(d, 0),
        toProbability: probabilityOfRank(d, rank),
      })
    }
    return pickAtRank(d, rank)
  }

  const execution: Execution = {
    socialProofType: value('socialProofType') as string,
    visualDirection: value('visualDirection') as string,
    navigationComplexity: value('navigationComplexity') as number,
    offerProminence: value('offerProminence') as number,
    trustIsPrimaryBarrier: value('trustIsPrimaryBarrier') as boolean,
    requiresEducation: value('requiresEducation') as boolean,
  }

  return { execution, departures }
}
