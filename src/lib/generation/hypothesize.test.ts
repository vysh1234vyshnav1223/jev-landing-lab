import { afterEach, describe, expect, it, vi } from 'vitest'
import { hypothesize, withIds } from '@/lib/generation/hypothesize'
import { fixtureBrief, fixtureHypotheses } from '@/lib/generation/fixtures'
import { hypothesisIssues, type HypothesisDraft } from '@/schemas/strategy'

/**
 * Hypotheses must be strategies the blueprint can honour: sections from their
 * own archetype only, and genuinely different from each other.
 */

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

const drafts = (): HypothesisDraft[] => fixtureHypotheses()

function stubModel(...responses: object[]) {
  const fetchMock = vi.fn(async () => {
    const r = responses[Math.min(fetchMock.mock.calls.length, responses.length) - 1]
    return {
      ok: true,
      json: async () => ({ choices: [{ message: { content: JSON.stringify(r) }, finish_reason: 'stop' }] }),
      text: async () => '',
    } as unknown as Response
  })
  vi.stubGlobal('fetch', fetchMock)
  vi.stubEnv('OPENROUTER_API_KEY', 'test-key')
  return fetchMock
}

describe('hypothesisIssues', () => {
  it('accepts a strategy inside its archetype', () => {
    expect(hypothesisIssues(drafts()[0])).toEqual([])
  })

  it('flags a section from outside the archetype', () => {
    const d = drafts()[0]
    d.sections.push({ type: 'codeSample', purpose: 'API', essential: false })
    expect(hypothesisIssues(d).join()).toMatch(/codeSample/)
  })
})

describe('hypothesize', () => {
  it('retries candidates that borrow sections, then returns them with ids', async () => {
    const bad = drafts()
    bad[1].sections[0] = { type: 'pricing', purpose: 'Plans', essential: true }
    const fetchMock = stubModel({ strategies: bad }, { strategies: drafts() })
    const result = await hypothesize(fixtureBrief())
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(result.map((h) => h.id)).toEqual(fixtureHypotheses().map((h) => h.id))
  })

  it('allows two candidates that share a structure but argue differently', async () => {
    const twins = drafts()
    twins[2] = { ...twins[0], name: 'Same sections, other argument' }
    const fetchMock = stubModel({ strategies: twins })
    await hypothesize(fixtureBrief())
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('rejects a set where every candidate has one structure', async () => {
    const [a] = drafts()
    const clones = [a, { ...a, name: 'Clone two' }, { ...a, name: 'Clone three' }]
    const fetchMock = stubModel({ strategies: clones }, { strategies: drafts() })
    await hypothesize(fixtureBrief())
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})

describe('withIds', () => {
  it('derives readable ids and de-duplicates them', () => {
    const [a] = drafts()
    expect(withIds([a, a]).map((h) => h.id)).toEqual(['search_first_prove_it_after', 'search_first_prove_it_after_2'])
  })
})
