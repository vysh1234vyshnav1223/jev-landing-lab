import { env } from '@/config/env'
import { PipelineError } from '@/lib/errors'
import type { z } from 'zod'

/**
 * OpenRouter chat completions — for reading the brief and writing copy. Every
 * design decision is Jev's; these two stages only choose words.
 *
 * Two named models, both on OpenRouter, both in strict JSON-schema mode:
 *   - Interpreting stays on the free router (`openrouter/free`) — low
 *     stakes, one short extraction, free-tier flakiness is an acceptable
 *     trade for zero cost.
 *   - Composing runs on a named paid model (COMPOSING_MODEL, default
 *     gpt-5-nano) — this is the stage a person actually waits on to see a
 *     page. Free-tier models (OpenRouter's router AND Groq's free reasoning
 *     models) were tried first and both proved unreliable for a page-sized
 *     structured-output call: empty responses, silent mid-string truncation,
 *     and hard per-minute quotas. gpt-5-nano costs about $0.001-0.002/page,
 *     has native strict json_schema enforcement, and (unlike gpt-4o-mini)
 *     isn't a model OpenAI is already retiring.
 */

const ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions'
const TIMEOUT_MS = 90_000

type Message = { role: 'system' | 'user' | 'assistant'; content: string }

export type Provider = { model(): string }

export const INTERPRETING: Provider = { model: () => env().OPENROUTER_MODEL }
export const COMPOSING: Provider = { model: () => env().COMPOSING_MODEL }

async function call(
  provider: Provider,
  messages: Message[],
  schemaName: string,
  jsonSchema: unknown,
  stage: string,
  maxTokens?: number,
  apiKey?: string,
) {
  const { OPENROUTER_API_KEY, NEXT_PUBLIC_APP_URL } = env()

  let response: Response
  try {
    response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey || OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        // OpenRouter uses these for attribution on its leaderboards.
        'HTTP-Referer': NEXT_PUBLIC_APP_URL,
        'X-Title': 'Jev Landing Lab',
      },
      body: JSON.stringify({
        model: provider.model(),
        messages,
        response_format: {
          type: 'json_schema',
          json_schema: { name: schemaName, strict: true, schema: jsonSchema },
        },
        // Without this, a provider that can't actually honour strict mode
        // just ignores it instead of being excluded from routing — which
        // reads as an empty or malformed response with no explanation.
        provider: { require_parameters: true },
        ...(maxTokens ? { max_tokens: maxTokens, max_completion_tokens: maxTokens } : {}),
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
  } catch (e) {
    const timedOut = e instanceof Error && e.name === 'TimeoutError'
    throw new PipelineError(
      timedOut ? 'TIMEOUT' : 'LLM_FAILED',
      stage,
      timedOut ? 'The model took too long to respond.' : "Couldn't reach the model.",
      e instanceof Error ? e.message : String(e),
    )
  }

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    if (response.status === 429) {
      throw new PipelineError(
        'RATE_LIMITED',
        stage,
        'Rate limited. Try again shortly.',
        body,
      )
    }
    throw new PipelineError(
      'LLM_FAILED',
      stage,
      `The model returned ${response.status}.`,
      body.slice(0, 500),
    )
  }

  const json = (await response.json().catch(() => null)) as
    | { choices?: { message?: { content?: string }; finish_reason?: string }[] }
    | null
  const choice = json?.choices?.[0]
  const content = choice?.message?.content
  const finishReason = choice?.finish_reason
  // Reasoning models (gpt-5-nano included) can spend the whole token budget
  // on hidden reasoning and return empty content with finish_reason left
  // unset rather than "length" — the caller's retry loop treats that the
  // same as truncation (bigger budget, same prompt), so this must return
  // rather than throw, or that retry path never gets a chance to run.
  return { content: content ?? '', finishReason: finishReason ?? (content ? undefined : 'length') }
}

/** Models sometimes wrap JSON in prose or fences despite strict mode. */
function extractJson(raw: string): unknown {
  const trimmed = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/```$/, '')
  try {
    return JSON.parse(trimmed)
  } catch {
    const start = trimmed.search(/[{[]/)
    const end = Math.max(trimmed.lastIndexOf('}'), trimmed.lastIndexOf(']'))
    if (start === -1 || end <= start) return null
    try {
      return JSON.parse(trimmed.slice(start, end + 1))
    } catch {
      return null
    }
  }
}

const MAX_ATTEMPTS = 3
const DEFAULT_MAX_TOKENS = 8000
/** Doubled on each truncation retry, capped here so a pathological schema
 *  can't run the token bill away instead of just failing. */
const MAX_TOKEN_CEILING = 24_000

/**
 * One call, then up to two repair attempts. Truncation (finish_reason:
 * "length") gets a bigger token budget and the SAME prompt again — asking the
 * model to "fix" a response that was cut off mid-string is a non-sequitur, it
 * can only produce a full one given more room to write it. A genuine parse or
 * validation failure gets a repair prompt that shows the model its own output
 * alongside the errors.
 */
export async function generateStructured<T>(opts: {
  provider?: Provider
  system: string
  user: string
  schemaName: string
  jsonSchema: unknown
  validator: z.ZodType<T>
  stage: string
  apiKey?: string
}): Promise<T> {
  const provider = opts.provider ?? INTERPRETING
  const messages: Message[] = [
    { role: 'system', content: opts.system },
    { role: 'user', content: opts.user },
  ]

  let lastErrors = ''
  let lastRaw = ''
  let lastFinishReason = ''
  let maxTokens = DEFAULT_MAX_TOKENS

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const { content: raw, finishReason } = await call(
      provider,
      messages,
      opts.schemaName,
      opts.jsonSchema,
      opts.stage,
      maxTokens,
      opts.apiKey,
    )
    lastRaw = raw
    lastFinishReason = finishReason ?? 'unknown'

    if (finishReason === 'length') {
      lastErrors = 'Response truncated at the token limit (finish_reason: length).'
      maxTokens = Math.min(maxTokens * 2, MAX_TOKEN_CEILING)
      continue
    }

    const parsed = extractJson(raw)

    // extractJson() returning null means it couldn't find any JSON at all —
    // a different failure than "found JSON, wrong shape", and telling the
    // model "expected object, received null" is a non-sequitur that doesn't
    // point at the real problem (usually: it wrote prose instead of JSON).
    if (parsed === null) {
      lastErrors = 'No parseable JSON found in the response.'
      messages.push(
        { role: 'assistant', content: raw.slice(0, 6000) },
        {
          role: 'user',
          content:
            'That response contained no parseable JSON. Return ONLY a single JSON object — ' +
            'no prose before or after it, no markdown code fences.',
        },
      )
      continue
    }

    const result = opts.validator.safeParse(parsed)
    if (result.success) return result.data

    lastErrors = result.error.issues
      .slice(0, 12)
      .map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('\n')

    messages.push(
      { role: 'assistant', content: raw.slice(0, 6000) },
      {
        role: 'user',
        content:
          `That response failed validation:\n${lastErrors}\n\n` +
          'Return corrected JSON only. No commentary, no code fences.',
      },
    )
  }

  throw new PipelineError(
    'LLM_MALFORMED',
    opts.stage,
    "The model's output didn't match the required structure.",
    `${lastErrors}\n\nfinish_reason=${lastFinishReason}\n\nlast raw response (first 800 chars): ${lastRaw.slice(0, 800)}`,
  )
}
