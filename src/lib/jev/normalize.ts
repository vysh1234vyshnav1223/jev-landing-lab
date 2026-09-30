import { QUESTIONS, type JevQuestion } from '@/lib/jev/questions'
import type {
  Decision,
  DecisionSet,
  DecisionsResponse,
  RawAnswer,
} from '@/schemas/decisions'

/**
 * Raw Jev answers → typed, ranked decisions.
 *
 * Everything downstream reads these, never the wire shape. Probabilities are
 * renormalized (providers may return a distribution that doesn't quite sum to
 * 1) and entropy is computed here because `directions.ts` ranks on it.
 */

/** Shannon entropy over a distribution, normalized to 0..1. */
export function entropyOf(probs: number[]): number {
  const positive = probs.filter((p) => p > 0)
  if (positive.length <= 1) return 0
  const h = -positive.reduce((sum, p) => sum + p * Math.log2(p), 0)
  return h / Math.log2(positive.length)
}

function renormalize(
  probs: Record<string, number> | undefined,
  keys: string[],
): Record<string, number> {
  const raw = Object.fromEntries(keys.map((k) => [k, probs?.[k] ?? 0]))
  const total = Object.values(raw).reduce((a, b) => a + b, 0)
  // No usable distribution — fall back to uniform so ranking stays defined.
  if (total <= 0) {
    const even = 1 / keys.length
    return Object.fromEntries(keys.map((k) => [k, even]))
  }
  return Object.fromEntries(keys.map((k) => [k, raw[k] / total]))
}

function rank(
  probs: Record<string, number>,
  labels: Record<string, string>,
): { option: string; label: string; probability: number }[] {
  return Object.entries(probs)
    .map(([option, probability]) => ({
      option,
      label: labels[option] ?? option,
      probability,
    }))
    // Tie-break on option key so the same input always yields the same order.
    .sort(
      (a, b) => b.probability - a.probability || a.option.localeCompare(b.option),
    )
}

function normalizeOne(
  id: string,
  question: JevQuestion,
  answer: RawAnswer,
): Decision | null {
  // The endpoint answered with a different type than we asked for. Drop it
  // rather than guess — directions.ts treats a missing decision as a hard error.
  if (answer.type !== question.type) return null

  if (question.type === 'choice' && answer.type === 'choice') {
    const keys = Object.keys(question.criteria)
    const probs = renormalize(answer.probabilities, keys)
    const ranked = rank(probs, question.criteria)
    // Trust the model's own pick when it's a key we offered; otherwise argmax.
    const selected = keys.includes(answer.choice)
      ? answer.choice
      : ranked[0].option
    return {
      id,
      type: 'choice',
      question: question.instructions,
      ranked,
      selected,
      confidence: answer.confidence ?? null,
      entropy: entropyOf(ranked.map((r) => r.probability)),
    }
  }

  if (question.type === 'noul' && answer.type === 'noul') {
    const p = Math.min(1, Math.max(0, answer.noul))
    return {
      id,
      type: 'noul',
      question: question.instructions,
      probability: p,
      value: p >= 0.5,
      confidence: answer.confidence ?? null,
      entropy: entropyOf([p, 1 - p]),
    }
  }

  if (question.type === 'score' && answer.type === 'score') {
    const levels = question.criteria
    const keys = levels.map((_, i) => String(i))
    const probs = renormalize(answer.probabilities, keys)
    const labels = Object.fromEntries(keys.map((k, i) => [k, levels[i]]))
    const ranked = rank(probs, labels)
    const nearest = Math.min(
      levels.length - 1,
      Math.max(0, Math.round(answer.score)),
    )
    return {
      id,
      type: 'score',
      question: question.instructions,
      score: answer.score,
      levels: [...levels],
      ranked,
      selected: nearest,
      confidence: answer.confidence ?? null,
      entropy: entropyOf(ranked.map((r) => r.probability)),
    }
  }

  return null
}

/**
 * Normalizes the answers to `questions` — the fixed execution questions by
 * default, or any other set (the per-run strategy questions travel in the same
 * response). Answers to questions outside the set are ignored.
 */
export function normalizeDecisions(
  response: DecisionsResponse,
  latencyMs: number,
  questions: Record<string, JevQuestion> = QUESTIONS,
): DecisionSet {
  const decisions: Record<string, Decision> = {}

  for (const [id, question] of Object.entries(questions)) {
    const answer = response.answers[id]
    if (!answer) continue
    const decision = normalizeOne(id, question, answer)
    if (decision) decisions[id] = decision
  }

  return {
    decisions,
    meta: {
      decisionId: response.id ?? null,
      model: response.model ?? null,
      latencyMs,
      cost: response.usage?.cost ?? null,
    },
  }
}

/** Decisions we asked about but did not get a usable answer for. */
export function missingDecisions(
  set: DecisionSet,
  questions: Record<string, JevQuestion> = QUESTIONS,
): string[] {
  return Object.keys(questions).filter((id) => !set.decisions[id])
}
