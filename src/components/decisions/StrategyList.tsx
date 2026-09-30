'use client'

import { motion, useReducedMotion } from 'motion/react'
import { cn } from '@/lib/cn'
import { transition } from '@/lib/motion/tokens'
import { ARCHETYPES } from '@/lib/generation/archetypes'
import { CONVERSION_LABELS, type StrategyHypothesis, type StrategyJudgment } from '@/schemas/strategy'

/**
 * Jev's judgment over the candidate strategies — the primary decision.
 *
 * One row per candidate with its combined probability. Jev's pick is what the
 * page was built from; clicking another row selects it for Compare ("what if
 * Jev had chosen this?"). The active row expands to show the strategy itself
 * and how it fared on each of Jev's criteria. With `onChoose` omitted the list
 * is read-only (the examples page).
 */
export function StrategyList({
  judgment,
  hypotheses,
  chosen,
  onChoose,
}: {
  judgment: StrategyJudgment
  hypotheses: StrategyHypothesis[]
  /** A person's pick for Compare; null = Jev's. */
  chosen?: string | null
  onChoose?: (id: string | null) => void
}) {
  const reduced = useReducedMotion()
  const active = chosen ?? judgment.selected

  return (
    <ol className="flex flex-col gap-1.5">
      {judgment.ranked.map((r, i) => {
        const h = hypotheses.find((x) => x.id === r.id)
        if (!h) return null
        const isJev = r.id === judgment.selected
        const isActive = r.id === active
        const edited = isActive && !isJev
        const tone = edited ? 'var(--lab-warn)' : 'var(--lab-accent)'
        const Row = onChoose ? 'button' : 'div'

        return (
          <li key={r.id}>
            <Row
              {...(onChoose && {
                type: 'button' as const,
                onClick: () => onChoose(isJev ? null : r.id),
                'aria-pressed': isActive,
              })}
              className={cn(
                'w-full rounded-[var(--radius-sm)] border px-2.5 py-2 text-left transition-colors',
                isActive
                  ? 'border-[var(--lab-border-strong)] bg-[var(--lab-2)]'
                  : 'border-transparent hover:bg-[var(--lab-2)]',
              )}
            >
              <span className="flex items-baseline justify-between gap-2">
                <span
                  className={cn(
                    'min-w-0 flex-1 text-[0.8125rem] font-medium text-pretty',
                    edited ? 'text-[var(--lab-warn)]' : 'text-[var(--lab-text)]',
                  )}
                >
                  {h.name}
                </span>
                <span className="shrink-0 font-mono text-[0.75rem] tabular-nums" style={{ color: isActive ? tone : undefined }}>
                  {Math.round(r.probability * 100)}%
                </span>
              </span>
              <span className="mt-1.5 block h-[3px] overflow-hidden rounded-full bg-[var(--lab-4)]">
                <motion.span
                  className="block h-full rounded-full"
                  style={{ backgroundColor: isActive ? tone : 'var(--lab-5)' }}
                  initial={reduced ? false : { width: 0 }}
                  animate={{ width: `${Math.max(r.probability * 100, 2)}%` }}
                  transition={{ ...transition.soft, delay: reduced ? 0 : i * 0.05 }}
                />
              </span>
              <span className="mt-1 flex gap-2 text-[0.6875rem] text-[var(--lab-text-faint)]">
                <span>{ARCHETYPES[h.archetype].label}</span>
                {isJev && <span className="text-[var(--lab-accent)]">Jev&rsquo;s pick</span>}
                {edited && <span className="text-[var(--lab-warn)]">selected for compare</span>}
              </span>
            </Row>

            {isActive && <StrategyDetail h={h} judgment={judgment} />}
          </li>
        )
      })}
    </ol>
  )
}

function StrategyDetail({ h, judgment }: { h: StrategyHypothesis; judgment: StrategyJudgment }) {
  return (
    <div className="flex flex-col gap-2.5 px-2.5 pb-1 pt-2.5 text-[0.75rem] leading-relaxed text-[var(--lab-text-muted)]">
      <p className="text-[var(--lab-text)]">{h.thesis}</p>
      <p>
        <span className="text-[var(--lab-text-faint)]">Story </span>
        {h.narrative.join(' → ')}
      </p>
      <SectionChips types={[`hero · ${h.hero.variant}`, ...h.sections.map((s) => s.type)]} />
      <p>
        <span className="text-[var(--lab-text-faint)]">Ask </span>
        {CONVERSION_LABELS[h.conversion.approach]}
      </p>
      <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-0.5 font-mono text-[0.6875rem]">
        {judgment.criteria.map((c) => {
          const p = c.ranked.find((r) => r.id === h.id)?.probability ?? 0
          const top = c.ranked[0]?.id === h.id
          return (
            <div key={c.id} className="contents">
              <dt className="text-[var(--lab-text-faint)]">
                {c.label}
                {c.weight > 1 && ` ×${c.weight}`}
              </dt>
              <dd className={cn('text-right tabular-nums', top && 'text-[var(--lab-accent)]')}>
                {p.toFixed(2)}
              </dd>
            </div>
          )
        })}
      </dl>
    </div>
  )
}

export function SectionChips({ types, struck = [] }: { types: string[]; struck?: string[] }) {
  return (
    <ul className="flex flex-wrap gap-1">
      {types.map((t, i) => (
        <li
          key={`${t}-${i}`}
          className="rounded-[var(--radius-sm)] border border-[var(--lab-border)] bg-[var(--lab-1)] px-1.5 py-0.5 font-mono text-[0.625rem] text-[var(--lab-text-muted)]"
        >
          {t}
        </li>
      ))}
      {struck.map((t, i) => (
        <li
          key={`struck-${t}-${i}`}
          title="Removed by the blueprint"
          className="rounded-[var(--radius-sm)] border border-dashed border-[var(--lab-border)] px-1.5 py-0.5 font-mono text-[0.625rem] text-[var(--lab-text-faint)] line-through"
        >
          {t}
        </li>
      ))}
    </ul>
  )
}
