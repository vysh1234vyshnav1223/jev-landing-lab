import type { Decision, DecisionSet } from '@/schemas/decisions'
import type { QuestionId } from '@/lib/jev/questions'

/**
 * ────────────────────────────────────────────────────────────────────────
 *  THE CAUSAL CORE
 * ────────────────────────────────────────────────────────────────────────
 *
 * Jev's probability distribution becomes a design strategy HERE, in plain
 * TypeScript. No language model participates in this step.
 *
 * This is what makes Jev load-bearing rather than decorative: if Jev's
 * distribution shifts, the strategy shifts, and the rendered page shifts with
 * it. Stub Jev out and there is nothing left to render.
 *
 * The resolved strategy always takes Jev's highest-probability answer on
 * every decision — Jev IS the design decision, not one of several options to
 * browse. A person can override individual decisions afterwards (see
 * `buildStrategy`, exported for that reason); resolving is deterministic
 * either way, so the same inputs always yield the same strategy.
 */

/** The resolved, unambiguous strategy a renderer consumes. */
export type Strategy = {
  heroStrategy: string
  ctaStrategy: string
  socialProofType: string
  contentHierarchy: string
  visualDirection: string
  pageArchitecture: string
  navigationComplexity: number
  interactionDensity: number
  offerProminence: number
  trustIsPrimaryBarrier: boolean
  audienceIsPriceSensitive: boolean
  requiresEducation: boolean
}

export type ResolvedDirection = {
  strategy: Strategy
  /** Decisions a person moved away from Jev's top pick, and what changed. */
  departures: Departure[]
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
 * Builds a strategy from Jev's decision set, taking rank 0 (Jev's top pick)
 * on every decision except the ones named in `overrides` — those take the
 * given rank instead. Called with no overrides, this is Jev's own answer.
 * Called with a person's choices, it is theirs. Either way the mapping from
 * decisions to a strategy is the same code.
 */
export function buildStrategy(
  set: DecisionSet,
  overrides: Map<string, number> = new Map(),
): { strategy: Strategy; departures: Departure[] } {
  const departures: Departure[] = []
  const value = (id: QuestionId) => {
    const d = set.decisions[id]
    if (!d) {
      throw new Error(
        `Jev returned no usable answer for "${id}" — cannot resolve a strategy.`,
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

  const strategy: Strategy = {
    heroStrategy: value('heroStrategy') as string,
    ctaStrategy: value('ctaStrategy') as string,
    socialProofType: value('socialProofType') as string,
    contentHierarchy: value('contentHierarchy') as string,
    visualDirection: value('visualDirection') as string,
    pageArchitecture: value('pageArchitecture') as string,
    navigationComplexity: value('navigationComplexity') as number,
    interactionDensity: value('interactionDensity') as number,
    offerProminence: value('offerProminence') as number,
    trustIsPrimaryBarrier: value('trustIsPrimaryBarrier') as boolean,
    audienceIsPriceSensitive: value('audienceIsPriceSensitive') as boolean,
    requiresEducation: value('requiresEducation') as boolean,
  }

  return { strategy, departures }
}

/** Jev's own strategy: rank 0 on every decision. */
export function resolveDirection(set: DecisionSet): ResolvedDirection {
  return buildStrategy(set)
}

/** Field-by-field difference between two strategies, for the compare view. */
export function diffStrategies(
  left: Strategy,
  right: Strategy,
): { key: keyof Strategy; from: Strategy[keyof Strategy]; to: Strategy[keyof Strategy] }[] {
  return (Object.keys(left) as (keyof Strategy)[])
    .filter((k) => left[k] !== right[k])
    .map((k) => ({ key: k, from: left[k], to: right[k] }))
}
