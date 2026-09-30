import { ARCHETYPES } from '@/lib/generation/archetypes'
import type { ChoiceQuestion } from '@/lib/jev/questions'
import type { DecisionSet } from '@/schemas/decisions'
import { CONVERSION_LABELS, type StrategyHypothesis, type StrategyJudgment } from '@/schemas/strategy'

/**
 * Jev judges the candidate strategies.
 *
 * Each criterion is its own `choice` question whose options ARE the
 * candidates — Jev returns a probability distribution over them per
 * criterion. Code then recombines the criteria into one distribution. That
 * split follows TypeSafe's guidance (atomic questions, recombined by ordinary
 * code) and keeps the "why" inspectable: the inspector can show that a
 * runner-up won on audience fit but lost on evidence.
 *
 * Nothing picks a strategy but this distribution. The page is built from its
 * rank 0; any other rank can be built on request (Compare).
 */

export const STRATEGY_CRITERIA = [
  {
    id: 'strategyOverall',
    label: 'Overall',
    weight: 2,
    instructions:
      'Which of these landing-page strategies should be built for this product, given everything known about it?',
  },
  {
    id: 'strategyAudienceFit',
    label: 'Audience fit',
    weight: 1,
    instructions: 'Which strategy best matches how this specific audience actually makes this decision?',
  },
  {
    id: 'strategyProductFit',
    label: 'Product fit',
    weight: 1,
    instructions:
      'Which strategy is most faithful to what this product actually is — with no sections, claims or conventions borrowed from a different kind of business?',
  },
  {
    id: 'strategyConversion',
    label: 'Conversion',
    weight: 1,
    instructions: 'Which strategy most directly moves a first-time visitor to the primary conversion action?',
  },
  {
    id: 'strategyCoherence',
    label: 'Coherence',
    weight: 1,
    instructions:
      'Which strategy tells the most coherent story in its order, with every section earning its place and nothing padded or redundant?',
  },
  {
    id: 'strategyDifferentiation',
    label: 'Differentiation',
    weight: 1,
    instructions: 'Which strategy most clearly separates this product from the alternatives the visitor is weighing?',
  },
  {
    id: 'strategyEvidence',
    label: 'Evidence',
    weight: 1,
    instructions:
      'Which strategy can be executed convincingly with what is actually known about this product, without inventing claims, numbers or proof?',
  },
] as const

/** One candidate, as Jev reads it: everything strategic, nothing cosmetic. */
export function describeStrategy(h: StrategyHypothesis): string {
  const sections = h.sections.map((s) => `${s.type} (${s.purpose})`).join(' → ')
  return [
    `${h.name} — a ${ARCHETYPES[h.archetype].label.toLowerCase()} page.`,
    h.thesis,
    `Persuasion: ${h.persuasion}.`,
    `Frames the visitor as: ${h.audienceFraming}.`,
    `Story: ${h.narrative.join(' → ')}.`,
    `Page: ${h.hero.variant} hero (${h.hero.purpose}) → ${sections}.`,
    `Asks the visitor to: ${CONVERSION_LABELS[h.conversion.approach].toLowerCase()}.`,
  ].join(' ')
}

export function strategyQuestions(hypotheses: StrategyHypothesis[]): Record<string, ChoiceQuestion> {
  const options = Object.fromEntries(hypotheses.map((h) => [h.id, describeStrategy(h)]))
  return Object.fromEntries(
    STRATEGY_CRITERIA.map((c) => [c.id, { type: 'choice', instructions: c.instructions, criteria: options }]),
  )
}

/**
 * Weighted mean of the per-criterion distributions. Deterministic: the same
 * decisions always yield the same ranking, ties broken by candidate order.
 * Throws if a criterion is missing — a partial judgment is not a judgment.
 */
export function judgeStrategies(set: DecisionSet, hypotheses: StrategyHypothesis[]): StrategyJudgment {
  const criteria = STRATEGY_CRITERIA.map((c) => {
    const d = set.decisions[c.id]
    if (!d || d.type !== 'choice') {
      throw new Error(`Jev returned no usable answer for "${c.id}" — cannot judge the strategies.`)
    }
    return {
      id: c.id,
      label: c.label,
      weight: c.weight,
      confidence: d.confidence,
      ranked: d.ranked.map((r) => ({ id: r.option, probability: r.probability })),
    }
  })

  const totalWeight = criteria.reduce((sum, c) => sum + c.weight, 0)
  const ranked = hypotheses
    .map((h, order) => {
      const score = criteria.reduce(
        (sum, c) => sum + c.weight * (c.ranked.find((r) => r.id === h.id)?.probability ?? 0),
        0,
      )
      return { id: h.id, name: h.name, probability: score / totalWeight, order }
    })
    .sort((a, b) => b.probability - a.probability || a.order - b.order)
    .map(({ id, name, probability }) => ({ id, name, probability }))

  return { ranked, selected: ranked[0].id, criteria }
}
