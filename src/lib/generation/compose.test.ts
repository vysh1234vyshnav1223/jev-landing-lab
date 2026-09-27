import { afterEach, describe, expect, it, vi } from 'vitest'
import { composeSpec } from '@/lib/generation/compose'
import { planSections } from '@/lib/generation/architecture'
import type { Strategy } from '@/lib/jev/directions'
import type { ProductBrief } from '@/schemas/brief'

/**
 * Regression: composeSpec used to silently drop any section the architecture
 * asked for but the model's response simply didn't include — no error, no
 * retry, just a thinner page than planSections() actually specified. The fix
 * makes a missing section a validation failure, which the existing repair
 * loop in generateStructured retries like any other malformed response.
 */

const brief: ProductBrief = {
  productName: 'Wayfare',
  industry: 'travel',
  product: 'A flight booking platform.',
  audience: 'Budget travellers',
  primaryGoal: 'Search for flights',
  secondaryGoals: [],
  brandAttributes: ['fast', 'affordable'],
  conversionAction: 'search for flights',
  geography: 'India',
  competitors: [],
  priceContext: null,
}

const strategy: Strategy = {
  heroStrategy: 'search_first',
  ctaStrategy: 'direct_action',
  socialProofType: 'metrics',
  contentHierarchy: 'utility',
  visualDirection: 'clean_utility',
  pageArchitecture: 'focused',
  navigationComplexity: 1,
  interactionDensity: 1,
  offerProminence: 0,
  trustIsPrimaryBarrier: false,
  audienceIsPriceSensitive: false,
  requiresEducation: false,
}

// planSections(strategy) for these inputs is ['featureGrid', 'stats', 'cta'].
const wanted = planSections(strategy)

function sectionPayload(types: string[]) {
  return types.map((type) => {
    if (type === 'featureGrid') {
      return {
        type,
        heading: 'h',
        subheading: null,
        items: [
          { icon: 'zap', title: 't1', body: 'b1' },
          { icon: 'shield-check', title: 't2', body: 'b2' },
        ],
      }
    }
    if (type === 'stats') {
      return {
        type,
        heading: 'h',
        subheading: null,
        items: [
          { value: '1', label: 'l1' },
          { value: '2', label: 'l2' },
        ],
      }
    }
    return { type, heading: 'h', primaryCta: 'Go', secondaryCta: 'Learn more', reassurance: 'Free.' }
  })
}

function fullSpecBody(sections: string[]) {
  return {
    navigation: { wordmark: 'W', links: [{ label: 'Home', href: '#' }], ctaLabel: 'Go', sticky: false },
    hero: {
      variant: 'search_first',
      eyebrow: null,
      headline: 'Find flights fast',
      subheadline: 'Compare fares in seconds.',
      primaryCta: 'Search',
      secondaryCta: 'Learn more',
      trustSignals: [],
      searchFields: [{ label: 'From', placeholder: 'DEL', kind: 'text', options: [] }],
      demoSteps: [],
    },
    sections: sectionPayload(sections),
    footer: { tagline: 'Wayfare.', columns: [] },
  }
}

function chatCompletion(content: unknown) {
  return {
    ok: true,
    json: async () => ({ choices: [{ message: { content: JSON.stringify(content) }, finish_reason: 'stop' }] }),
    text: async () => '',
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('composeSpec — missing-section retry', () => {
  it('retries when the model omits a wanted section, and succeeds once all are present', async () => {
    expect(wanted).toEqual(['featureGrid', 'stats', 'cta'])

    const calls: unknown[] = []
    const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
      calls.push(JSON.parse(init.body as string))
      // First response: missing 'stats' entirely. Second: complete.
      if (calls.length === 1) return chatCompletion(fullSpecBody(['featureGrid', 'cta'])) as unknown as Response
      return chatCompletion(fullSpecBody(['featureGrid', 'stats', 'cta'])) as unknown as Response
    })
    vi.stubGlobal('fetch', fetchMock)
    vi.stubEnv('OPENROUTER_API_KEY', 'test-key')
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'http://localhost:3000')
    vi.stubEnv('COMPOSING_MODEL', 'openai/gpt-5-nano')

    const spec = await composeSpec(brief, strategy)

    expect(calls).toHaveLength(2)
    expect(spec.sections.map((s) => s.type)).toEqual(['featureGrid', 'stats', 'cta'])
  })

  it('never returns a spec thinner than what the architecture asked for, even after retries are spent', async () => {
    const fetchMock = vi.fn(
      async () => chatCompletion(fullSpecBody(['featureGrid', 'cta'])) as unknown as Response,
    )
    vi.stubGlobal('fetch', fetchMock)
    vi.stubEnv('OPENROUTER_API_KEY', 'test-key')
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'http://localhost:3000')
    vi.stubEnv('COMPOSING_MODEL', 'openai/gpt-5-nano')

    // Must throw, not resolve with a 2-section spec — the bug this guards
    // against was exactly that: a silent, thinner-than-planned page.
    await expect(composeSpec(brief, strategy)).rejects.toThrow(/stats/)
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })
})
