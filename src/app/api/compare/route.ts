import { NextRequest } from 'next/server'
import { z } from 'zod'
import { env } from '@/config/env'
import { toPipelineError } from '@/lib/errors'
import { buildStrategy } from '@/lib/jev/directions'
import { composeSpec } from '@/lib/generation/compose'
import { fixtureSpec } from '@/lib/generation/fixtures'
import { productBrief } from '@/schemas/brief'
import { decisionSet } from '@/schemas/decisions'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * Composes a second page from Jev's own decisions plus a person's overrides.
 *
 * Reuses stage ③–④ of the main pipeline (`buildStrategy`, `composeSpec`) —
 * the only difference from a normal run is where the rank choices come from.
 * Not streamed: this is one extra generative call, not a multi-stage pass, so
 * a single JSON response is simpler for the caller than NDJSON.
 */

const request = z.object({
  brief: productBrief,
  decisions: decisionSet,
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

  const { brief, decisions, overrides } = parsed.data

  const apiKey = req.headers.get('X-OpenRouter-Key')?.trim() || undefined
  if (!apiKey && !env().USE_FIXTURES) {
    return Response.json(
      { code: 'NO_API_KEY', message: 'No OpenRouter key was provided.' },
      { status: 401 },
    )
  }

  try {
    const { strategy, departures } = buildStrategy(decisions, new Map(Object.entries(overrides)))
    const spec = env().USE_FIXTURES ? fixtureSpec(strategy, 1) : await composeSpec(brief, strategy, apiKey)
    return Response.json({ spec, strategy, departures })
  } catch (e) {
    const err = toPipelineError(e, 'composing')
    return Response.json({ code: err.code, message: err.userMessage }, { status: 502 })
  }
}
