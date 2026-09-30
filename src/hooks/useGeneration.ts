'use client'

import { useCallback, useRef, useState } from 'react'
import { apiKeyHeaders } from '@/lib/apiKey'
import type { StageEvent } from '@/lib/generation/pipeline'
import type { CritiqueReport, PageBlueprint } from '@/schemas/blueprint'
import type { BriefInput, ProductBrief } from '@/schemas/brief'
import type { DecisionSet } from '@/schemas/decisions'
import type { LandingPageSpec } from '@/schemas/spec'
import type { StrategyHypothesis, StrategyJudgment } from '@/schemas/strategy'

export type Phase = 'idle' | 'running' | 'ready' | 'error'

export type StageKey =
  | 'interpreting'
  | 'hypothesizing'
  | 'deciding'
  | 'blueprinting'
  | 'composing'
  | 'critiquing'

export const STAGES: { key: StageKey; label: string; detail: string }[] = [
  { key: 'interpreting', label: 'Understanding the brief', detail: 'Extracting product context' },
  { key: 'hypothesizing', label: 'Proposing strategies', detail: 'Materially different ways to make the case' },
  { key: 'deciding', label: 'Jev is judging the strategies', detail: 'Seven criteria and six execution calls, one pass' },
  { key: 'blueprinting', label: 'Locking the blueprint', detail: "Jev's pick, turned into rules the page must follow" },
  { key: 'composing', label: 'Executing the blueprint', detail: 'Writing copy inside the fixed structure' },
  { key: 'critiquing', label: 'Checking fidelity', detail: 'Rules, review, targeted repair' },
]

export type StageState = 'pending' | 'active' | 'done' | 'error'

export type GenerationState = {
  phase: Phase
  stages: Record<StageKey, StageState>
  brief: ProductBrief | null
  hypotheses: StrategyHypothesis[] | null
  decisions: DecisionSet | null
  judgment: StrategyJudgment | null
  blueprint: PageBlueprint | null
  spec: LandingPageSpec | null
  critique: CritiqueReport | null
  error: { code: string; message: string; stage: string } | null
}

const INITIAL: GenerationState = {
  phase: 'idle',
  stages: {
    interpreting: 'pending',
    hypothesizing: 'pending',
    deciding: 'pending',
    blueprinting: 'pending',
    composing: 'pending',
    critiquing: 'pending',
  },
  brief: null,
  hypotheses: null,
  decisions: null,
  judgment: null,
  blueprint: null,
  spec: null,
  critique: null,
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
          if (event.hypotheses) next.hypotheses = event.hypotheses
          if (event.decisions) next.decisions = event.decisions
          if (event.judgment) next.judgment = event.judgment
          if (event.blueprint) next.blueprint = event.blueprint
          return next
        }

        if (event.status !== 'done') return next

        switch (event.stage) {
          case 'interpreting':
            next.stages.interpreting = 'done'
            next.brief = event.brief
            break
          case 'hypothesizing':
            next.stages.hypothesizing = 'done'
            next.hypotheses = event.hypotheses
            break
          case 'deciding':
            next.stages.deciding = 'done'
            next.decisions = event.decisions
            next.judgment = event.judgment
            break
          case 'blueprinting':
            next.stages.blueprinting = 'done'
            next.blueprint = event.blueprint
            break
          case 'composing':
            // The draft; critiquing replaces it with the checked page.
            next.stages.composing = 'done'
            next.spec = event.spec
            break
          case 'critiquing':
            next.stages.critiquing = 'done'
            next.spec = event.spec
            next.critique = event.critique
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
