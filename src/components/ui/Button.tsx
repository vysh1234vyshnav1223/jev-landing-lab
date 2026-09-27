'use client'

import { motion, useReducedMotion, type HTMLMotionProps } from 'motion/react'
import { forwardRef } from 'react'
import { cn } from '@/lib/cn'
import { press, transition } from '@/lib/motion/tokens'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-[var(--lab-accent)] text-[var(--lab-accent-fg)] hover:bg-[var(--lab-accent-hover)] font-medium shadow-[0_1px_0_rgba(255,255,255,.14)_inset]',
  secondary:
    'bg-[var(--lab-3)] text-[var(--lab-text)] border border-[var(--lab-border-strong)] hover:bg-[var(--lab-4)] hover:border-[var(--lab-5)]',
  ghost:
    'text-[var(--lab-text-muted)] hover:text-[var(--lab-text)] hover:bg-[var(--lab-2)]',
  danger:
    'bg-[var(--lab-danger)]/12 text-[var(--lab-danger)] border border-[var(--lab-danger)]/30 hover:bg-[var(--lab-danger)]/20',
}

const SIZES: Record<Size, string> = {
  sm: 'h-8 px-3 text-[var(--step--1)] gap-1.5 rounded-[var(--radius-sm)]',
  md: 'h-9.5 px-4 text-[var(--step-0)] gap-2 rounded-[var(--radius)]',
  lg: 'h-11 px-5 text-[var(--step-0)] gap-2 rounded-[var(--radius)]',
}

export type ButtonProps = Omit<HTMLMotionProps<'button'>, 'children'> & {
  variant?: Variant
  size?: Size
  loading?: boolean
  children?: React.ReactNode
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, className, children, disabled, ...rest }, ref) => {
    const reduced = useReducedMotion()
    const inert = disabled || loading

    return (
      <motion.button
        ref={ref}
        disabled={inert}
        whileTap={reduced || inert ? undefined : press}
        transition={transition.spring}
        className={cn(
          'relative inline-flex select-none items-center justify-center whitespace-nowrap',
          'transition-colors duration-150',
          'disabled:pointer-events-none disabled:opacity-45',
          VARIANTS[variant],
          SIZES[size],
          className,
        )}
        {...rest}
      >
        {loading && (
          <span
            aria-hidden
            className="absolute left-1/2 size-3.5 -translate-x-1/2 animate-spin rounded-full border-[1.5px] border-current border-t-transparent"
          />
        )}
        <span className={cn('inline-flex items-center gap-2', loading && 'opacity-0')}>
          {children}
        </span>
      </motion.button>
    )
  },
)
Button.displayName = 'Button'
