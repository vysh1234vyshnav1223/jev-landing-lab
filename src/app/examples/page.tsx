'use client'

import { useState } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/cn'
import { CAPTURED_EXAMPLES } from '@/lib/generation/examples'
import { BlueprintSummary } from '@/components/decisions/BlueprintSummary'
import { DecisionReadout } from '@/components/decisions/DecisionReadout'
import { StrategyList } from '@/components/decisions/StrategyList'
import { Renderer } from '@/components/preview/Renderer'

/**
 * Static preview of six real runs, captured once and frozen (see
 * lib/generation/examples). No API key, no live call, no cost per visitor —
 * this is what BYOK visitors are deciding whether to try for themselves. The
 * sidebar shows why each page looks the way it does: the strategies proposed,
 * Jev's judgment over them, the blueprint, and the execution decisions.
 */
export default function ExamplesPage() {
  const [active, setActive] = useState(CAPTURED_EXAMPLES[0].id)
  const example = CAPTURED_EXAMPLES.find((e) => e.id === active) ?? CAPTURED_EXAMPLES[0]

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-[var(--lab-0)] text-[var(--lab-text)]">
      <header className="flex shrink-0 items-center gap-4 border-b border-[var(--lab-border)] px-4 py-2.5">
        <Link href="/" className="font-mono text-[0.8125rem] text-[var(--lab-text-faint)] hover:text-[var(--lab-text)]">
          jev
        </Link>
        <span className="font-mono text-[0.75rem] text-[var(--lab-text-faint)]">
          six real runs, no key needed
        </span>
        <div className="ml-auto flex gap-1">
          {CAPTURED_EXAMPLES.map((e) => (
            <button
              key={e.id}
              type="button"
              onClick={() => setActive(e.id)}
              className={cn(
                'rounded-full border px-3 py-1 font-mono text-[0.75rem] transition-colors',
                active === e.id
                  ? 'border-[var(--lab-accent)]/50 bg-[var(--lab-accent-soft)] text-[var(--lab-accent)]'
                  : 'border-[var(--lab-border)] text-[var(--lab-text-faint)] hover:text-[var(--lab-text)]',
              )}
            >
              {e.label}
            </button>
          ))}
        </div>
        <Link
          href="/"
          className="shrink-0 rounded-md bg-[var(--lab-accent)] px-3 py-1.5 font-mono text-[0.75rem] text-[var(--lab-accent-fg)] hover:bg-[var(--lab-accent-hover)]"
        >
          Try your own →
        </Link>
      </header>

      <div className="flex min-h-0 flex-1">
        <main className="min-w-0 flex-1 overflow-y-auto bg-white">
          <Renderer spec={example.result.spec} />
        </main>

        <aside className="hidden w-[380px] shrink-0 flex-col overflow-y-auto border-l border-[var(--lab-border)] bg-[var(--lab-1)] p-4 lg:flex">
          <p className="mb-4 font-mono text-[0.6875rem] leading-relaxed text-[var(--lab-text-faint)]">
            {example.brief}
          </p>
          <Heading>Strategies Jev judged</Heading>
          <StrategyList judgment={example.result.judgment} hypotheses={example.result.hypotheses} />
          <Heading>Blueprint</Heading>
          <BlueprintSummary
            label="Built from"
            blueprint={example.result.blueprint}
            probability={example.result.judgment.ranked[0].probability}
            critique={example.result.critique}
          />
          <Heading>Execution</Heading>
          <DecisionReadout decisions={example.result.decisions} />
        </aside>
      </div>
    </div>
  )
}

function Heading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-2 mt-6 text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-[var(--lab-text-faint)] first-of-type:mt-0">
      {children}
    </h2>
  )
}
