import { describe, expect, it } from 'vitest'
import { buildBlueprint, checkBlueprint } from '@/lib/generation/blueprint'
import { executionSchema, toSpec, type ComposerOutput } from '@/lib/generation/compose'
import { strictJsonSchema } from '@/lib/generation/prompting'
import type { Execution } from '@/lib/jev/directions'
import type { ProductBrief } from '@/schemas/brief'
import { landingPageSpec } from '@/schemas/spec'
import type { StrategyHypothesis } from '@/schemas/strategy'

/**
 * The enforcement boundary. A strategy that asks for sections its kind of page
 * has no use for — here, a sports store asking for a pricing table, a
 * comparison and integrations — must lose them in code, and the composer must
 * never be offered them at all.
 */

const store: ProductBrief = {
  productName: 'Stride North',
  industry: 'sports retail',
  product: 'An independent running store selling shoes, jackets and watches online.',
  audience: 'Road and trail runners',
  primaryGoal: 'Buy running gear online',
  secondaryGoals: [],
  brandAttributes: ['knowledgeable', 'local'],
  conversionAction: 'buy running gear',
  geography: 'UK',
  competitors: [],
  priceContext: null,
}

const execution: Execution = {
  socialProofType: 'ratings_reviews',
  visualDirection: 'bold_confident',
  navigationComplexity: 1,
  offerProminence: 0,
  trustIsPrimaryBarrier: false,
  requiresEducation: false,
}

// Deliberately bad: built by hand, bypassing the hypothesis validator, the way
// a tampered Compare request would arrive.
const leaky: StrategyHypothesis = {
  id: 'guided_selection',
  name: 'Guided selection',
  archetype: 'commerce_catalog',
  thesis: 'Runners buy when they know which shoe fits how they run.',
  persuasion: 'Expert guidance',
  audienceFraming: 'A runner unsure which shoe suits them',
  narrative: ['How do you run', 'Pick by use', 'Shop', 'Reviews', 'Buy'],
  hero: { variant: 'product_demo', purpose: 'Show the fitting' },
  conversion: { approach: 'direct_action', rationale: 'They came to buy.' },
  sections: [
    { type: 'useCases', purpose: 'Road, trail, race day', essential: true },
    { type: 'pricing', purpose: 'Membership tiers', essential: true },
    { type: 'showcase', purpose: 'The collection', essential: true },
    { type: 'comparison', purpose: 'Us vs big retailers', essential: true },
    { type: 'integrations', purpose: 'Strava sync', essential: false },
    { type: 'testimonials', purpose: 'Runners who got fitted', essential: true },
    { type: 'cta', purpose: 'Shop now', essential: true },
  ],
}

const bp = buildBlueprint(store, leaky, execution)
const LEAKED = ['pricing', 'comparison', 'integrations', 'codeSample']

describe('buildBlueprint — forbidden sections', () => {
  it('removes every section outside the archetype, with a reason', () => {
    expect(bp.sections.map((s) => s.type)).toEqual(['useCases', 'showcase', 'testimonials', 'cta'])
    expect(bp.removed.map((r) => r.type)).toEqual(['pricing', 'comparison', 'integrations'])
    expect(bp.removed.every((r) => r.reason.length > 0)).toBe(true)
  })

  it('forbids what the archetype does not use', () => {
    const forbidden = bp.forbidden.map((f) => f.type)
    for (const t of [...LEAKED, 'explainer', 'stats']) expect(forbidden).toContain(t)
  })

  it('replaces a hero the archetype does not offer', () => {
    expect(bp.hero.variant).toBe('value_prop')
  })

  it('keeps the strategy’s order', () => {
    expect(bp.sections.map((s) => s.key)).toEqual(['s1_useCases', 's2_showcase', 's3_testimonials', 's4_cta'])
  })

  it('never offers the composer a forbidden type', () => {
    const json = JSON.stringify(strictJsonSchema(executionSchema(bp)))
    for (const t of LEAKED) expect(json).not.toContain(`"${t}"`)
  })
})

