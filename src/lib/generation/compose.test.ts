import { afterEach, describe, expect, it, vi } from 'vitest'
import { composeSpec } from '@/lib/generation/compose'
import type { Strategy } from '@/lib/jev/directions'
import type { ProductBrief } from '@/schemas/brief'

/**
 * The model owns structure: whatever sections it picks, in whatever order,
 * reach the page untouched. A page too thin to be one is rejected and retried.
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
    theme: { direction: 'clean_utility', accent: 'rose' },
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

function stubModel(responses: string[][]) {
  const calls: { messages: { role: string; content: string }[] }[] = []
  const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
    calls.push(JSON.parse(init.body as string))
    const sections = responses[Math.min(calls.length, responses.length) - 1]
    return chatCompletion(fullSpecBody(sections)) as unknown as Response
  })
  vi.stubGlobal('fetch', fetchMock)
  vi.stubEnv('OPENROUTER_API_KEY', 'test-key')
  vi.stubEnv('NEXT_PUBLIC_APP_URL', 'http://localhost:3000')
  vi.stubEnv('COMPOSING_MODEL', 'openai/gpt-5-nano')
  return { calls, fetchMock }
}

describe('composeSpec — model-chosen structure', () => {
  it("keeps the model's own section choice and order", async () => {
    stubModel([['stats', 'featureGrid', 'stats', 'cta']])
    const spec = await composeSpec(brief, strategy)
    expect(spec.sections.map((s) => s.type)).toEqual(['stats', 'featureGrid', 'stats', 'cta'])
  })

  it("sends Jev's answers, with their meaning, to the model", async () => {
    const { calls } = stubModel([['featureGrid', 'stats', 'cta']])
    await composeSpec(brief, strategy)
    const user = calls[0].messages.find((m) => m.role === 'user')!.content
    expect(user).toContain('Jev: search_first — Visitors already know what they want')
    expect(user).toContain('Jev: false — The audience already trusts the category')
  })

  it('retries a page with too few sections, and throws once retries are spent', async () => {
    const { fetchMock } = stubModel([['cta']])
    await expect(composeSpec(brief, strategy)).rejects.toThrow(/at least 3 sections/)
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })
})
