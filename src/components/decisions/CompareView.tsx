'use client'

import { useState } from 'react'
import { ArrowRight, Maximize2, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/Button'
import { Renderer } from '@/components/preview/Renderer'
import { BlueprintSummary } from '@/components/decisions/BlueprintSummary'
import { transition } from '@/lib/motion/tokens'
import { QUESTION_TITLES } from '@/lib/jev/questions'
import type { Departure } from '@/lib/jev/directions'
import type { CritiqueReport, PageBlueprint } from '@/schemas/blueprint'
import type { LandingPageSpec } from '@/schemas/spec'

export type CompareSide = {
  spec: LandingPageSpec
  blueprint: PageBlueprint
  critique: CritiqueReport | null
  /** Jev's combined probability for this side's strategy. */
  probability: number | null
}

/**
 * Jev's page next to an alternative — usually "what if Jev had chosen the
 * runner-up strategy?", optionally with execution decisions edited too. The
 * strategic difference (approach, story, sections, ask, visual direction,
 * Jev's confidence) sits above each page; the pages themselves are scaled
 * to fit as silhouettes, and either side expands to full size on demand.
 */
export function CompareView({
  jev,
  alternative,
  departures,
  onClose,
}: {
  jev: CompareSide
  alternative: CompareSide
  departures: Departure[]
  onClose: () => void
}) {
  const [expanded, setExpanded] = useState<'jev' | 'edited' | null>(null)
  const sameStrategy = jev.blueprint.strategyId === alternative.blueprint.strategyId
  const altLabel = sameStrategy ? "Jev's strategy, your edits" : 'Alternative strategy'

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center gap-3 border-b border-[var(--lab-border)] bg-[var(--lab-1)] px-4 py-2.5">
        <h2 className="text-[0.8125rem] font-semibold text-[var(--lab-text)]">
          {sameStrategy ? 'Jev vs. your edits' : 'Jev’s strategy vs. the alternative'}
        </h2>
        {departures.length > 0 && (
          <span className="font-mono text-[0.6875rem] text-[var(--lab-text-faint)]">
            {departures.length} execution {departures.length === 1 ? 'change' : 'changes'}
          </span>
        )}
        <Button variant="ghost" size="sm" onClick={onClose} className="ml-auto">
          <X className="size-3.5" />
          Close
        </Button>
      </div>

      {departures.length > 0 && (
        <ul className="flex shrink-0 flex-wrap gap-x-4 gap-y-1 border-b border-[var(--lab-border)] bg-[var(--lab-0)] px-4 py-2">
          {departures.map((d) => (
            <li
              key={d.decisionId}
              className="flex items-center gap-1.5 text-[0.6875rem] text-[var(--lab-text-muted)]"
            >
              <span className="text-[var(--lab-text-faint)]">{QUESTION_TITLES[d.decisionId] ?? d.decisionId}:</span>
              <span className="line-through opacity-60">{short(d.from)}</span>
              <ArrowRight className="size-2.5 text-[var(--lab-text-faint)]" />
              <span className="text-[var(--lab-warn)]">{short(d.to)}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="grid max-h-[40%] shrink-0 grid-cols-1 gap-px overflow-y-auto border-b border-[var(--lab-border)] bg-[var(--lab-border)] sm:grid-cols-2">
        <div className="bg-[var(--lab-0)] p-4">
          <BlueprintSummary label="Jev's pick" blueprint={jev.blueprint} probability={jev.probability} critique={jev.critique} />
        </div>
        <div className="bg-[var(--lab-0)] p-4">
          <BlueprintSummary
            label={altLabel}
            blueprint={alternative.blueprint}
            probability={alternative.probability}
            critique={alternative.critique}
            accent
          />
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-px overflow-hidden bg-[var(--lab-border)] sm:grid-cols-2">
        <Thumbnail
          label={jev.blueprint.strategyName}
          spec={jev.spec}
          onExpand={() => setExpanded('jev')}
        />
        <Thumbnail
          label={alternative.blueprint.strategyName}
          spec={alternative.spec}
          accent
          onExpand={() => setExpanded('edited')}
        />
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={transition.fast}
            className="fixed inset-0 z-50 flex flex-col bg-[var(--lab-0)]"
          >
            <div className="flex h-11 shrink-0 items-center gap-2 border-b border-[var(--lab-border)] px-3">
              <span className="text-[0.75rem] font-medium text-[var(--lab-text)]">
                {expanded === 'jev' ? jev.blueprint.strategyName : alternative.blueprint.strategyName}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setExpanded(null)}
                className="ml-auto"
              >
                <X className="size-3.5" />
                Back to compare
              </Button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto bg-white">
              <Renderer spec={expanded === 'jev' ? jev.spec : alternative.spec} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function short(label: string, max = 22) {
  const head = label.split(/[;—]/)[0].trim()
  return head.length > max ? `${head.slice(0, max - 1)}…` : head
}

function Thumbnail({
  label,
  spec,
  accent,
  onExpand,
}: {
  label: string
  spec: LandingPageSpec
  accent?: boolean
  onExpand: () => void
}) {
  return (
    <div className="flex min-h-0 flex-col bg-[var(--lab-0)]">
      <div className="flex shrink-0 items-center gap-2 px-3 py-2">
        <span
          className={cn(
            'text-[0.75rem] font-medium',
            accent ? 'text-[var(--lab-warn)]' : 'text-[var(--lab-text)]',
          )}
        >
          {label}
        </span>
        <button
          type="button"
          onClick={onExpand}
          className="ml-auto flex items-center gap-1 rounded-[var(--radius-sm)] px-1.5 py-0.5 text-[0.6875rem] text-[var(--lab-text-faint)] transition-colors hover:bg-[var(--lab-2)] hover:text-[var(--lab-text)]"
        >
          <Maximize2 className="size-3" />
          Expand
        </button>
      </div>

      {/* Scaled silhouette: the real page rendered small, not a screenshot.
          It carries its own buttons and links, so the click target can't be a
          <button> itself (no nested interactive controls) — an overlay
          catches the click instead, leaving the miniature page beneath it
          reachable on its own terms for anyone tabbing through. */}
      <div className="group relative min-h-0 flex-1 overflow-hidden bg-[var(--lab-1)]">
        <div
          className="pointer-events-none absolute left-1/2 top-3 w-[1000px] origin-top bg-white shadow-[var(--shadow-lg)] transition-transform duration-200 group-hover:[transform:translateX(-50%)_scale(0.35)]"
          style={{ transform: 'translateX(-50%) scale(0.34)' }}
        >
          <Renderer spec={spec} />
        </div>
        <button
          type="button"
          onClick={onExpand}
          aria-label={`Expand ${label}`}
          className="absolute inset-0 h-full w-full cursor-pointer"
        />
      </div>
    </div>
  )
}