describe('buildBlueprint — Jev gates', () => {
  const saas: StrategyHypothesis = {
    ...leaky,
    id: 'saas',
    archetype: 'saas_product',
    hero: { variant: 'value_prop', purpose: 'p' },
    sections: [
      { type: 'explainer', purpose: 'How it works', essential: true },
      { type: 'pricing', purpose: 'Plans', essential: true },
      { type: 'comparison', purpose: 'Vs Amplitude', essential: true },
      { type: 'cta', purpose: 'Start', essential: true },
    ],
  }
  const withRival = { ...store, competitors: ['Amplitude'] }

  it('allows pricing only when Jev says the offer leads', () => {
    expect(buildBlueprint(withRival, saas, { ...execution, offerProminence: 2 }).sections.map((s) => s.type)).toContain('pricing')
    const secondary = buildBlueprint(withRival, saas, { ...execution, offerProminence: 1 })
    expect(secondary.sections.map((s) => s.type)).not.toContain('pricing')
    expect(secondary.offer.pricesAllowed).toBe(true)
  })

  it('bans prices from copy entirely when Jev says price is absent', () => {
    expect(buildBlueprint(withRival, saas, execution).offer.pricesAllowed).toBe(false)
  })

  it('allows a comparison only when the brief names alternatives', () => {
    expect(buildBlueprint(store, saas, execution).removed.map((r) => r.type)).toContain('comparison')
    expect(buildBlueprint(withRival, saas, execution).sections.map((s) => s.type)).toContain('comparison')
  })

  it('makes teaching optional when Jev says no education is needed', () => {
    const slot = (e: Execution) => buildBlueprint(withRival, saas, e).sections.find((s) => s.type === 'explainer')!
    expect(slot(execution).required).toBe(false)
    expect(slot({ ...execution, requiresEducation: true }).required).toBe(true)
  })

  it('does not show quotes twice when Jev’s proof form is testimonials', () => {
    const both = {
      ...saas,
      sections: [
        { type: 'socialProof' as const, purpose: 'Proof', essential: true },
        { type: 'testimonials' as const, purpose: 'Stories', essential: true },
        { type: 'cta' as const, purpose: 'Start', essential: true },
      ],
    }
    const types = (e: Execution) => buildBlueprint(withRival, both, e).sections.map((s) => s.type)
    expect(types({ ...execution, socialProofType: 'testimonials' })).toEqual(['testimonials', 'cta'])
    expect(types({ ...execution, socialProofType: 'metrics' })).toEqual(['socialProof', 'testimonials', 'cta'])
  })

  it('always ends the page on an ask', () => {
    const trailing = { ...saas, sections: saas.sections.filter((s) => s.type !== 'cta') }
    const out = buildBlueprint(withRival, trailing, execution)
    expect(out.sections.at(-1)).toMatchObject({ type: 'cta', required: true })
    expect(buildBlueprint(withRival, saas, execution).sections.filter((s) => s.type === 'cta')).toHaveLength(1)
  })

  it('takes theme, proof form and navigation from Jev', () => {
    expect(bp.visual.direction).toBe('bold_confident')
    expect(bp.proof.type).toBe('ratings_reviews')
    expect(bp.navigation).toEqual({ maxLinks: 3, sticky: true })
  })
})

/* ── the composer schema enforces the blueprint ─────────────── */

function page(sections: Record<string, unknown>): ComposerOutput {
  return {
    theme: { direction: 'bold_confident', accent: 'rose' },
    navigation: { wordmark: 'Stride', links: [{ label: 'Shoes', href: '#' }], ctaLabel: 'Shop' },
    hero: {
      variant: 'value_prop',
      eyebrow: null,
      headline: 'Shoes fitted by runners',
      subheadline: 'Road, trail and race day.',
      primaryCta: 'Shop shoes',
      secondaryCta: null,
      trustSignals: [],
      searchFields: [],
      demoSteps: [],
    },
    sections,
    footer: { tagline: 'Stride North', columns: [] },
  }
}

