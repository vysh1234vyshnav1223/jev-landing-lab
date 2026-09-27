'use client'

import { useCallback, useState } from 'react'
import { apiKeyHeaders } from '@/lib/apiKey'
import type { Departure, Strategy } from '@/lib/jev/directions'
import type { DecisionSet } from '@/schemas/decisions'
import type { ProductBrief } from '@/schemas/brief'
import type { LandingPageSpec } from '@/schemas/spec'

export type CompareState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; spec: LandingPageSpec; strategy: Strategy; departures: Departure[] }
  | { status: 'error'; message: string }

/**
 * Local edits to Jev's decisions, and the compare page built from them.
 *
 * Overrides live only in the browser — nothing is sent back to Jev. Comparing
 * calls /api/compare once, which rebuilds the strategy with these overrides
 * and composes a second page the same way the main pipeline composed the
 * first.
 */
export function useCompare() {
  const [overrides, setOverrides] = useState<Map<string, number>>(new Map())
  const [compare, setCompare] = useState<CompareState>({ status: 'idle' })

  const setOverride = useCallback((decisionId: string, rank: number) => {
    setOverrides((prev) => {
      const next = new Map(prev)
      if (rank === 0) next.delete(decisionId)
      else next.set(decisionId, rank)
      return next
    })
    // A change invalidates whatever was last compared.
    setCompare({ status: 'idle' })
  }, [])

  const clear = useCallback(() => {
    setOverrides(new Map())
    setCompare({ status: 'idle' })
  }, [])

  const run = useCallback(
    async (brief: ProductBrief, decisions: DecisionSet) => {
      if (overrides.size === 0) return
      setCompare({ status: 'loading' })
      try {
        const res = await fetch('/api/compare', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...apiKeyHeaders() },
          body: JSON.stringify({
            brief,
            decisions,
            overrides: Object.fromEntries(overrides),
          }),
        })
        const body = await res.json()
        if (!res.ok) {
          setCompare({ status: 'error', message: body.message ?? 'Could not build that version.' })
          return
        }
        setCompare({ status: 'ready', spec: body.spec, strategy: body.strategy, departures: body.departures })
      } catch {
        setCompare({ status: 'error', message: 'Could not reach the server.' })
      }
    },
    [overrides],
  )

  return { overrides, setOverride, clear, compare, run }
}
