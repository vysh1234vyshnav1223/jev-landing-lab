'use client'

import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Check, X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { transition } from '@/lib/motion/tokens'
import { StatusDot } from '@/components/ui/primitives'
import { STAGES, type GenerationState } from '@/hooks/useGeneration'
import type { Decision } from '@/schemas/decisions'

/**
 * The generation experience.
 *
 * Every stage here reflects real server progress streamed over NDJSON — the
 * decisions land on screen at the moment Jev returns them, not on a timer.
 * That honesty is the point: the user is watching the system work.
 */
export function GenerationCanvas({ state }: { state: GenerationState }) {
  const reduced = useReducedMotion()
  const decisions = state.decisions ? Object.values(state.decisions.decisions) : []

  return (
    <div className="flex w-full flex-col">
      <motion.div
        initial={reduced ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={transition.slow}
        className="w-full"
      >
        <div className="mb-5">
          <h2 className="text-[1rem] font-semibold tracking-tight text-[var(--lab-text)]">
            Decision pass
          </h2>
          <p className="mt-0.5 text-[0.8125rem] text-[var(--lab-text-muted)]">
            Twelve questions to Jev in one request. The page is built from its highest-probability answers.
          </p>
        </div>

        <ol className="flex flex-col">
          {STAGES.map((stage, i) => {
            const status = state.stages[stage.key]
            return (
              <li key={stage.key} className="relative flex gap-4 pb-6 last:pb-0">
                {i < STAGES.length - 1 && (
                  <span
                    aria-hidden
                    className="absolute left-[7px] top-6 h-[calc(100%-1rem)] w-px bg-[var(--lab-border)]"
                  >
                    <motion.span
                      className="block w-px bg-[var(--lab-accent)]"
                      initial={{ height: 0 }}
                      animate={{ height: status === 'done' ? '100%' : 0 }}
                      transition={transition.soft}
                    />
                  </span>
                )}

                <span className="relative z-10 mt-1 flex size-4 items-center justify-center">
                  <AnimatePresence mode="wait" initial={false}>
                    {status === 'done' ? (
                      <motion.span
                        key="done"
                        initial={reduced ? false : { scale: 0.4, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={transition.spring}
                        className="grid size-4 place-items-center rounded-full bg-[var(--lab-positive)]"
                      >
                        <Check className="size-2.5 text-[var(--lab-0)]" strokeWidth={3.5} />
                      </motion.span>
                    ) : status === 'error' ? (
                      <motion.span
                        key="error"
                        initial={reduced ? false : { scale: 0.4, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={transition.spring}
                        className="grid size-4 place-items-center rounded-full bg-[var(--lab-danger)]"
                      >
                        <X className="size-2.5 text-[var(--lab-0)]" strokeWidth={3.5} />
                      </motion.span>
                    ) : (
                      <motion.span key="idle" exit={{ opacity: 0 }}>
                        <StatusDot status={status === 'active' ? 'active' : 'idle'} />
                      </motion.span>
                    )}
                  </AnimatePresence>
                </span>

                <div className="min-w-0 flex-1 pt-px">
                  <p
                    className={cn(
                      'text-[0.9375rem] font-medium transition-colors duration-300',
                      status === 'pending' && 'text-[var(--lab-text-faint)]',
                      status === 'active' && 'text-[var(--lab-text)]',
                      status === 'done' && 'text-[var(--lab-text-muted)]',
                      status === 'error' && 'text-[var(--lab-danger)]',
                    )}
                  >
                    {stage.label}
                  </p>
                  <p className="text-[0.8125rem] text-[var(--lab-text-faint)]">{stage.detail}</p>

                  {/* Jev's decisions land here, one at a time, as they arrive. */}
                  {stage.key === 'deciding' && decisions.length > 0 && (
                    <DecisionStream decisions={decisions} />
                  )}
                </div>
              </li>
            )
          })}
        </ol>
      </motion.div>
    </div>
  )
}

function labelFor(d: Decision): string {
  if (d.type === 'choice') return d.ranked[0].label.split(/[;—]/)[0].slice(0, 42)
  if (d.type === 'score') return d.levels[d.selected].split(/[;—]/)[0].slice(0, 42)
  return d.value ? 'Yes' : 'No'
}

function confidenceFor(d: Decision): number {
  if (d.type === 'noul') return Math.max(d.probability, 1 - d.probability)
  return d.ranked[0].probability
}

function DecisionStream({ decisions }: { decisions: Decision[] }) {
  const reduced = useReducedMotion()

  return (
    <motion.ul className="mt-3 flex flex-col gap-1">
      <AnimatePresence initial={false}>
        {decisions.map((d, i) => (
          <motion.li
            key={d.id}
            initial={reduced ? { opacity: 0 } : { opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ ...transition.normal, delay: Math.min(i * 0.04, 0.4) }}
            className="flex items-baseline justify-between gap-3 rounded-[var(--radius-sm)] px-2 py-1 text-[0.8125rem] odd:bg-[var(--lab-1)]"
          >
            <span className="truncate text-[var(--lab-text-faint)]">
              {d.id.replace(/([A-Z])/g, ' $1').toLowerCase()}
            </span>
            <span className="flex shrink-0 items-baseline gap-2">
              <span className="text-[var(--lab-text-muted)]">{labelFor(d)}</span>
              <span className="font-mono text-[0.6875rem] tabular-nums text-[var(--lab-accent)]">
                {Math.round(confidenceFor(d) * 100)}%
              </span>
            </span>
          </motion.li>
        ))}
      </AnimatePresence>
    </motion.ul>
  )
}
