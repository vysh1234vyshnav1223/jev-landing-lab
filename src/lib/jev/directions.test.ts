import { describe, expect, it } from 'vitest'
import { buildExecution } from '@/lib/jev/directions'
import { normalizeDecisions } from '@/lib/jev/normalize'
import { fixtureDecisionsResponse } from '@/lib/jev/fixtures'

const set = () => normalizeDecisions(fixtureDecisionsResponse(), 100)

describe('buildExecution', () => {
  it('takes Jev’s top pick on every decision', () => {
    const s = set()
    const a = buildExecution(s)
    expect(a.departures).toEqual([])
    for (const d of Object.values(s.decisions)) {
      if (d.type === 'choice') {
        expect(a.execution[d.id as 'visualDirection']).toBe(d.ranked[0].option)
      }
    }
  })

  it('is deterministic', () => {
    expect(JSON.stringify(buildExecution(set()))).toBe(JSON.stringify(buildExecution(set())))
  })

  it('refuses to resolve when a decision is missing', () => {
    const s = set()
    delete s.decisions.visualDirection
    expect(() => buildExecution(s)).toThrow(/visualDirection/)
  })

  it('applies a rank override only to the named decision', () => {
    const s = set()
    const jev = buildExecution(s).execution
    const overridden = buildExecution(s, new Map([['visualDirection', 1]]))

    expect(overridden.departures).toHaveLength(1)
    expect(overridden.departures[0].decisionId).toBe('visualDirection')
    const changed = (Object.keys(jev) as (keyof typeof jev)[]).filter((k) => jev[k] !== overridden.execution[k])
    expect(changed).toEqual(['visualDirection'])
  })

  it('reports the from/to labels and probabilities for a departure', () => {
    const s = set()
    const d = s.decisions.visualDirection
    if (d.type !== 'choice') throw new Error('fixture changed shape')
    const dep = buildExecution(s, new Map([['visualDirection', 1]])).departures[0]
    expect(dep.from).toBe(d.ranked[0].label)
    expect(dep.to).toBe(d.ranked[1].label)
    expect(dep.fromProbability).toBe(d.ranked[0].probability)
    expect(dep.toProbability).toBe(d.ranked[1].probability)
  })

  it('an override of rank 0 is not a departure', () => {
    expect(buildExecution(set(), new Map([['visualDirection', 0]])).departures).toEqual([])
  })
})
