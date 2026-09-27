'use client'

import { motion } from 'motion/react'
import { useId } from 'react'
import { cn } from '@/lib/cn'
import { transition } from '@/lib/motion/tokens'

/**
 * Segmented control. The active indicator is a shared layout animation, so it
 * slides between options rather than blinking — the motion communicates that
 * these are alternatives within one set.
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  size = 'md',
  className,
  ariaLabel,
}: {
  options: { value: T; label: string; hint?: string }[]
  value: T
  onChange: (v: T) => void
  size?: 'sm' | 'md'
  className?: string
  ariaLabel?: string
}) {
  const layoutId = useId()

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        'inline-flex items-center gap-1 rounded-[var(--radius)] border border-[var(--lab-border)] bg-[var(--lab-1)] p-1',
        className,
      )}
    >
      {options.map((opt) => {
        const active = opt.value === value
        return (
          <button
            key={opt.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              'relative rounded-[var(--radius-sm)] font-medium transition-colors duration-150',
              size === 'sm' ? 'px-2.5 py-1 text-[var(--step--1)]' : 'px-3.5 py-1.5 text-[var(--step-0)]',
              active ? 'text-[var(--lab-text)]' : 'text-[var(--lab-text-faint)] hover:text-[var(--lab-text-muted)]',
            )}
          >
            {active && (
              <motion.span
                layoutId={layoutId}
                transition={transition.gentle}
                className="absolute inset-0 rounded-[var(--radius-sm)] border border-[var(--lab-border-strong)] bg-[var(--lab-3)]"
              />
            )}
            <span className="relative z-10 whitespace-nowrap">{opt.label}</span>
          </button>
        )
      })}
    </div>
  )
}
