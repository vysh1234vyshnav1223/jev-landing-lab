'use client'

import { motion, useReducedMotion } from 'motion/react'
import { forwardRef, type ReactNode, type TextareaHTMLAttributes, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'
import { lift, transition } from '@/lib/motion/tokens'

/* ── Card ───────────────────────────────────────────────────── */

export function Card({
  className,
  children,
  interactive,
  ...rest
}: React.HTMLAttributes<HTMLDivElement> & { interactive?: boolean }) {
  const reduced = useReducedMotion()
  return (
    <motion.div
      whileHover={interactive && !reduced ? lift : undefined}
      transition={transition.gentle}
      className={cn(
        'rounded-[var(--radius-lg)] border border-[var(--lab-border)] bg-[var(--lab-1)]',
        interactive &&
          'cursor-pointer transition-colors hover:border-[var(--lab-border-strong)] hover:bg-[var(--lab-2)]',
        className,
      )}
      {...(rest as React.ComponentProps<typeof motion.div>)}
    >
      {children}
    </motion.div>
  )
}

/* ── Badge ──────────────────────────────────────────────────── */

const BADGE_TONES = {
  neutral: 'bg-[var(--lab-3)] text-[var(--lab-text-muted)] border-[var(--lab-border-strong)]',
  accent: 'bg-[var(--lab-accent-soft)] text-[var(--lab-accent)] border-[var(--lab-accent)]/25',
  positive: 'bg-[var(--lab-positive)]/12 text-[var(--lab-positive)] border-[var(--lab-positive)]/25',
  warn: 'bg-[var(--lab-warn)]/12 text-[var(--lab-warn)] border-[var(--lab-warn)]/25',
  danger: 'bg-[var(--lab-danger)]/12 text-[var(--lab-danger)] border-[var(--lab-danger)]/25',
} as const

export function Badge({
  tone = 'neutral',
  className,
  children,
}: {
  tone?: keyof typeof BADGE_TONES
  className?: string
  children: ReactNode
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5',
        'text-[0.6875rem] font-medium leading-5 tracking-[0.01em]',
        BADGE_TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

/* ── Input / Textarea ───────────────────────────────────────── */

const FIELD =
  'w-full rounded-[var(--radius)] border border-[var(--lab-border-strong)] bg-[var(--lab-1)] ' +
  'px-3 py-2 text-[var(--step-0)] text-[var(--lab-text)] placeholder:text-[var(--lab-text-faint)] ' +
  'transition-[border-color,box-shadow,background-color] duration-200 ' +
  'hover:border-[var(--lab-5)] ' +
  'focus:border-[var(--lab-accent)] focus:bg-[var(--lab-2)] focus:outline-none ' +
  'focus:shadow-[0_0_0_3px_var(--lab-accent-soft)]'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...rest }, ref) => (
    <input ref={ref} className={cn(FIELD, 'h-9.5', className)} {...rest} />
  ),
)
Input.displayName = 'Input'

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...rest }, ref) => (
  <textarea ref={ref} className={cn(FIELD, 'resize-none', className)} {...rest} />
))
Textarea.displayName = 'Textarea'

/* ── Label ──────────────────────────────────────────────────── */

export function Label({ className, children, ...rest }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn(
        'block text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-[var(--lab-text-faint)]',
        className,
      )}
      {...rest}
    >
      {children}
    </label>
  )
}

/* ── Skeleton ───────────────────────────────────────────────── */

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('lab-shimmer rounded-[var(--radius-sm)]', className)} />
}

/* ── Status dot ─────────────────────────────────────────────── */

const STATUS_COLOR = {
  idle: 'bg-[var(--lab-5)]',
  active: 'bg-[var(--lab-accent)]',
  done: 'bg-[var(--lab-positive)]',
  error: 'bg-[var(--lab-danger)]',
} as const

export function StatusDot({
  status,
  className,
}: {
  status: keyof typeof STATUS_COLOR
  className?: string
}) {
  return (
    <span className={cn('relative flex size-2', className)}>
      {status === 'active' && (
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-[var(--lab-accent)] opacity-60" />
      )}
      <span className={cn('relative inline-flex size-2 rounded-full', STATUS_COLOR[status])} />
    </span>
  )
}
