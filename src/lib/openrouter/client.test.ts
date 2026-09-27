import { afterEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { generateStructured } from '@/lib/openrouter/client'

/**
 * Regression: a reasoning model (gpt-5-nano included) can spend its whole
 * token budget on hidden reasoning and come back with empty `content` and
 * `finish_reason` left unset — not "length". That must still be treated as
 * truncation (bigger budget, retry), or a real page-sized compose call fails
 * outright with "empty response" on the very first attempt. See compose.ts's
 * observed failure before this fix: finish_reason=unknown, raw content null.
 */

const schema = z.object({ ok: z.boolean() })
const jsonSchema = { type: 'object', properties: { ok: { type: 'boolean' } }, required: ['ok'] }

function chatCompletion(content: string | null, finish_reason?: string) {
  return {
    ok: true,
    json: async () => ({ choices: [{ message: { content }, finish_reason }] }),
    text: async () => '',
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('generateStructured — empty-content retry', () => {
  it('retries with a bigger token budget when content is empty and finish_reason is unset', async () => {
    const calls: unknown[] = []
    const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
      const body = JSON.parse(init.body as string)
      calls.push(body.max_tokens)
      // First call: empty content, no finish_reason (the gpt-5-nano failure
      // mode). Second call: succeeds, as a bigger budget would in practice.
      if (calls.length === 1) return chatCompletion(null, undefined) as unknown as Response
      return chatCompletion(JSON.stringify({ ok: true })) as unknown as Response
    })
    vi.stubGlobal('fetch', fetchMock)
    vi.stubEnv('OPENROUTER_API_KEY', 'test-key')
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'http://localhost:3000')

    const result = await generateStructured({
      system: 's',
      user: 'u',
      schemaName: 'test',
      jsonSchema,
      validator: schema,
      stage: 'composing',
    })

    expect(result).toEqual({ ok: true })
    expect(calls).toHaveLength(2)
    // The second attempt must ask for MORE tokens, not repeat the same budget.
    expect(calls[1]).toBeGreaterThan(calls[0] as number)
  })

  it('does not throw synchronously on empty content before the retry loop can see it', async () => {
    // The bug this guards against: call() used to throw on empty content
    // immediately, so generateStructured's finish_reason === 'length' branch
    // never ran — the caller only ever saw a thrown "empty response" error,
    // even though a bigger budget would have fixed it.
    const fetchMock = vi.fn(
      async () => chatCompletion(null, undefined) as unknown as Response,
    )
    vi.stubGlobal('fetch', fetchMock)
    vi.stubEnv('OPENROUTER_API_KEY', 'test-key')
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'http://localhost:3000')

    await expect(
      generateStructured({
        system: 's',
        user: 'u',
        schemaName: 'test',
        jsonSchema,
        validator: schema,
        stage: 'composing',
      }),
    ).rejects.toThrow()

    // It must have actually retried (3 attempts), not failed on the first.
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })
})