const valid = {
  s1_useCases: {
    type: 'useCases', heading: 'How do you run?', subheading: null, tone: null, layout: 'tabs',
    items: [
      { icon: 'mountain', title: 'Trail', body: 'Grip.', recommendation: 'Speedgoat 6' },
      { icon: 'route', title: 'Road', body: 'Cushion.', recommendation: 'Novablast 5' },
    ],
  },
  s2_showcase: {
    type: 'showcase', heading: 'The wall', subheading: null, tone: null, layout: 'grid', categories: ['Trail'],
    items: [1, 2, 3].map((n) => ({ title: `Shoe ${n}`, meta: 'In stock', detail: 'd', category: 'Trail', badge: null })),
  },
  s3_testimonials: {
    type: 'testimonials', heading: 'Fitted here', subheading: null, tone: null, layout: 'grid',
    items: [1, 2].map((n) => ({ quote: 'Great fit.', name: `Runner ${n}`, role: 'Leeds' })),
  },
  s4_cta: { type: 'cta', heading: 'Find yours', subheading: null, tone: null, layout: 'card', primaryCta: 'Shop', secondaryCta: null, reassurance: null },
}

describe('executionSchema', () => {
  const schema = executionSchema(bp)

  it('accepts a page that fills the blueprint', () => {
    expect(schema.safeParse(page(valid)).success).toBe(true)
  })

  it('rejects a section of the wrong type in a slot', () => {
    const swapped = { ...valid, s2_showcase: { type: 'pricing', heading: 'Plans', plans: [] } }
    expect(schema.safeParse(page(swapped)).success).toBe(false)
  })

  it('rejects a missing required slot', () => {
    const rest: Record<string, unknown> = { ...valid }
    delete rest.s3_testimonials
    expect(schema.safeParse(page(rest)).success).toBe(false)
  })

  it('rejects a hero variant other than the blueprint’s', () => {
    const p = page(valid) as { hero: { variant: string } }
    p.hero.variant = 'search_first'
    expect(schema.safeParse(p).success).toBe(false)
  })

  it('drops any extra section the model tries to add', () => {
    const extra = { ...valid, s9_pricing: { type: 'pricing', heading: 'Plans' } }
    const parsed = schema.parse(page(extra)) as ComposerOutput
    expect(toSpec(parsed, bp).sections.map((s) => s.type)).toEqual(['useCases', 'showcase', 'testimonials', 'cta'])
  })
})

describe('checkBlueprint', () => {
  const spec = toSpec(executionSchema(bp).parse(page(valid)) as ComposerOutput, bp)

  it('passes a page composed under the blueprint', () => {
    expect(checkBlueprint(spec, bp)).toEqual([])
  })

  it('flags a forbidden section that got in some other way', () => {
    const bad = landingPageSpec.parse({
      ...spec,
      sections: [
        ...spec.sections,
        {
          type: 'pricing', heading: 'Plans',
          plans: [1, 2].map((n) => ({ name: `P${n}`, monthlyPrice: '9', annualPrice: '7', period: 'mo', description: 'd', features: ['a', 'b'], cta: 'Go' })),
        },
      ],
    })
    const issues = checkBlueprint(bad, bp)
    expect(issues.some((i) => i.type === 'off_blueprint' && i.severity === 'blocking' && /pricing/.test(i.reason))).toBe(true)
  })

  it('flags a price in copy when Jev said price is absent', () => {
    const priced = structuredClone(spec)
    priced.hero.subheadline = 'Trail shoes from £89.'
    const issues = checkBlueprint(priced, bp)
    expect(issues).toContainEqual(expect.objectContaining({ type: 'unsupported_claim', target: 'hero', severity: 'blocking' }))
  })

  it('flags a missing required section', () => {
    const thin = { ...spec, sections: spec.sections.filter((s) => s.type !== 'testimonials') }
    expect(checkBlueprint(thin, bp)).toContainEqual(expect.objectContaining({ target: 's3_testimonials' }))
  })
})
