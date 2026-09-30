import { afterEach, describe, expect, it, vi } from 'vitest'
import { composeSpec } from '@/lib/generation/compose'
import { buildBlueprint } from '@/lib/generation/blueprint'
import { fixtureBrief, fixtureHypotheses } from '@/lib/generation/fixtures'
import type { Execution } from '@/lib/jev/directions'

/**
 * The composer executes a blueprint; it does not design one. What it is shown,
 * and what it may return, both come from the blueprint.
 */

const brief = fixtureBrief()
const execution: Execution = {
  socialProofType: 'metrics',
  visualDirection: 'clean_utility',
  navigationComplexity: 1,
  offerProminence: 1,
  trustIsPrimaryBarrier: false,
  requiresEducation: true,
}
// "Deal discovery": showcase → featureGrid → stats (optional) → search → cta
const bp = buildBlueprint(brief, fixtureHypotheses()[2], execution)

const SECTIONS: Record<string, unknown> = {
  s1_showcase: {
    type: 'showcase', heading: 'Cheap this month', subheading: null, tone: null, layout: 'carousel', categories: [],
    items: [1, 2, 3].map((n) => ({ title: `Route ${n}`, meta: 'from 2,340', detail: 'd', category: '', badge: null })),
  },
  s2_featureGrid: {
    type: 'featureGrid', heading: 'h', subheading: null, tone: null, layout: 'list',
    items: [
      { icon: 'bell', title: 'Alerts', body: 'b' },
      { icon: 'calendar', title: 'Flexible', body: 'b' },
    ],
  },
  s3_stats: null,
  s4_search: { type: 'search', heading: 'Search', subheading: null, tone: null, tabs: [], fields: [], submitLabel: 'Search' },
  s5_cta: { type: 'cta', heading: 'Go', subheading: null, tone: null, layout: 'band', primaryCta: 'Browse routes', secondaryCta: null, reassurance: null },
}

function body(sections: Record<string, unknown>) {
  return {
    theme: { direction: 'clean_utility', accent: 'emerald' },
    navigation: { wordmark: 'Wayfare', links: [{ label: 'Deals', href: '#' }], ctaLabel: 'Sign in' },
    hero: {
      variant: 'value_prop', eyebrow: null, headline: 'Where next?', subheadline: 's', primaryCta: 'Browse routes',
      secondaryCta: null, trustSignals: [], searchFields: [], demoSteps: [],
    },
    sections,
    footer: { tagline: 'Wayfare.', columns: [] },
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

function stubModel(responses: Record<string, unknown>[]) {
  const calls: { messages: { role: string; content: string }[]; response_format: { json_schema: { schema: unknown } } }[] = []
  const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
    calls.push(JSON.parse(init.body as string))
    const sections = responses[Math.min(calls.length, responses.length) - 1]
    return {
      ok: true,
      json: async () => ({ choices: [{ message: { content: JSON.stringify(body(sections)) }, finish_reason: 'stop' }] }),
      text: async () => '',
    } as unknown as Response
  })
  vi.stubGlobal('fetch', fetchMock)
  vi.stubEnv('OPENROUTER_API_KEY', 'test-key')
  return { calls, fetchMock }
}

describe('composeSpec — executes the blueprint', () => {
  it('returns the blueprint’s sections in its order, dropping a null optional slot', async () => {
    stubModel([SECTIONS])
    const spec = await composeSpec(brief, bp)
    expect(spec.sections.map((s) => s.type)).toEqual(['showcase', 'featureGrid', 'search', 'cta'])
    expect(spec.sections.map((s) => s.slot)).toEqual(['s1_showcase', 's2_featureGrid', 's4_search', 's5_cta'])
    expect(spec.navigation.sticky).toBe(bp.navigation.sticky)
  })

  it('shows the model only the section types this blueprint uses', async () => {
    const { calls } = stubModel([SECTIONS])
    await composeSpec(brief, bp)
    const user = calls[0].messages.find((m) => m.role === 'user')!.content
    const fields = user.slice(user.indexOf('SECTION FIELDS'))
    expect(fields).toContain('- showcase:')
    expect(fields).not.toContain('- pricing:')
    expect(fields).not.toContain('- testimonials:')
    expect(user).toContain('s3_stats [optional')
    expect(user).toContain('Deal discovery')
  })

  it('sends a strict schema whose section properties are exactly the slots', async () => {
    const { calls } = stubModel([SECTIONS])
    await composeSpec(brief, bp)
    const schema = calls[0].response_format.json_schema.schema as {
      properties: { sections: { properties: Record<string, unknown>; additionalProperties: boolean } }
    }
    expect(Object.keys(schema.properties.sections.properties)).toEqual(bp.sections.map((s) => s.key))
    expect(schema.properties.sections.additionalProperties).toBe(false)
  })

  it('retries when a required slot is missing, and throws once retries are spent', async () => {
    const missing = { ...SECTIONS }
    delete missing.s4_search
    const { fetchMock } = stubModel([missing])
    await expect(composeSpec(brief, bp)).rejects.toThrow(/s4_search/)
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('recovers when the retry fills the slot', async () => {
    const missing = { ...SECTIONS }
    delete missing.s4_search
    const { fetchMock } = stubModel([missing, SECTIONS])
    const spec = await composeSpec(brief, bp)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(spec.sections.map((s) => s.type)).toContain('search')
  })
})
