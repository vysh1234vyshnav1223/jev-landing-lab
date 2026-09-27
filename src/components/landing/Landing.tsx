'use client'

import { LiveDecisions } from '@/components/landing/LiveDecisions'
import { Composer } from '@/components/input/Composer'
import { ThemeToggle } from '@/components/landing/ThemeToggle'
import type { BriefInput } from '@/schemas/brief'

/**
 * The landing surface.
 *
 * No sidebar, no chrome. The hero is the instrument: twelve live probability
 * readouts sitting beside the brief field, so the mechanism is visible before
 * anything is typed. Everything below is quiet mono.
 */
export function Landing({ onSubmit }: { onSubmit: (input: BriefInput) => void }) {
  return (
    <div data-landing className="min-h-dvh bg-[var(--ink)] text-[var(--paper)]">
      <header className="mx-auto flex max-w-[1140px] items-center gap-4 px-6 py-5 font-mono text-[0.75rem] text-[var(--dim)] sm:px-10">
        <span className="text-[var(--paper)]">jev/lab</span>
        <span className="ml-auto hidden sm:inline">twelve questions, one call</span>
        <ThemeToggle />
      </header>

      <main className="mx-auto max-w-[1140px] px-6 pb-24 sm:px-10">
        <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,27rem)] lg:gap-14">
          <div className="min-w-0">
            <h1 className="lab-display text-[clamp(2.75rem,7vw,4.75rem)] leading-[0.95]">
              Nobody designs
              <br />
              this page.
              <br />
              <span className="text-[var(--sodium)]">It gets decided.</span>
            </h1>

            <p className="mt-7 max-w-[46ch] font-mono text-[0.8125rem] leading-[1.75] text-[var(--dim)]">
              Describe what you&rsquo;re building. A typed model answers twelve questions about it
              &mdash; hero, CTA, hierarchy, density &mdash; and returns a probability for every
              answer. Three landing pages are built from those numbers in plain TypeScript. Change
              the numbers, the pages change.
            </p>

            <div className="mt-9">
              <Composer onSubmit={onSubmit} />
            </div>
          </div>

          <div className="min-w-0">
            <LiveDecisions />
            <p className="mt-3 font-mono text-[0.6875rem] leading-relaxed text-[var(--dim)]">
              Live sample. Amber is still uncertain, mint has settled.
            </p>
          </div>
        </div>

        <Directions />
      </main>
    </div>
  )
}

/**
 * The three directions. Parallel alternatives, not a sequence — so they are
 * shown as three tracks diverging from the same distribution, never numbered.
 */
function Directions() {
  const tracks = [
    {
      id: 'A',
      name: 'High confidence',
      body: 'Every decision at the model\u2019s top answer. The page it would build if you never argued.',
    },
    {
      id: 'B',
      name: 'Alternative',
      body: 'Runner-up on the three answers it was least sure about. Diverges exactly where the doubt is.',
    },
    {
      id: 'C',
      name: 'Experimental',
      body: 'Runner-up anywhere it held eight percent, then interaction density pushed to the top.',
    },
  ]

  return (
    <section className="mt-16 border-t border-[var(--hair)] pt-10">
      <h2 className="lab-display text-[1.75rem] leading-tight">
        One decision set, three ways to read it
      </h2>

      <ul className="mt-8 grid gap-px bg-[var(--hair)] sm:grid-cols-3">
        {tracks.map((t) => (
          <li key={t.id} className="bg-[var(--ink)] p-5 sm:p-6">
            <span className="lab-display text-[2.5rem] leading-none text-[var(--sodium)]">
              {t.id}
            </span>
            <p className="mt-3 font-mono text-[0.8125rem] text-[var(--paper)]">{t.name}</p>
            <p className="mt-2 font-mono text-[0.75rem] leading-[1.7] text-[var(--dim)]">
              {t.body}
            </p>
          </li>
        ))}
      </ul>
    </section>
  )
}
