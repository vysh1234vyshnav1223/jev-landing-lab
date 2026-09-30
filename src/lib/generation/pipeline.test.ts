import { describe, expect, it } from 'vitest'
import { resolveDirection } from '@/lib/jev/directions'
import { normalizeDecisions } from '@/lib/jev/normalize'
import { fixtureDecisionsResponse } from '@/lib/jev/fixtures'
import { fixtureSpec } from '@/lib/generation/fixtures'
import { landingPageSpec } from '@/schemas/spec'

/**
 * Integration: Jev answers → decisions → strategy → spec.
 * No network. This is the chain the whole product rests on.
 */

const decisions = normalizeDecisions(fixtureDecisionsResponse(), 150)
const direction = resolveDirection(decisions)
const spec = fixtureSpec(direction.strategy)

describe('brief → decisions → strategy → spec', () => {
  it('produces a valid spec', () => {
    expect(landingPageSpec.safeParse(spec).success).toBe(true)
  })

  it('renders the hero variant Jev selected', () => {
    expect(spec.hero.variant).toBe(direction.strategy.heroStrategy)
  })

  it('applies the theme Jev selected', () => {
    expect(spec.theme.direction).toBe(direction.strategy.visualDirection)
  })

  it('caps navigation at the count Jev implied', () => {
    const expected = [1, 3, 5][direction.strategy.navigationComplexity]
    expect(spec.navigation.links.length).toBeLessThanOrEqual(expected)
  })

  it('shows trust signals only when Jev flagged trust as the barrier', () => {
    const signals = spec.hero.trustSignals.length
    expect(signals > 0).toBe(direction.strategy.trustIsPrimaryBarrier)
  })

  it('reflects an overridden strategy in the rendered spec', () => {
    const runnerUp = decisions.decisions.ctaStrategy
    if (runnerUp.type !== 'choice' || runnerUp.ranked.length < 2) {
      throw new Error('fixture changed shape')
    }
    const edited = fixtureSpec({ ...direction.strategy, ctaStrategy: runnerUp.ranked[1].option })
    expect(edited.hero.primaryCta).not.toBe(spec.hero.primaryCta)
  })
})

describe('spec schema', () => {
  it('rejects an unknown section type', () => {
    const bad = structuredClone(spec) as unknown as { sections: unknown[] }
    bad.sections = [{ type: 'carousel', heading: 'Nope' }]
    expect(landingPageSpec.safeParse(bad).success).toBe(false)
  })

  it('rejects an unknown theme direction', () => {
    const bad = structuredClone(spec) as unknown as { theme: { direction: string } }
    bad.theme.direction = 'neon_brutalist'
    expect(landingPageSpec.safeParse(bad).success).toBe(false)
  })
})
