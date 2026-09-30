'use client'

import { useCallback, useState } from 'react'
import { apiKeyHeaders } from '@/lib/apiKey'
import type { Departure } from '@/lib/jev/directions'
import type { CritiqueReport, PageBlueprint } from '@/schemas/blueprint'
import type { DecisionSet } from '@/schemas/decisions'
import type { ProductBrief } from '@/schemas/brief'
import type { LandingPageSpec } from '@/schemas/spec'
import type { StrategyHypothesis } from '@/schemas/strategy'

export type CompareState =
  | { status: 'idle' }
  | { status: 'loading' }
  | {
      status: 'ready'
      spec: LandingPageSpec
      blueprint: PageBlueprint
      critique: CritiqueReport
      departures: Departure[]
    }
  | { status: 'error'; message: string }

/**
 * "What if Jev had chosen differently?" — local edits and the page built from them.
 *
 * Two kinds of edit, both living only in the browser (nothing is sent back to
 * Jev): which candidate strategy to build (`strategyId`, null = Jev's pick),
 * and rank overrides on Jev's execution decisions. Comparing calls
 * /api/compare once, which runs the same blueprint → compose → critique path
 * the main pipeline ran for Jev's page.
 */
export function useCompare() {
  const [strategyId, setStrategyIdState] = useState<string | null>(null)
  const [overrides, setOverrides] = useState<Map<string, number>>(new Map())
  const [compare, setCompare] = useState<CompareState>({ status: 'idle' })

  const setStrategy = useCallback((id: string | null) => {
    setStrategyIdState(id)
    // A change invalidates whatever was last compared.
    setCompare({ status: 'idle' })
  }, [])

  const setOverride = useCallback((decisionId: string, rank: number) => {
    setOverrides((prev) => {
      const next = new Map(prev)
      if (rank === 0) next.delete(decisionId)
      else next.set(decisionId, rank)
      return next
    })
    setCompare({ status: 'idle' })
  }, [])

  const clear = useCallback(() => {
    setStrategyIdState(null)
    setOverrides(new Map())
    setCompare({ status: 'idle' })
  }, [])

  const run = useCallback(
    async (
      brief: ProductBrief,
      hypotheses: StrategyHypothesis[],
      decisions: DecisionSet,
      jevPick: string,
    ) => {
      if (!strategyId && overrides.size === 0) return
      setCompare({ status: 'loading' })
      try {
        const res = await fetch('/api/compare', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...apiKeyHeaders() },
          body: JSON.stringify({
            brief,
            hypotheses,
            decisions,
            strategyId: strategyId ?? jevPick,
            overrides: Object.fromEntries(overrides),
          }),
        })
        const body = await res.json()
        if (!res.ok) {
          setCompare({ status: 'error', message: body.message ?? 'Could not build that version.' })
          return
        }
        setCompare({
          status: 'ready',
          spec: body.spec,
          blueprint: body.blueprint,
          critique: body.critique,
          departures: body.departures,
        })
      } catch {
        setCompare({ status: 'error', message: 'Could not reach the server.' })
      }
    },
    [strategyId, overrides],
  )

  return { strategyId, setStrategy, overrides, setOverride, clear, compare, run }
}
