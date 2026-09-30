import { afterEach, describe, expect, it, vi } from 'vitest'
import { critique } from '@/lib/generation/critique'
import { buildBlueprint } from '@/lib/generation/blueprint'
import { fixtureBrief, fixtureHypotheses, fixtureSpec } from '@/lib/generation/fixtures'
import type { Execution } from '@/lib/jev/directions'

/**
 * The critic reviews, and the repair rewrites ONLY what was flagged.
 */

const brief = fixtureBrief()
const execution: Execution = {
  socialProofType: 'ratings_reviews',
  visualDirection: 'clean_utility',
  navigationComplexity: 1,
  offerProminence: 2,
  trustIsPrimaryBarrier: false,
  requiresEducation: false,
}
const bp = buildBlueprint(brief, fixtureHypotheses()[2], execution)
const draft = fixtureSpec(bp)

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

/** Answers the review call, then the repair call, in that order. */
function stubModel(...responses: (object | Error)[]) {
  const calls: { response_format: { json_schema: { name: string; schema: { properties: object } } } }[] = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (_url: string, init: RequestInit) => {
      calls.push(JSON.parse(init.body as string))
      const r = responses[calls.length - 1]
      if (r instanceof Error) throw r
      return {
        ok: true,
        json: async () => ({ choices: [{ message: { content: JSON.stringify(r) }, finish_reason: 'stop' }] }),
        text: async () => '',
      } as unknown as Response
    }),
  )
  vi.stubEnv('OPENROUTER_API_KEY', 'test-key')
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  return calls
}

const duplicate = {
  type: 'duplication',
  severity: 'blocking',
  target: 's2_featureGrid',
  reason: 'Repeats the showcase point about cheap routes.',
  fix: 'Make it about fare alerts only.',
}

describe('critique', () => {
  it('passes a clean page without repairing', async () => {
    const calls = stubModel({ issues: [] })
    const result = await critique(brief, bp, draft)
    expect(calls).toHaveLength(1)
    expect(result.critique).toMatchObject({ valid: true, repaired: [], reviewer: 'model' })
    expect(result.spec).toEqual(draft)
  })

  it('repairs only the flagged section, under that slot’s schema', async () => {
    const replacement = {
      s2_featureGrid: {
        type: 'featureGrid', heading: 'Let the fare come to you', subheading: null, tone: null, layout: 'list',
        items: [
          { icon: 'bell', title: 'Alerts', body: 'b' },
          { icon: 'calendar', title: 'Month view', body: 'b' },
        ],
      },
    }
    const calls = stubModel({ issues: [duplicate, { ...duplicate, severity: 'minor', target: 'hero' }] }, replacement)
    const result = await critique(brief, bp, draft)

    expect(Object.keys(calls[1].response_format.json_schema.schema.properties)).toEqual(['s2_featureGrid'])
    expect(result.critique).toMatchObject({ valid: true, repaired: ['s2_featureGrid'] })
    expect(result.critique.issues).toHaveLength(2)

    const changed = result.spec.sections.filter((s, i) => JSON.stringify(s) !== JSON.stringify(draft.sections[i]))
    expect(changed.map((s) => s.slot)).toEqual(['s2_featureGrid'])
    expect(result.spec.hero).toEqual(draft.hero)
  })

  it('lets a repair drop an optional section', async () => {
    stubModel({ issues: [{ ...duplicate, target: 's3_stats', type: 'irrelevant_section' }] }, { s3_stats: null })
    const result = await critique(brief, bp, draft)
    expect(result.spec.sections.map((s) => s.slot)).not.toContain('s3_stats')
    expect(result.critique.valid).toBe(true)
  })

  it('keeps the draft and reports rules-only if the reviewer fails', async () => {
    stubModel(new Error('network down'))
    const result = await critique(brief, bp, draft)
    expect(result.spec).toEqual(draft)
    expect(result.critique).toMatchObject({ reviewer: 'rules', valid: true })
  })

  it('reports an unresolved issue when the repair fails', async () => {
    stubModel({ issues: [duplicate] }, new Error('network down'))
    const result = await critique(brief, bp, draft)
    expect(result.spec).toEqual(draft)
    expect(result.critique.valid).toBe(false)
    expect(result.critique.remaining).toEqual([duplicate])
  })
})
