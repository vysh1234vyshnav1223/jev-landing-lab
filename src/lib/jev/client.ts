import { env } from '@/config/env'
import { PipelineError } from '@/lib/errors'
import { QUESTIONS } from '@/lib/jev/questions'
import { missingDecisions, normalizeDecisions } from '@/lib/jev/normalize'
import { decisionsResponse } from '@/schemas/decisions'
import type { DecisionSet } from '@/schemas/decisions'
import type { ProductBrief } from '@/schemas/brief'

/**
 * Jev — TypeSafe's System One decision model.
 *
 * Served from OpenRouter's dedicated Decisions endpoint (alpha), NOT chat
 * completions. All 12 questions travel in one request; Jev evaluates them in
 * parallel with no latency penalty, so splitting them up would only cost
 * round trips.
 */

const TIMEOUT_MS = 20_000

/** The context Jev reasons over. Kept compact — 32K context, priced on input. */
function stateFrom(brief: ProductBrief) {
  return {
    industry: brief.industry,
    product: brief.product,
    audience: brief.audience,
    primaryGoal: brief.primaryGoal,
    conversionAction: brief.conversionAction,
    secondaryGoals: brief.secondaryGoals,
    brandAttributes: brief.brandAttributes,
    competitors: brief.competitors,
    geography: brief.geography,
    priceContext: brief.priceContext,
  }
}

export async function decide(brief: ProductBrief, apiKey?: string): Promise<DecisionSet> {
  const { OPENROUTER_API_KEY, JEV_MODEL, JEV_DECISIONS_URL } = env()
  const started = Date.now()

  let response: Response
  try {
    response = await fetch(JEV_DECISIONS_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey || OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: JEV_MODEL,
        state: stateFrom(brief),
        questions: QUESTIONS,
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
  } catch (e) {
    const timedOut = e instanceof Error && e.name === 'TimeoutError'
    throw new PipelineError(
      timedOut ? 'TIMEOUT' : 'JEV_UNAVAILABLE',
      'deciding',
      timedOut
        ? "Jev didn't respond in time."
        : "Couldn't reach Jev. The decision step can't be skipped.",
      e instanceof Error ? e.message : String(e),
    )
  }

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    if (response.status === 429) {
      throw new PipelineError(
        'RATE_LIMITED',
        'deciding',
        'Rate limited while calling Jev. Try again shortly.',
        body,
      )
    }
    throw new PipelineError(
      'JEV_UNAVAILABLE',
      'deciding',
      `Jev returned ${response.status}. The decision step can't be skipped.`,
      body.slice(0, 500),
    )
  }

  const json = await response.json().catch(() => null)
  const parsed = decisionsResponse.safeParse(json)
  if (!parsed.success) {
    throw new PipelineError(
      'JEV_MALFORMED',
      'deciding',
      "Jev's response wasn't in a shape we recognise.",
      parsed.error.message,
    )
  }

  const set = normalizeDecisions(parsed.data, Date.now() - started)

  // A partial decision set can't produce a coherent direction, and inventing
  // the gaps would defeat the entire point of the experiment.
  const missing = missingDecisions(set)
  if (missing.length > 0) {
    throw new PipelineError(
      'JEV_MALFORMED',
      'deciding',
      'Jev answered only part of the decision set.',
      `Missing: ${missing.join(', ')}`,
    )
  }

  return set
}
