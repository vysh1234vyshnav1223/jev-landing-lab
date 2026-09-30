import { beforeAll, describe, expect, it, vi } from 'vitest'
import { runPipeline, type StageEvent } from '@/lib/generation/pipeline'
import { buildBlueprint, checkBlueprint } from '@/lib/generation/blueprint'
import { fixtureSpec } from '@/lib/generation/fixtures'
import { buildExecution } from '@/lib/jev/directions'
import { landingPageSpec } from '@/schemas/spec'

/**
 * Integration, offline (USE_FIXTURES=1): the whole streamed pipeline, and the
 * "what if Jev had chosen the runner-up" path Compare takes. No network.
 */

const events: StageEvent[] = []
const done = <S extends StageEvent['stage']>(stage: S) =>
  events.find((e) => e.stage === stage && e.status === 'done') as Extract<StageEvent, { stage: S; status: 'done' }>

beforeAll(async () => {
  vi.stubEnv('USE_FIXTURES', '1')
  vi.spyOn(console, 'log').mockImplementation(() => {})
  for await (const e of runPipeline({ brief: 'A flight booking site for budget travellers in India.' })) events.push(e)
})

describe('runPipeline (fixtures)', () => {
  it('streams every stage in order, start then done', () => {
    expect(events.map((e) => `${e.stage}:${e.status}`)).toEqual([
      'interpreting:start', 'interpreting:done',
      'hypothesizing:start', 'hypothesizing:done',
      'deciding:start', 'deciding:done',
      'blueprinting:start', 'blueprinting:done',
      'composing:start', 'composing:done',
      'critiquing:start', 'critiquing:done',
      'done:done',
    ])
  })

  it('builds the blueprint from Jev’s top-ranked strategy', () => {
    expect(done('blueprinting').blueprint.strategyId).toBe(done('deciding').judgment.ranked[0].id)
  })

  it('produces a valid page that passes every blueprint rule', () => {
    const { spec, critique } = done('critiquing')
    expect(landingPageSpec.safeParse(spec).success).toBe(true)
    expect(checkBlueprint(spec, done('blueprinting').blueprint)).toEqual([])
    expect(critique).toMatchObject({ valid: true, reviewer: 'rules' })
  })

  it('applies the theme and hero the blueprint fixed', () => {
    const { blueprint } = done('blueprinting')
    const { spec } = done('critiquing')
    expect(spec.theme.direction).toBe(blueprint.visual.direction)
    expect(spec.hero.variant).toBe(blueprint.hero.variant)
    expect(spec.hero.trustSignals.length > 0).toBe(blueprint.hero.trustSignals)
  })
})

describe('the runner-up (Compare)', () => {
  it('builds a structurally different page from the same judgment', () => {
    const { brief } = done('interpreting')
    const { hypotheses } = done('hypothesizing')
    const { decisions, judgment } = done('deciding')
    const jev = done('blueprinting').blueprint

    const runnerUp = hypotheses.find((h) => h.id === judgment.ranked[1].id)!
    const alt = buildBlueprint(brief, runnerUp, buildExecution(decisions).execution)
    const spec = fixtureSpec(alt, 1)

    expect(alt.strategyId).not.toBe(jev.strategyId)
    expect(alt.sections.map((s) => s.type)).not.toEqual(jev.sections.map((s) => s.type))
    expect(checkBlueprint(spec, alt)).toEqual([])
  })

  it('carries an execution override into the blueprint', () => {
    const { brief } = done('interpreting')
    const { hypotheses } = done('hypothesizing')
    const { decisions, judgment } = done('deciding')
    const chosen = hypotheses.find((h) => h.id === judgment.selected)!
    const edited = buildBlueprint(brief, chosen, buildExecution(decisions, new Map([['visualDirection', 1]])).execution)
    expect(edited.visual.direction).not.toBe(done('blueprinting').blueprint.visual.direction)
  })
})

describe('spec schema', () => {
  it('rejects an unknown section type', () => {
    const bad = structuredClone(done('critiquing').spec) as unknown as { sections: unknown[] }
    bad.sections = [{ type: 'carousel', heading: 'Nope' }]
    expect(landingPageSpec.safeParse(bad).success).toBe(false)
  })

  it('rejects an unknown theme direction', () => {
    const bad = structuredClone(done('critiquing').spec) as unknown as { theme: { direction: string } }
    bad.theme.direction = 'neon_brutalist'
    expect(landingPageSpec.safeParse(bad).success).toBe(false)
  })
})
