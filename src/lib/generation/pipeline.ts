import { randomUUID } from 'node:crypto'
import { env } from '@/config/env'
import { PipelineError, toPipelineError } from '@/lib/errors'
import { decide, readDecisions, type JevResult } from '@/lib/jev/client'
import { buildExecution } from '@/lib/jev/directions'
import { fixtureDecisionsResponse } from '@/lib/jev/fixtures'
import { extractBrief } from '@/lib/generation/brief'
import { hypothesize } from '@/lib/generation/hypothesize'
import { buildBlueprint } from '@/lib/generation/blueprint'
import { composeSpec } from '@/lib/generation/compose'
import { critique } from '@/lib/generation/critique'
import { fixtureBrief, fixtureHypotheses, fixtureSpec } from '@/lib/generation/fixtures'
import type { CritiqueReport, PageBlueprint } from '@/schemas/blueprint'
import type { BriefInput, ProductBrief } from '@/schemas/brief'
import type { DecisionSet } from '@/schemas/decisions'
import type { LandingPageSpec } from '@/schemas/spec'
import type { StrategyHypothesis, StrategyJudgment } from '@/schemas/strategy'

/**
 * The whole pipeline, as one async generator of stage events.
 *
 *   ① interpreting   free text          → ProductBrief            (model)
 *   ② hypothesizing  brief              → 3-5 strategies          (model)
 *   ③ deciding       brief + strategies → judgment + execution    (JEV)
 *   ④ blueprinting   Jev's pick         → PageBlueprint           (code)
 *   ⑤ composing      brief + blueprint  → LandingPageSpec         (model, schema-bound)
 *   ⑥ critiquing     spec vs blueprint  → report, targeted repair (code + model)
 *
 * AI proposes; Jev judges; code enforces; AI executes; a critic checks.
 */

export type Stage =
  | 'interpreting'
  | 'hypothesizing'
  | 'deciding'
  | 'blueprinting'
  | 'composing'
  | 'critiquing'
  | 'done'

