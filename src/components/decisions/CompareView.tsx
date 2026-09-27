'use client'

import { useState } from 'react'
import { ArrowRight, Maximize2, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/Button'
import { Renderer } from '@/components/preview/Renderer'
import { transition } from '@/lib/motion/tokens'
import type { Departure } from '@/lib/jev/directions'
import type { LandingPageSpec } from '@/schemas/spec'

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
 * Jev's page next to a person's edited version, both scaled to fit — a
 * silhouette comparison, not two full-size pages fighting for scroll. Either
 * side expands to full size on demand.
 */
export function CompareView({
  jevSpec,
  editedSpec,
  departures,
  onClose,
}: {
  jevSpec: LandingPageSpec
  editedSpec: LandingPageSpec
  departures: Departure[]
  onClose: () => void
}) {
  const [expanded, setExpanded] = useState<'jev' | 'edited' | null>(null)

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center gap-3 border-b border-[var(--lab-border)] bg-[var(--lab-1)] px-4 py-2.5">
        <h2 className="text-[0.8125rem] font-semibold text-[var(--lab-text)]">
          Jev vs. your version
        </h2>
        <span className="font-mono text-[0.6875rem] text-[var(--lab-text-faint)]">
          {departures.length} {departures.length === 1 ? 'change' : 'changes'}
        </span>
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
              <span className="text-[var(--lab-text-faint)]">{TITLES[d.decisionId] ?? d.decisionId}:</span>
              <span className="line-through opacity-60">{short(d.from)}</span>
              <ArrowRight className="size-2.5 text-[var(--lab-text-faint)]" />
              <span className="text-[var(--lab-warn)]">{short(d.to)}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-px overflow-hidden bg-[var(--lab-border)] sm:grid-cols-2">
        <Thumbnail
          label="Jev"
          spec={jevSpec}
          onExpand={() => setExpanded('jev')}
        />
        <Thumbnail
          label="Your version"
          spec={editedSpec}
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
                {expanded === 'jev' ? 'Jev' : 'Your version'}
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
              <Renderer spec={expanded === 'jev' ? jevSpec : editedSpec} />
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
