import { QUESTION_TITLES } from '@/lib/jev/questions'
import type { Decision, DecisionSet } from '@/schemas/decisions'

/**
 * Read-only twin of DecisionPanel's rows — no drag, no override, no compare.
 * For surfaces that only ever show what Jev decided (the examples page),
 * where pulling in the interactive panel would mean stubbing five callbacks
 * that do nothing.
 */


function topLabel(d: Decision): string {
  if (d.type === 'noul') return d.value ? 'Yes' : 'No'
  return d.ranked[0]?.label.split(/[;—]/)[0].trim() ?? d.selected.toString()
}

function topProbability(d: Decision): number {
  if (d.type === 'noul') return d.probability >= 0.5 ? d.probability : 1 - d.probability
  return d.ranked[0]?.probability ?? 0
}

export function DecisionReadout({ decisions }: { decisions: DecisionSet }) {
  return (
    <div className="flex flex-col gap-3">
      {Object.values(decisions.decisions).map((d) => (
        <div key={d.id} className="flex flex-col gap-0.5 text-[0.8125rem]">
          <span className="text-[0.6875rem] text-[var(--lab-text-faint)]">{QUESTION_TITLES[d.id] ?? d.id}</span>
          <div className="flex items-start justify-between gap-2">
            <span className="min-w-0 flex-1 text-[var(--lab-text)]">{topLabel(d)}</span>
            <span className="shrink-0 tabular-nums text-[var(--lab-accent)]">
              {topProbability(d).toFixed(2)}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}
