import { NextRequest } from 'next/server'
import { z } from 'zod'
import { env } from '@/config/env'
import { toPipelineError } from '@/lib/errors'
import { buildExecution } from '@/lib/jev/directions'
import { buildBlueprint } from '@/lib/generation/blueprint'
import { composeSpec } from '@/lib/generation/compose'
import { critique } from '@/lib/generation/critique'
import { fixtureSpec } from '@/lib/generation/fixtures'
import { productBrief } from '@/schemas/brief'
import { decisionSet } from '@/schemas/decisions'
import { hypothesisIssues, strategyHypothesis } from '@/schemas/strategy'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 240

/**
 * "What if Jev had chosen the other strategy?" — builds a second page from
 * any candidate strategy (usually Jev's runner-up), optionally with a
 * person's overrides to Jev's execution decisions.
 *
 * Reuses stages ④–⑥ of the main pipeline unchanged: the same blueprint code,
 * the same schema-bound composer, the same critique. The only difference from
 * a normal run is which candidate and which ranks it starts from. Not
 * streamed: a single JSON response is simpler for the caller than NDJSON.
 */

const request = z.object({
  brief: productBrief,
  hypotheses: z.array(strategyHypothesis).min(1).max(5),
  decisions: decisionSet,
  /** The candidate to build. */
  strategyId: z.string(),
  /** questionId → chosen rank (0 = Jev's top pick). */
  overrides: z.record(z.string(), z.number().int().min(0)),
})

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const parsed = request.safeParse(body)

  if (!parsed.success) {
    return Response.json(
      { code: 'INVALID_INPUT', message: parsed.error.issues[0]?.message ?? 'Malformed request.' },
      { status: 400 },
    )
  }

  const { brief, hypotheses, decisions, strategyId, overrides } = parsed.data
  const hypothesis = hypotheses.find((h) => h.id === strategyId)
  // Strategies come back from the browser; one that has been edited to use
  // sections outside its archetype is rejected here rather than trusted.
  if (!hypothesis || hypothesisIssues(hypothesis).length > 0) {
    return Response.json({ code: 'INVALID_INPUT', message: 'That strategy is not one Jev judged.' }, { status: 400 })
  }

  const apiKey = req.headers.get('X-OpenRouter-Key')?.trim() || undefined
  const useFixtures = env().USE_FIXTURES
  if (!apiKey && !useFixtures) {
    return Response.json(
      { code: 'NO_API_KEY', message: 'No OpenRouter key was provided.' },
      { status: 401 },
    )
  }

  try {
    const { execution, departures } = buildExecution(decisions, new Map(Object.entries(overrides)))
    const blueprint = buildBlueprint(brief, hypothesis, execution)
    const draft = useFixtures ? fixtureSpec(blueprint, 1) : await composeSpec(brief, blueprint, apiKey)
    const result = await critique(brief, blueprint, draft, { apiKey, review: !useFixtures })
    return Response.json({ ...result, blueprint, departures })
  } catch (e) {
    const err = toPipelineError(e, 'composing')
    return Response.json({ code: err.code, message: err.userMessage }, { status: 502 })
  }
}
