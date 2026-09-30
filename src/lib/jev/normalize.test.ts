import { describe, expect, it } from 'vitest'
import { entropyOf, missingDecisions, normalizeDecisions } from '@/lib/jev/normalize'
import { fixtureDecisionsResponse } from '@/lib/jev/fixtures'
import { QUESTION_IDS } from '@/lib/jev/questions'
import { decisionsResponse } from '@/schemas/decisions'

describe('entropyOf', () => {
  it('is 0 for a certain distribution and 1 for a uniform one', () => {
    expect(entropyOf([1, 0, 0])).toBe(0)
    expect(entropyOf([0.5, 0.5])).toBeCloseTo(1)
    expect(entropyOf([0.25, 0.25, 0.25, 0.25])).toBeCloseTo(1)
  })

  it('ranks a near-tie above a landslide', () => {
    expect(entropyOf([0.44, 0.31, 0.15, 0.1])).toBeGreaterThan(
      entropyOf([0.9, 0.05, 0.03, 0.02]),
    )
  })
})

describe('normalizeDecisions', () => {
  const set = normalizeDecisions(fixtureDecisionsResponse(), 120)

  it('answers every question we asked', () => {
    expect(missingDecisions(set)).toEqual([])
    expect(Object.keys(set.decisions).sort()).toEqual([...QUESTION_IDS].sort())
  })

  it('ranks choice options high to low', () => {
    const d = set.decisions.socialProofType
    expect(d.type).toBe('choice')
    if (d.type !== 'choice') return
    const probs = d.ranked.map((r) => r.probability)
    expect([...probs].sort((a, b) => b - a)).toEqual(probs)
    expect(d.selected).toBe(d.ranked[0].option)
  })

  it('treats noul as a probability, not a boolean', () => {
    const d = set.decisions.trustIsPrimaryBarrier
    if (d.type !== 'noul') throw new Error('expected noul')
    expect(d.probability).toBeCloseTo(0.88)
    expect(d.value).toBe(true)

    const edu = set.decisions.requiresEducation
    if (edu.type !== 'noul') throw new Error('expected noul')
    expect(edu.value).toBe(false)
  })

  it('rounds a float score to the nearest rubric level', () => {
    const d = set.decisions.offerProminence
    if (d.type !== 'score') throw new Error('expected score')
    expect(Number.isInteger(d.score)).toBe(false)
    expect(d.selected).toBe(Math.round(d.score))
    expect(d.levels).toHaveLength(3)
  })

  it('renormalizes a distribution that does not sum to 1', () => {
    const raw = fixtureDecisionsResponse()
    raw.answers.socialProofType = {
      type: 'choice',
      choice: 'metrics',
      probabilities: { metrics: 3, testimonials: 1 },
    }
    const d = normalizeDecisions(raw, 1).decisions.socialProofType
    if (d.type !== 'choice') throw new Error('expected choice')
    const total = d.ranked.reduce((a, r) => a + r.probability, 0)
    expect(total).toBeCloseTo(1)
    expect(d.ranked[0].probability).toBeCloseTo(0.75)
  })

  it('falls back to uniform rather than crashing on a missing distribution', () => {
    const raw = fixtureDecisionsResponse()
    raw.answers.visualDirection = { type: 'choice', choice: 'clean_utility' }
    const d = normalizeDecisions(raw, 1).decisions.visualDirection
    if (d.type !== 'choice') throw new Error('expected choice')
    expect(d.ranked.every((r) => r.probability === 0.25)).toBe(true)
    expect(d.selected).toBe('clean_utility')
  })

  it('ignores an option key we never offered', () => {
    const raw = fixtureDecisionsResponse()
    raw.answers.visualDirection = {
      type: 'choice',
      choice: 'something_invented',
      probabilities: { warm_editorial: 0.7, clean_utility: 0.3 },
    }
    const d = normalizeDecisions(raw, 1).decisions.visualDirection
    if (d.type !== 'choice') throw new Error('expected choice')
    expect(d.selected).toBe('warm_editorial')
  })

  it('drops an answer whose type disagrees with the question', () => {
    const raw = fixtureDecisionsResponse()
    raw.answers.socialProofType = { type: 'noul', noul: 0.9 }
    const result = normalizeDecisions(raw, 1)
    expect(result.decisions.socialProofType).toBeUndefined()
    expect(missingDecisions(result)).toContain('socialProofType')
  })

  it('accepts a noul with no confidence field', () => {
    const parsed = decisionsResponse.safeParse({
      answers: { trustIsPrimaryBarrier: { type: 'noul', noul: 0.4 } },
    })
    expect(parsed.success).toBe(true)
  })
})
