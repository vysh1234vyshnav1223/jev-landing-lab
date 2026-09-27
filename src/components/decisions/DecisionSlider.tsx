'use client'

import { useRef } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/cn'
import { transition } from '@/lib/motion/tokens'

/**
 * One decision, one row: a track showing Jev's ranked answers as fixed stops,
 * and a handle on it — like a price filter, not a draggable card. Only the
 * handle drags, and it snaps to the nearest stop; there's nothing continuous
 * or invented in between; the label and % are read-only text beside it.
 *
 * Arrow buttons do the same step, always visible — this panel has no hover
 * affordance worth hiding them behind.
 */

export function DecisionSlider({
  label,
  probability,
  rank,
  rankCount,
  edited,
  onStep,
}: {
  label: string
  probability: number
  rank: number
  rankCount: number
  /** True once a person has moved off Jev's top pick (rank 0). */
  edited: boolean
  onStep: (direction: 1 | -1) => void
}) {
  const reduced = useReducedMotion()
  const trackRef = useRef<HTMLDivElement>(null)
  const pct = Math.round(probability * 100)
  const canStepBack = rank > 0
  const canStepForward = rank < rankCount - 1
  // Stops are evenly spaced by rank, not by probability — rank 0 is always
  // Jev's top pick regardless of how close the next one scores.
  const stopPct = rankCount > 1 ? (rank / (rankCount - 1)) * 100 : 100
  const tone = edited ? 'var(--lab-warn)' : 'var(--lab-accent)'

  function handleDrag(clientX: number) {
    const track = trackRef.current
    if (!track || rankCount <= 1) return
    const { left, width } = track.getBoundingClientRect()
    const ratio = Math.min(1, Math.max(0, (clientX - left) / width))
    const nearest = Math.round(ratio * (rankCount - 1))
    if (nearest !== rank) onStep(nearest > rank ? 1 : -1)
  }

  return (
    <div className="flex items-center gap-1.5">
      <StepButton direction="back" disabled={!canStepBack} onClick={() => onStep(-1)} label="Try Jev's next answer" />

      <div className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-3">
          <span
            className={cn(
              'min-w-0 flex-1 text-[0.8125rem] font-medium text-pretty',
              edited ? 'text-[var(--lab-warn)]' : 'text-[var(--lab-text)]',
            )}
          >
            {label}
          </span>
          <span
            className="shrink-0 font-mono text-[0.75rem] tabular-nums"
            style={{ color: tone }}
          >
            {pct}%
          </span>
        </span>

        {/* The track: Jev's ranked stops as ticks, filled up to the active
            one. The handle is the only thing that drags. */}
        <div
          ref={trackRef}
          className="relative mt-2 h-4"
          onPointerDown={(e) => {
            if (rankCount <= 1) return
            e.currentTarget.setPointerCapture(e.pointerId)
            handleDrag(e.clientX)
          }}
          onPointerMove={(e) => {
            if (rankCount > 1 && e.buttons === 1) handleDrag(e.clientX)
          }}
        >
          <span className="absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 overflow-hidden rounded-full bg-[var(--lab-4)]">
            <motion.span
              className="absolute inset-y-0 left-0 rounded-full"
              style={{ backgroundColor: tone }}
              initial={reduced ? false : { width: 0 }}
              animate={{ width: `${Math.max(stopPct, 2)}%` }}
              transition={transition.soft}
            />
          </span>

          {rankCount > 1 &&
            Array.from({ length: rankCount }, (_, i) => (
              <span
                key={i}
                aria-hidden
                className="absolute top-1/2 size-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--lab-5)]"
                style={{ left: `${(i / (rankCount - 1)) * 100}%` }}
              />
            ))}

          <motion.span
            role="slider"
            aria-label={label}
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'ArrowLeft' && canStepBack) onStep(-1)
              if (e.key === 'ArrowRight' && canStepForward) onStep(1)
            }}
            className={cn(
              'absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 bg-[var(--lab-0)] shadow-[var(--shadow-sm)] focus-visible:outline-2 focus-visible:outline-offset-2',
              rankCount > 1 && 'cursor-grab touch-none active:cursor-grabbing',
            )}
            style={{ borderColor: tone, left: `${stopPct}%` }}
            animate={{ left: `${stopPct}%` }}
            transition={transition.soft}
          />
        </div>
      </div>

      <StepButton direction="forward" disabled={!canStepForward} onClick={() => onStep(1)} label="Try Jev's next answer" />
    </div>
  )
}

function StepButton({
  direction,
  disabled,
  onClick,
  label,
}: {
  direction: 'back' | 'forward'
  disabled: boolean
  onClick: () => void
  label: string
}) {
  const Icon = direction === 'back' ? ChevronLeft : ChevronRight
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="flex size-6 shrink-0 items-center justify-center rounded-[var(--radius-sm)] text-[var(--lab-text-faint)] transition-colors hover:bg-[var(--lab-2)] hover:text-[var(--lab-text)] disabled:pointer-events-none disabled:opacity-20"
    >
      <Icon className="size-3.5" />
    </button>
  )
}
