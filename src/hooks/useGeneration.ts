'use client'

import { useCallback, useRef, useState } from 'react'
import { apiKeyHeaders } from '@/lib/apiKey'
import type { ResolvedDirection } from '@/lib/jev/directions'
import type { StageEvent } from '@/lib/generation/pipeline'
import type { BriefInput, ProductBrief } from '@/schemas/brief'
import type { DecisionSet } from '@/schemas/decisions'
import type { LandingPageSpec } from '@/schemas/spec'

export type Phase = 'idle' | 'running' | 'ready' | 'error'

export type StageKey = 'interpreting' | 'deciding' | 'resolving' | 'composing'

export const STAGES: { key: StageKey; label: string; detail: string }[] = [
  { key: 'interpreting', label: 'Understanding the brief', detail: 'Extracting product context' },
  { key: 'deciding', label: 'Jev is making design decisions', detail: '12 questions, one pass' },
  { key: 'resolving', label: 'Resolving the strategy', detail: "Jev's highest-probability answers" },
  { key: 'composing', label: 'Generating the interface', detail: 'Writing copy for the page' },
]

export type StageState = 'pending' | 'active' | 'done' | 'error'

export type GenerationState = {
  phase: Phase
  stages: Record<StageKey, StageState>
  brief: ProductBrief | null
  decisions: DecisionSet | null
  direction: ResolvedDirection | null
  spec: LandingPageSpec | null
  error: { code: string; message: string; stage: string } | null
}

const INITIAL: GenerationState = {
  phase: 'idle',
  stages: {
    interpreting: 'pending',
    deciding: 'pending',
    resolving: 'pending',
    composing: 'pending',
  },
  brief: null,
  decisions: null,
  direction: null,
  spec: null,
  error: null,
}

/**
 * Consumes the NDJSON stream from /api/generate and projects it into state.
 *
 * Each stage flips to `done` when the server actually finishes it, so the
 * generation screen reflects real progress rather than an animation timeline.
 */
export function useGeneration() {
  const [state, setState] = useState<GenerationState>(INITIAL)
  const abortRef = useRef<AbortController | null>(null)

  const reset = useCallback(() => {
    abortRef.current?.abort()
    setState(INITIAL)
  }, [])

  const generate = useCallback(async (input: BriefInput) => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setState({ ...INITIAL, phase: 'running' })

    let response: Response
    try {
      response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...apiKeyHeaders() },
        body: JSON.stringify(input),
        signal: controller.signal,
      })
    } catch {
      setState((s) => ({
        ...s,
        phase: 'error',
        error: { code: 'LLM_FAILED', message: 'Could not reach the server.', stage: 'interpreting' },
      }))
      return
    }

    if (!response.ok) {
      // Rejected before the stream started (bad input, no key) — one JSON
      // object, not NDJSON.
      const body = await response.json().catch(() => null)
      setState((s) => ({
        ...s,
        phase: 'error',
        error: {
          code: body?.code ?? 'LLM_FAILED',
          message: body?.message ?? 'The server rejected the request.',
          stage: body?.stage ?? 'interpreting',
        },
      }))
      return
    }

    if (!response.body) {
      setState((s) => ({
        ...s,
        phase: 'error',
        error: { code: 'LLM_FAILED', message: 'The server returned no response.', stage: 'interpreting' },
      }))
      return
    }

    const reader = response.body.pipeThrough(new TextDecoderStream()).getReader()
    let buffer = ''

    const apply = (event: StageEvent) => {
      setState((prev) => {
        const next = { ...prev, stages: { ...prev.stages } }

        if (event.status === 'start') {
          next.stages[event.stage] = 'active'
          return next
        }

        if (event.status === 'error') {
          if (event.stage !== 'done') next.stages[event.stage as StageKey] = 'error'
          next.phase = 'error'
          next.error = { code: event.code, message: event.message, stage: event.stage }
          // Jev may have succeeded before a later stage failed — keep what we
          // have so the decision panel can still be shown.
          if ('decisions' in event && event.decisions) next.decisions = event.decisions
          if ('direction' in event && event.direction) next.direction = event.direction
          return next
        }

        if (event.status !== 'done') return next

        switch (event.stage) {
          case 'interpreting':
            next.stages.interpreting = 'done'
            next.brief = event.brief
            break
          case 'deciding':
            next.stages.deciding = 'done'
            next.decisions = event.decisions
            break
          case 'resolving':
            next.stages.resolving = 'done'
            next.direction = event.direction
            break
          case 'composing':
            next.stages.composing = 'done'
            next.spec = event.spec
            break
          case 'done':
            next.phase = 'ready'
            break
        }
        return next
      })
    }

    try {
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += value
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.trim()) continue
          try {
            apply(JSON.parse(line) as StageEvent)
          } catch {
            // A partial or malformed line is not worth failing the run over.
          }
        }
      }
    } catch {
      if (controller.signal.aborted) return
      setState((s) => ({
        ...s,
        phase: 'error',
        error: { code: 'LLM_FAILED', message: 'The connection dropped mid-generation.', stage: 'composing' },
      }))
    }
  }, [])

  return { state, generate, reset }
}