export type StageEvent =
  | { stage: Exclude<Stage, 'done'>; status: 'start'; requestId: string }
  | { stage: 'interpreting'; status: 'done'; ms: number; brief: ProductBrief }
  | { stage: 'hypothesizing'; status: 'done'; ms: number; hypotheses: StrategyHypothesis[] }
  | { stage: 'deciding'; status: 'done'; ms: number; decisions: DecisionSet; judgment: StrategyJudgment }
  | { stage: 'blueprinting'; status: 'done'; ms: number; blueprint: PageBlueprint }
  | { stage: 'composing'; status: 'done'; ms: number; spec: LandingPageSpec }
  | { stage: 'critiquing'; status: 'done'; ms: number; spec: LandingPageSpec; critique: CritiqueReport }
  | { stage: 'done'; status: 'done'; ms: number }
  | {
      stage: Stage
      status: 'error'
      code: PipelineError['code']
      message: string
      /** What already succeeded survives a later failure, so the panel still renders. */
      hypotheses?: StrategyHypothesis[]
      decisions?: DecisionSet
      judgment?: StrategyJudgment
      blueprint?: PageBlueprint
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
  let hypotheses: StrategyHypothesis[]
  let jev: JevResult
  let blueprint: PageBlueprint
  let draft: LandingPageSpec

  const fail = (stage: Exclude<Stage, 'done'>, e: unknown, carry: Partial<Extract<StageEvent, { status: 'error' }>> = {}) => {
    const err = toPipelineError(e, stage)
    log(requestId, stage, { error: err.code, message: err.message })
    return { stage, status: 'error' as const, code: err.code, message: err.userMessage, ...carry }
  }

  /* ① interpreting ------------------------------------------------ */
  yield { stage: 'interpreting', status: 'start', requestId }
  try {
    const t = Date.now()
    brief = useFixtures ? fixtureBrief() : await extractBrief(input, apiKey)
    log(requestId, 'interpreting', { ms: Date.now() - t, fixtures: useFixtures })
    yield { stage: 'interpreting', status: 'done', ms: Date.now() - t, brief }
  } catch (e) {
    yield fail('interpreting', e)
    return
  }

  /* ② hypothesizing ----------------------------------------------- */
  yield { stage: 'hypothesizing', status: 'start', requestId }
  try {
    const t = Date.now()
    hypotheses = useFixtures ? fixtureHypotheses() : await hypothesize(brief, apiKey)
    log(requestId, 'hypothesizing', {
      ms: Date.now() - t,
      strategies: hypotheses.map((h) => `${h.id}:${h.archetype}`),
    })
    yield { stage: 'hypothesizing', status: 'done', ms: Date.now() - t, hypotheses }
  } catch (e) {
    yield fail('hypothesizing', e)
    return
  }

  /* ③ deciding — JEV judges the strategies ------------------------- */
  yield { stage: 'deciding', status: 'start', requestId }
  try {
    const t = Date.now()
    jev = useFixtures
      ? readDecisions(fixtureDecisionsResponse(hypotheses), 180, hypotheses)
      : await decide(brief, hypotheses, apiKey)
    log(requestId, 'deciding', {
      ms: Date.now() - t,
      decisionId: jev.decisions.meta.decisionId,
      model: jev.decisions.meta.model,
      cost: jev.decisions.meta.cost,
      selected: jev.judgment.selected,
    })
    yield { stage: 'deciding', status: 'done', ms: Date.now() - t, ...jev }
  } catch (e) {
    // No fake decisions. If Jev is out, the run is out — anything else would
    // quietly invalidate the experiment.
    yield fail('deciding', e, { hypotheses })
    return
  }

  /* ④ blueprinting — pure TypeScript, the enforcement point -------- */
  yield { stage: 'blueprinting', status: 'start', requestId }
  try {
    const t = Date.now()
    const chosen = hypotheses.find((h) => h.id === jev.judgment.selected)
    if (!chosen) throw new PipelineError('JEV_MALFORMED', 'blueprinting', "Jev's pick isn't one of the candidates.")
    blueprint = buildBlueprint(brief, chosen, buildExecution(jev.decisions).execution)
    log(requestId, 'blueprinting', {
      ms: Date.now() - t,
      sections: blueprint.sections.map((s) => s.type),
      removed: blueprint.removed.map((r) => r.type),
    })
    yield { stage: 'blueprinting', status: 'done', ms: Date.now() - t, blueprint }
  } catch (e) {
    yield fail('blueprinting', e, { hypotheses, ...jev })
    return
  }

  /* ⑤ composing — executes the blueprint --------------------------- */
  yield { stage: 'composing', status: 'start', requestId }
  try {
    const t = Date.now()
    draft = useFixtures ? fixtureSpec(blueprint) : await composeSpec(brief, blueprint, apiKey)
    log(requestId, 'composing', { ms: Date.now() - t })
    yield { stage: 'composing', status: 'done', ms: Date.now() - t, spec: draft }
  } catch (e) {
    // Jev already succeeded — hand everything back so the user still sees
    // the decisions and only this stage needs retrying.
    yield fail('composing', e, { hypotheses, ...jev, blueprint })
    return
  }

  /* ⑥ critiquing — fidelity check, targeted repair ----------------- */
  yield { stage: 'critiquing', status: 'start', requestId }
  try {
    const t = Date.now()
    const result = await critique(brief, blueprint, draft, { apiKey, review: !useFixtures })
    log(requestId, 'critiquing', {
      ms: Date.now() - t,
      reviewer: result.critique.reviewer,
      issues: result.critique.issues.map((i) => `${i.severity}:${i.type}@${i.target}`),
      repaired: result.critique.repaired,
      valid: result.critique.valid,
    })
    yield { stage: 'critiquing', status: 'done', ms: Date.now() - t, ...result }
  } catch (e) {
    yield fail('critiquing', e, { hypotheses, ...jev, blueprint })
    return
  }

  log(requestId, 'done', { ms: Date.now() - total })
  yield { stage: 'done', status: 'done', ms: Date.now() - total }
}
