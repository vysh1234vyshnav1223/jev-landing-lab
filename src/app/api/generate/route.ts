import { NextRequest } from 'next/server'
import { env } from '@/config/env'
import { runPipeline } from '@/lib/generation/pipeline'
import { briefInput } from '@/schemas/brief'

export const runtime = 'nodejs'
/** Generation takes real time; don't let a platform cache it. */
export const dynamic = 'force-dynamic'
export const maxDuration = 120

/**
 * Streams the pipeline as NDJSON — one JSON object per line, per stage event.
 *
 * Streaming rather than a single response so the generation screen can animate
 * each stage as it genuinely completes. Jev's decisions land on screen the
 * moment Jev returns them, not on a fake timer.
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  const parsed = briefInput.safeParse(body)

  if (!parsed.success) {
    return Response.json(
      {
        stage: 'interpreting',
        status: 'error',
        code: 'INVALID_INPUT',
        message: parsed.error.issues[0]?.message ?? 'That brief could not be read.',
      },
      { status: 400 },
    )
  }

  // BYOK: this key rides the request only — never logged, never persisted
  // server-side. USE_FIXTURES is the one path allowed to run without one.
  const apiKey = request.headers.get('X-OpenRouter-Key')?.trim() || undefined
  if (!apiKey && !env().USE_FIXTURES) {
    return Response.json(
      {
        stage: 'interpreting',
        status: 'error',
        code: 'NO_API_KEY',
        message: 'No OpenRouter key was provided.',
      },
      { status: 401 },
    )
  }

  const encoder = new TextEncoder()
  // A client disconnect mid-generation (closed tab, dropped network) cancels
  // the stream from outside this closure, but the pipeline keeps running
  // server-side until its next `yield`. Without this flag, the next
  // enqueue/close throws "Controller is already closed" — harmless to the
  // client, who is already gone, but it should not be an unhandled crash.
  let closed = false
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of runPipeline(parsed.data, apiKey)) {
          if (closed) return
          controller.enqueue(encoder.encode(JSON.stringify(event) + '\n'))
        }
      } catch (e) {
        // Anything the pipeline didn't already classify.
        console.error('pipeline crashed', e)
        if (!closed) {
          controller.enqueue(
            encoder.encode(
              JSON.stringify({
                stage: 'done',
                status: 'error',
                code: 'LLM_FAILED',
                message: 'Generation stopped unexpectedly.',
              }) + '\n',
            ),
          )
        }
      } finally {
        if (!closed) controller.close()
      }
    },
    cancel() {
      closed = true
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-store, no-transform',
      'X-Accel-Buffering': 'no',
    },
  })
}
