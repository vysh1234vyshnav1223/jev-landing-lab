import { describe, expect, it } from 'vitest'
import { readDecisions } from '@/lib/jev/client'
import { fixtureDecisionsResponse } from '@/lib/jev/fixtures'
import { STRATEGY_CRITERIA, strategyQuestions } from '@/lib/jev/strategies'
import { fixtureHypotheses } from '@/lib/generation/fixtures'

/**
 * Jev judges whole strategies: one choice question per criterion whose options
 * are the candidates, recombined by code into one distribution.
 */

const hypotheses = fixtureHypotheses()
const judge = () => readDecisions(fixtureDecisionsResponse(hypotheses), 100, hypotheses)

describe('strategy questions', () => {
  it('offers exactly the candidates as options on every criterion', () => {
    const qs = strategyQuestions(hypotheses)
    expect(Object.keys(qs)).toEqual(STRATEGY_CRITERIA.map((c) => c.id))
    for (const q of Object.values(qs)) {
      expect(Object.keys(q.criteria)).toEqual(hypotheses.map((h) => h.id))
    }
  })

  it('describes each candidate by its strategy, not its look', () => {
    const text = Object.values(strategyQuestions(hypotheses))[0].criteria[hypotheses[0].id]
    expect(text).toContain(hypotheses[0].thesis)
    expect(text).toContain('showcase')
    expect(text).not.toMatch(/accent|colour|color/i)
  })
})

describe('judgeStrategies', () => {
  it('produces a distribution over the candidates that sums to 1', () => {
    const { judgment } = judge()
    expect(judgment.ranked.map((r) => r.id).sort()).toEqual(hypotheses.map((h) => h.id).sort())
    expect(judgment.ranked.reduce((a, r) => a + r.probability, 0)).toBeCloseTo(1)
    expect(judgment.selected).toBe(judgment.ranked[0].id)
  })

  it('is the weighted mean of the criteria, overall counting double', () => {
    const { judgment } = judge()
    const id = hypotheses[1].id
    const expected =
      judgment.criteria.reduce((sum, c) => sum + c.weight * (c.ranked.find((r) => r.id === id)?.probability ?? 0), 0) /
      judgment.criteria.reduce((sum, c) => sum + c.weight, 0)
    expect(judgment.ranked.find((r) => r.id === id)?.probability).toBeCloseTo(expected)
  })

  it('keeps every criterion, so a runner-up that wins one is visible', () => {
    const { judgment } = judge()
    const audience = judgment.criteria.find((c) => c.id === 'strategyAudienceFit')!
    expect(audience.ranked[0].id).not.toBe(judgment.selected)
  })

  it('refuses a judgment with a criterion missing', () => {
    const raw = fixtureDecisionsResponse(hypotheses)
    delete raw.answers.strategyEvidence
    expect(() => readDecisions(raw, 1, hypotheses)).toThrow(/Missing: strategyEvidence/)
  })

  it('keeps execution decisions separate from strategy criteria', () => {
    const { decisions } = judge()
    expect(Object.keys(decisions.decisions).some((k) => k.startsWith('strategy'))).toBe(false)
    expect(decisions.decisions.visualDirection).toBeDefined()
  })
})
