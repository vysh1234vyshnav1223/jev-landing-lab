'use client'

import { motion } from 'motion/react'
import { Info, RotateCcw, SplitSquareHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { DecisionSlider } from '@/components/decisions/DecisionSlider'
import { StrategyList } from '@/components/decisions/StrategyList'
import { transition } from '@/lib/motion/tokens'
import { QUESTION_TITLES } from '@/lib/jev/questions'
import type { Decision, DecisionSet } from '@/schemas/decisions'
import type { StrategyHypothesis, StrategyJudgment } from '@/schemas/strategy'

/**
 * Inspector for what Jev returned — and where a person can explore it.
 *
 * Top: Jev's distribution over the candidate strategies. The page was built
 * from Jev's pick; choosing another candidate sets up "what if Jev had chosen
 * this?" for Compare. Below: Jev's execution decisions, one slider each,
 * stepping only through Jev's own ranked answers — never a free-form value.
 * Nothing is sent back to Jev; Compare rebuilds a page from the edits so it
 * can sit next to Jev's original.
 */

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
  judgment,
  hypotheses,
  chosenStrategy,
  onChooseStrategy,
  overrides,
  onChoose,
  onClear,
  onCompare,
  comparing,
}: {
  decisions: DecisionSet
  judgment: StrategyJudgment
  hypotheses: StrategyHypothesis[]
  chosenStrategy: string | null
  onChooseStrategy: (id: string | null) => void
  overrides: Map<string, number>
  onChoose: (decisionId: string, rank: number) => void
  onClear: () => void
  onCompare: () => void
  comparing: boolean
}) {
  const alternative = chosenStrategy ? judgment.ranked.find((r) => r.id === chosenStrategy) : null
  const edits = overrides.size + (alternative ? 1 : 0)
  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-col gap-2 border-b border-[var(--lab-border)] p-4">
        <p className="flex items-start gap-1.5 text-[0.75rem] leading-relaxed text-[var(--lab-text-faint)]">
          <Info className="mt-0.5 size-3 shrink-0" />
          <span>
            Probabilities returned by Jev
            {decisions.meta.model ? ` (${decisions.meta.model})` : ''}. Pick another strategy, or
            step a decision to Jev&rsquo;s next answer, then compare.
          </span>
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto p-4">
        <h2 className="mb-2 text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-[var(--lab-text-faint)]">
          Strategy
        </h2>
        <StrategyList
          judgment={judgment}
          hypotheses={hypotheses}
          chosen={chosenStrategy}
          onChoose={onChooseStrategy}
        />

        <h2 className="mb-3 mt-6 text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-[var(--lab-text-faint)]">
          Execution
        </h2>
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
        {edits > 0 && (
          <div className="flex items-center gap-2">
            <Button variant="primary" size="sm" onClick={onCompare} loading={comparing} className="flex-1">
              <SplitSquareHorizontal className="size-3.5" />
              {alternative
                ? `Compare strategies${overrides.size ? ` +${overrides.size}` : ''}`
                : `Compare ${overrides.size} ${overrides.size === 1 ? 'change' : 'changes'}`}
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
          {QUESTION_TITLES[decision.id] ?? decision.id}
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
