import { describe, expect, it } from 'vitest'
import { buildStrategy, diffStrategies, resolveDirection } from '@/lib/jev/directions'
import { normalizeDecisions } from '@/lib/jev/normalize'
import { fixtureDecisionsResponse } from '@/lib/jev/fixtures'
import { planSections } from '@/lib/generation/architecture'

const set = () => normalizeDecisions(fixtureDecisionsResponse(), 100)

describe('resolveDirection', () => {
  it('takes Jev’s top pick on every decision', () => {
    const s = set()
    const a = resolveDirection(s)
    expect(a.departures).toEqual([])
    for (const d of Object.values(s.decisions)) {
      if (d.type === 'choice') {
        expect(a.strategy[d.id as 'heroStrategy']).toBe(d.ranked[0].option)
      }
    }
  })

  it('is deterministic', () => {
    expect(JSON.stringify(resolveDirection(set()))).toBe(JSON.stringify(resolveDirection(set())))
  })

  it('refuses to resolve when a decision is missing', () => {
    const s = set()
    delete s.decisions.heroStrategy
    expect(() => resolveDirection(s)).toThrow(/heroStrategy/)
  })
})

describe('buildStrategy overrides', () => {
  it('applies a rank override only to the named decision', () => {
    const s = set()
    const jev = resolveDirection(s)
    const overridden = buildStrategy(s, new Map([['ctaStrategy', 1]]))

    expect(overridden.departures).toHaveLength(1)
    expect(overridden.departures[0].decisionId).toBe('ctaStrategy')

    const changed = diffStrategies(jev.strategy, overridden.strategy).map((d) => d.key)
    expect(changed).toEqual(['ctaStrategy'])
  })

  it('reports the from/to labels and probabilities for a departure', () => {
    const s = set()
    const d = s.decisions.ctaStrategy
    if (d.type !== 'choice') throw new Error('fixture changed shape')
    const overridden = buildStrategy(s, new Map([['ctaStrategy', 1]]))
    const dep = overridden.departures[0]
    expect(dep.from).toBe(d.ranked[0].label)
    expect(dep.to).toBe(d.ranked[1].label)
    expect(dep.fromProbability).toBe(d.ranked[0].probability)
    expect(dep.toProbability).toBe(d.ranked[1].probability)
  })

  it('an override of rank 0 is not a departure', () => {
    const s = set()
    const overridden = buildStrategy(s, new Map([['ctaStrategy', 0]]))
    expect(overridden.departures).toEqual([])
  })
})

describe('planSections', () => {
  it('always ends on a CTA and never repeats a section', () => {
    const { strategy } = resolveDirection(set())
    const s = planSections(strategy)
    expect(s.at(-1)).toBe('cta')
    expect(new Set(s).size).toBe(s.length)
  })

  it('omits pricing when Jev says price does not matter', () => {
    const { strategy } = resolveDirection(set())
    const s = planSections({ ...strategy, offerProminence: 0 })
    expect(s).not.toContain('pricing')
  })

  it('leads with the explainer when education is required', () => {
    const { strategy } = resolveDirection(set())
    const s = planSections({ ...strategy, requiresEducation: true })
    expect(s[0]).toBe('explainer')
  })

  it('keeps a focused page shorter than a comprehensive one', () => {
    const { strategy } = resolveDirection(set())
    const focused = planSections({ ...strategy, pageArchitecture: 'focused' })
    const full = planSections({ ...strategy, pageArchitecture: 'comprehensive' })
    expect(focused.length).toBeLessThan(full.length)
  })
})
