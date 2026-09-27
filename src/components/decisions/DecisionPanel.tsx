'use client'

import { motion } from 'motion/react'
import { Info, RotateCcw, SplitSquareHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { DecisionSlider } from '@/components/decisions/DecisionSlider'
import { transition } from '@/lib/motion/tokens'
import type { Decision, DecisionSet } from '@/schemas/decisions'

/**
 * Inspector for what Jev returned — and where a person can override it.
 *
 * One row per decision, one track showing Jev's currently-selected answer and
 * its real probability. Drag the handle (or use the arrows) to step through
 * Jev's own ranked answers for that decision — never a free-form number,
 * always one of the options Jev actually returned. Nothing is sent back to
 * Jev; Compare rebuilds the page from the edited strategy so it can sit next
 * to Jev's original.
 */

const TITLES: Record<string, string> = {
  heroStrategy: 'Hero strategy',
  ctaStrategy: 'CTA strategy',
  socialProofType: 'Social proof',
  contentHierarchy: 'Content hierarchy',
  visualDirection: 'Visual direction',
  pageArchitecture: 'Page architecture',
  navigationComplexity: 'Navigation',
  interactionDensity: 'Interaction density',
  offerProminence: 'Offer prominence',
  trustIsPrimaryBarrier: 'Trust is the barrier',
  audienceIsPriceSensitive: 'Price-sensitive audience',
  requiresEducation: 'Needs education',
}

/**
 * Jev's criteria text is one clause per option, sometimes with a trailing
 * elaboration after a dash — that part is fine to drop. The slider wraps
 * onto two lines now, so this only needs to guard the rare very long clause,
 * not force everything onto one truncated line.
 */
function short(label: string, max = 80) {
  const head = label.split(/[;—]/)[0].trim()
  return head.length > max ? `${head.slice(0, max - 1)}…` : head
}

export function DecisionPanel({
  decisions,
  overrides,
  onChoose,
  onClear,
  onCompare,
  comparing,
}: {
  decisions: DecisionSet
  overrides: Map<string, number>
  onChoose: (decisionId: string, rank: number) => void
  onClear: () => void
  onCompare: () => void
  comparing: boolean
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-col gap-2 border-b border-[var(--lab-border)] p-4">
        <p className="flex items-start gap-1.5 text-[0.75rem] leading-relaxed text-[var(--lab-text-faint)]">
          <Info className="mt-0.5 size-3 shrink-0" />
          <span>
            Probabilities returned by Jev
            {decisions.meta.model ? ` (${decisions.meta.model})` : ''}. Drag the handle, or use
            the arrows, to try Jev&rsquo;s next answer.
          </span>
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto p-4">
        <div className="flex min-w-0 flex-col gap-4">
          {Object.values(decisions.decisions).map((d, i) => (
            <DecisionRow
              key={d.id}
              decision={d}
              overrideRank={overrides.get(d.id)}
              onChoose={(rank) => onChoose(d.id, rank)}
              index={i}
            />
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2 border-t border-[var(--lab-border)] p-3">
        {overrides.size > 0 && (
          <div className="flex items-center gap-2">
            <Button variant="primary" size="sm" onClick={onCompare} loading={comparing} className="flex-1">
              <SplitSquareHorizontal className="size-3.5" />
              Compare {overrides.size} {overrides.size === 1 ? 'change' : 'changes'}
            </Button>
            <Button variant="ghost" size="sm" onClick={onClear} aria-label="Discard changes">
              <RotateCcw className="size-3.5" />
            </Button>
          </div>
        )}
        <div className="flex items-center justify-between gap-2 text-[0.6875rem] text-[var(--lab-text-faint)]">
          <span className="font-mono">{decisions.meta.decisionId ?? 'no decision id'}</span>
          <span className="font-mono">{decisions.meta.latencyMs}ms</span>
        </div>
      </div>
    </div>
  )
}

function DecisionRow({
  decision,
  overrideRank,
  onChoose,
  index,
}: {
  decision: Decision
  overrideRank: number | undefined
  onChoose: (rank: number) => void
  index: number
}) {
  const rows =
    decision.type === 'noul'
      ? [
          { option: 'true', label: 'Yes', probability: decision.probability },
          { option: 'false', label: 'No', probability: 1 - decision.probability },
        ]
      : decision.ranked

  const activeRank = overrideRank ?? 0
  const edited = activeRank !== 0
  const active = rows[activeRank] ?? rows[0]

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...transition.normal, delay: Math.min(index * 0.03, 0.25) }}
    >
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <h3 className="text-[0.75rem] text-[var(--lab-text-faint)]">
          {TITLES[decision.id] ?? decision.id}
        </h3>
        {decision.confidence !== null && (
          <span
            className="font-mono text-[0.625rem] text-[var(--lab-text-faint)]"
            title="Confidence reported by Jev"
          >
            conf {Math.round(decision.confidence * 100)}%
          </span>
        )}
      </div>

      <DecisionSlider
        label={short(active.label)}
        probability={active.probability}
        rank={activeRank}
        rankCount={rows.length}
        edited={edited}
        onStep={(direction) => onChoose(activeRank + direction)}
      />
    </motion.div>
  )
}
