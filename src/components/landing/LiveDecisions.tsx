'use client'

import { useEffect, useState } from 'react'
import { useReducedMotion } from 'motion/react'

/**
 * The hero instrument.
 *
 * Twelve probability readouts that re-roll on a loop — the same twelve
 * questions the real decision pass answers, shown drifting before the user has
 * typed anything. This is the product's thesis rendered as an object you can
 * watch: the page is not designed, it is *decided*, and each decision carries a
 * confidence you can see.
 *
 * The numbers are illustrative, not a real Jev call. They settle on plausible
 * answers so the shape reads true.
 */

type Row = { id: string; options: string[] }

const ROWS: Row[] = [
  { id: 'hero', options: ['search first', 'value prop', 'product demo', 'social proof'] },
  { id: 'cta', options: ['direct action', 'free trial', 'explore', 'contact'] },
  { id: 'social proof', options: ['logos', 'testimonials', 'metrics', 'none'] },
  { id: 'hierarchy', options: ['benefit led', 'feature led', 'problem led'] },
  { id: 'visual', options: ['clean utility', 'warm editorial', 'bold confident', 'technical'] },
  { id: 'architecture', options: ['single scroll', 'sectioned', 'tabbed'] },
  { id: 'navigation', options: ['minimal', 'standard', 'full'] },
  { id: 'density', options: ['static', 'responsive', 'interactive'] },
  { id: 'offer', options: ['understated', 'balanced', 'front and centre'] },
  { id: 'trust barrier', options: ['yes', 'no'] },
  { id: 'price sensitive', options: ['yes', 'no'] },
  { id: 'education', options: ['yes', 'no'] },
]

/** Deterministic first paint, so server and client agree. */
const SEED = [0.71, 0.54, 0.38, 0.83, 0.62, 0.47, 0.91, 0.29, 0.58, 0.76, 0.44, 0.67]

type Cell = { option: string; p: number }

function roll(row: Row): Cell {
  const i = Math.floor(Math.random() * row.options.length)
  // Bias toward confident answers — a real distribution rarely sits at 0.3.
  return { option: row.options[i], p: 0.34 + Math.random() * 0.62 }
}

function Fill({ cell, settled }: { cell: Cell; settled: boolean }) {
  return (
    <span
      className="absolute inset-y-0 left-0 transition-[width,background-color] duration-700 ease-out"
      style={{
        width: `${Math.round(cell.p * 100)}%`,
        backgroundColor: settled ? 'var(--mint)' : 'var(--sodium)',
      }}
    />
  )
}

export function LiveDecisions() {
  const reduced = useReducedMotion()
  const [cells, setCells] = useState<Cell[]>(() =>
    ROWS.map((r, i) => ({ option: r.options[i % r.options.length], p: SEED[i] })),
  )

  useEffect(() => {
    if (reduced) return
    // One row re-rolls at a time, so the panel breathes instead of flashing.
    const t = setInterval(() => {
      const i = Math.floor(Math.random() * ROWS.length)
      setCells((prev) => prev.map((c, j) => (j === i ? roll(ROWS[i]) : c)))
    }, 900)
    return () => clearInterval(t)
  }, [reduced])

  return (
    <div className="relative overflow-hidden border border-[var(--hair)] bg-[var(--ink-2)]">
      {/* Scan sweep — the one ambient motion on the page. */}
      <div
        aria-hidden
        className="lab-sweep pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-transparent via-[var(--sweep)] to-transparent"
      />

      <div className="flex items-baseline justify-between border-b border-[var(--hair)] px-4 py-2.5 font-mono text-[0.6875rem] text-[var(--dim)]">
        <span>decision set</span>
        <span className="tabular-nums">12 / 12</span>
      </div>

      <ul className="divide-y divide-[var(--hair)]">
        {ROWS.map((row, i) => {
          const cell = cells[i]
          const settled = cell.p >= 0.7
          return (
            <li key={row.id} className="px-4 py-2 sm:py-[0.4375rem]">
              {/* Mobile: label + value on one line, bar beneath.
                  sm+: the four-column instrument row. */}
              <div className="flex items-center gap-3 sm:grid sm:grid-cols-[6.25rem_1fr_7.5rem_2.5rem]">
                <span className="shrink-0 truncate font-mono text-[0.6875rem] text-[var(--dim)] sm:order-1">
                  {row.id}
                </span>

                <span
                  aria-hidden
                  className="relative hidden h-[3px] w-full overflow-hidden bg-[var(--ink-3)] sm:order-2 sm:block"
                >
                  <Fill cell={cell} settled={settled} />
                </span>

                <span className="ml-auto truncate font-mono text-[0.75rem] text-[var(--paper)] sm:order-3 sm:ml-0">
                  {cell.option}
                </span>

                <span
                  className="shrink-0 text-right font-mono text-[0.6875rem] tabular-nums transition-colors duration-700 sm:order-4"
                  style={{ color: settled ? 'var(--mint)' : 'var(--sodium)' }}
                >
                  {cell.p.toFixed(2)}
                </span>
              </div>

              <span
                aria-hidden
                className="relative mt-1.5 block h-[3px] w-full overflow-hidden bg-[var(--ink-3)] sm:hidden"
              >
                <Fill cell={cell} settled={settled} />
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
