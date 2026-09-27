import { randomUUID } from 'node:crypto'
import { env } from '@/config/env'
import { PipelineError, toPipelineError } from '@/lib/errors'
import { decide } from '@/lib/jev/client'
import { resolveDirection, type ResolvedDirection } from '@/lib/jev/directions'
import { normalizeDecisions } from '@/lib/jev/normalize'
import { fixtureDecisionsResponse } from '@/lib/jev/fixtures'
import { extractBrief } from '@/lib/generation/brief'
import { composeSpec } from '@/lib/generation/compose'
import { fixtureBrief, fixtureSpec } from '@/lib/generation/fixtures'
import type { BriefInput, ProductBrief } from '@/schemas/brief'
import type { DecisionSet } from '@/schemas/decisions'
import type { LandingPageSpec } from '@/schemas/spec'

/**
 * The whole pipeline, as one async generator of stage events.
 *
 *   ① interpreting  free text        → ProductBrief    (generative)
 *   ② deciding      ProductBrief     → DecisionSet     (JEV)
 *   ③ resolving     DecisionSet      → Strategy        (pure TypeScript)
 *   ④ composing     brief+strategy   → LandingPageSpec (generative)
 *
 * Exactly one Jev call and two generative calls.
 */

export type Stage = 'interpreting' | 'deciding' | 'resolving' | 'composing' | 'done'

export type StageEvent =
  | { stage: Exclude<Stage, 'done'>; status: 'start'; requestId: string }
  | { stage: 'interpreting'; status: 'done'; ms: number; brief: ProductBrief }
  | { stage: 'deciding'; status: 'done'; ms: number; decisions: DecisionSet }
  | { stage: 'resolving'; status: 'done'; ms: number; direction: ResolvedDirection }
  | { stage: 'composing'; status: 'done'; ms: number; spec: LandingPageSpec }
  | { stage: 'done'; status: 'done'; ms: number }
  | {
      stage: Stage
      status: 'error'
      code: PipelineError['code']
      message: string
      /** Decisions survive a composition failure, so the panel still renders. */
      decisions?: DecisionSet
      direction?: ResolvedDirection
    }

export type GenerationResult = {
  brief: ProductBrief
  decisions: DecisionSet
  direction: ResolvedDirection
  spec: LandingPageSpec
}

function log(requestId: string, stage: string, detail: Record<string, unknown>) {
  // Concise, structured, and never the user's raw brief.
  console.log(JSON.stringify({ requestId, stage, ...detail }))
}

export async function* runPipeline(
  input: BriefInput,
  apiKey?: string,
): AsyncGenerator<StageEvent> {
  const requestId = randomUUID().slice(0, 8)
  const useFixtures = env().USE_FIXTURES
  const total = Date.now()

  let brief: ProductBrief
  let decisions: DecisionSet
  let direction: ResolvedDirection

  /* ① interpreting ------------------------------------------------ */
  yield { stage: 'interpreting', status: 'start', requestId }
  try {
    const t = Date.now()
    brief = useFixtures ? fixtureBrief() : await extractBrief(input, apiKey)
    log(requestId, 'interpreting', { ms: Date.now() - t, fixtures: useFixtures })
    yield { stage: 'interpreting', status: 'done', ms: Date.now() - t, brief }
  } catch (e) {
    const err = toPipelineError(e, 'interpreting')
    log(requestId, 'interpreting', { error: err.code, message: err.message })
    yield { stage: 'interpreting', status: 'error', code: err.code, message: err.userMessage }
    return
  }

  /* ② deciding — JEV ---------------------------------------------- */
  yield { stage: 'deciding', status: 'start', requestId }
  try {
    const t = Date.now()
    decisions = useFixtures
      ? normalizeDecisions(fixtureDecisionsResponse(), 180)
      : await decide(brief, apiKey)
    log(requestId, 'deciding', {
      ms: Date.now() - t,
      decisionId: decisions.meta.decisionId,
      model: decisions.meta.model,
      cost: decisions.meta.cost,
    })
    yield { stage: 'deciding', status: 'done', ms: Date.now() - t, decisions }
  } catch (e) {
    const err = toPipelineError(e, 'deciding')
    log(requestId, 'deciding', { error: err.code, message: err.message })
    // No fake decisions. If Jev is out, the run is out — anything else would
    // quietly invalidate the experiment.
    yield { stage: 'deciding', status: 'error', code: err.code, message: err.userMessage }
    return
  }

  /* ③ resolving — pure TypeScript, the causal core ----------------- */
  yield { stage: 'resolving', status: 'start', requestId }
  try {
    const t = Date.now()
    direction = resolveDirection(decisions)
    yield { stage: 'resolving', status: 'done', ms: Date.now() - t, direction }
  } catch (e) {
    const err = toPipelineError(e, 'resolving')
    log(requestId, 'resolving', { error: err.code, message: err.message })
    yield {
      stage: 'resolving',
      status: 'error',
      code: 'JEV_MALFORMED',
      message: err.userMessage,
      decisions,
    }
    return
  }

  /* ④ composing --------------------------------------------------- */
  yield { stage: 'composing', status: 'start', requestId }
  try {
    const t = Date.now()
    const spec = useFixtures
      ? fixtureSpec(direction.strategy)
      : await composeSpec(brief, direction.strategy, apiKey)
    log(requestId, 'composing', { ms: Date.now() - t })
    yield { stage: 'composing', status: 'done', ms: Date.now() - t, spec }
  } catch (e) {
    const err = toPipelineError(e, 'composing')
    log(requestId, 'composing', { error: err.code, message: err.message })
    // Jev already succeeded — hand the decisions back so the user still sees
    // them and only this stage needs retrying.
    yield {
      stage: 'composing',
      status: 'error',
      code: err.code,
      message: err.userMessage,
      decisions,
      direction,
    }
    return
  }

  log(requestId, 'done', { ms: Date.now() - total })
  yield { stage: 'done', status: 'done', ms: Date.now() - total }
}
