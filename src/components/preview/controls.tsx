'use client'

import { motion, useReducedMotion } from 'motion/react'
import { useState } from 'react'
import { Calendar, Check, ChevronDown, Minus, Plus, Search } from 'lucide-react'
import { cn } from '@/lib/cn'
import { press, transition } from '@/lib/motion/tokens'

/**
 * Interactive controls for the generated pages.
 *
 * These are real React state — a date picker opens, a counter counts, a select
 * selects. Nothing calls a backend, but nothing is dead either: every control
 * gives believable feedback. Themed entirely from --p-* tokens so a generated
 * page inherits Jev's visual direction automatically.
 */

export function PButton({
  children,
  variant = 'primary',
  size = 'md',
  className,
  onClick,
  type = 'button',
}: {
  children: React.ReactNode
  variant?: 'primary' | 'secondary' | 'quiet'
  size?: 'sm' | 'md' | 'lg'
  className?: string
  onClick?: () => void
  type?: 'button' | 'submit'
}) {
  const reduced = useReducedMotion()
  return (
    <motion.button
      type={type}
      onClick={onClick}
      whileTap={reduced ? undefined : press}
      transition={transition.spring}
      className={cn(
        'inline-flex select-none items-center justify-center gap-2 whitespace-nowrap font-medium',
        'transition-colors duration-150',
        size === 'sm' && 'h-8 px-3 text-[0.8125rem]',
        size === 'md' && 'h-10 px-4 text-[0.9375rem]',
        size === 'lg' && 'h-12 px-6 text-[1rem]',
        variant === 'primary' &&
          'bg-[var(--p-accent)] text-[var(--p-accent-fg)] hover:bg-[var(--p-accent-hover)]',
        variant === 'secondary' &&
          'border border-[var(--p-border-strong)] bg-[var(--p-raised)] text-[var(--p-text)] hover:bg-[var(--p-surface)]',
        variant === 'quiet' && 'text-[var(--p-text)] hover:bg-[var(--p-surface)]',
        className,
      )}
      style={{ borderRadius: 'var(--p-radius)' }}
    >
      {children}
    </motion.button>
  )
}

/** A field that behaves according to its declared kind. */
export function PField({
  label,
  placeholder,
  kind,
  options,
  compact,
}: {
  label: string
  placeholder: string
  kind: 'text' | 'date' | 'counter' | 'select'
  options?: string[]
  compact?: boolean
}) {
  const [text, setText] = useState('')
  const [count, setCount] = useState(1)
  const [open, setOpen] = useState(false)
  const [picked, setPicked] = useState<string | null>(null)

  const shell = cn(
    'group relative flex flex-col justify-center border border-[var(--p-border)] bg-[var(--p-raised)]',
    'px-3 transition-colors duration-150 focus-within:border-[var(--p-accent)] hover:border-[var(--p-border-strong)]',
    compact ? 'h-14' : 'h-16',
  )

  const labelEl = (
    <span className="text-[0.6875rem] font-medium uppercase tracking-[0.07em] text-[var(--p-muted)]">
      {label}
    </span>
  )

  if (kind === 'counter') {
    return (
      <div className={shell} style={{ borderRadius: 'var(--p-radius)' }}>
        {labelEl}
        <div className="flex items-center justify-between">
          <span className="text-[0.9375rem] text-[var(--p-text)]">
            {count} {count === 1 ? 'traveller' : 'travellers'}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="Remove one"
              onClick={() => setCount((c) => Math.max(1, c - 1))}
              className="grid size-6 place-items-center rounded-full border border-[var(--p-border-strong)] text-[var(--p-muted)] transition-colors hover:bg-[var(--p-surface)] hover:text-[var(--p-text)] disabled:opacity-40"
              disabled={count <= 1}
            >
              <Minus className="size-3" />
            </button>
            <button
              type="button"
              aria-label="Add one"
              onClick={() => setCount((c) => Math.min(9, c + 1))}
              className="grid size-6 place-items-center rounded-full border border-[var(--p-border-strong)] text-[var(--p-muted)] transition-colors hover:bg-[var(--p-surface)] hover:text-[var(--p-text)]"
            >
              <Plus className="size-3" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (kind === 'date') {
    const days = Array.from({ length: 14 }, (_, i) => {
      const d = new Date()
      d.setDate(d.getDate() + i + 1)
      return d
    })
    return (
      <div className={cn(shell, 'relative')} style={{ borderRadius: 'var(--p-radius)' }}>
        {labelEl}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex items-center justify-between text-left text-[0.9375rem]"
        >
          <span className={picked ? 'text-[var(--p-text)]' : 'text-[var(--p-muted)]'}>
            {picked ?? placeholder}
          </span>
          <Calendar className="size-4 shrink-0 text-[var(--p-muted)]" />
        </button>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={transition.fast}
            className="absolute left-0 top-full z-30 mt-2 w-64 border border-[var(--p-border)] bg-[var(--p-raised)] p-2 shadow-[var(--p-shadow)]"
            style={{ borderRadius: 'var(--p-radius)' }}
          >
            <div className="grid grid-cols-7 gap-1">
              {days.map((d) => {
                const label = String(d.getDate())
                const full = d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
                return (
                  <button
                    key={full}
                    type="button"
                    onClick={() => {
                      setPicked(full)
                      setOpen(false)
                    }}
                    className="grid h-8 place-items-center rounded text-[0.8125rem] text-[var(--p-text)] transition-colors hover:bg-[var(--p-accent)] hover:text-[var(--p-accent-fg)]"
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </motion.div>
        )}
      </div>
    )
  }

  if (kind === 'select' && options?.length) {
    return (
      <div className={cn(shell, 'relative')} style={{ borderRadius: 'var(--p-radius)' }}>
        {labelEl}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex items-center justify-between text-left text-[0.9375rem]"
        >
          <span className={picked ? 'text-[var(--p-text)]' : 'text-[var(--p-muted)]'}>
            {picked ?? placeholder}
          </span>
          <ChevronDown
            className={cn(
              'size-4 shrink-0 text-[var(--p-muted)] transition-transform',
              open && 'rotate-180',
            )}
          />
        </button>
        {open && (
          <motion.ul
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={transition.fast}
            className="absolute left-0 top-full z-30 mt-2 w-full overflow-hidden border border-[var(--p-border)] bg-[var(--p-raised)] py-1 shadow-[var(--p-shadow)]"
            style={{ borderRadius: 'var(--p-radius)' }}
          >
            {options.map((o) => (
              <li key={o}>
                <button
                  type="button"
                  onClick={() => {
                    setPicked(o)
                    setOpen(false)
                  }}
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-[0.875rem] text-[var(--p-text)] transition-colors hover:bg-[var(--p-surface)]"
                >
                  {o}
                  {picked === o && <Check className="size-3.5 text-[var(--p-accent)]" />}
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </div>
    )
  }

  return (
    <div className={shell} style={{ borderRadius: 'var(--p-radius)' }}>
      {labelEl}
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
        aria-label={label}
        className="w-full bg-transparent text-[0.9375rem] text-[var(--p-text)] outline-none placeholder:text-[var(--p-muted)]"
      />
    </div>
  )
}

/** The search block used by the search-first hero and the search section. */
export function PSearchPanel({
  fields,
  submitLabel,
  tabs,
  compact,
}: {
  fields: { label: string; placeholder: string; kind: 'text' | 'date' | 'counter' | 'select'; options: string[] }[]
  submitLabel: string
  tabs?: string[]
  compact?: boolean
}) {
  const [tab, setTab] = useState(0)
  const [submitted, setSubmitted] = useState(false)

  return (
    <div
      className="border border-[var(--p-border)] bg-[var(--p-raised)] p-3 shadow-[var(--p-shadow)] sm:p-4"
      style={{ borderRadius: 'calc(var(--p-radius) * 1.4)' }}
    >
      {tabs && tabs.length > 1 && (
        <div className="mb-3 flex gap-1 border-b border-[var(--p-border)]">
          {tabs.map((t, i) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(i)}
              className={cn(
                'relative px-3 py-2 text-[0.875rem] font-medium transition-colors',
                i === tab ? 'text-[var(--p-text)]' : 'text-[var(--p-muted)] hover:text-[var(--p-text)]',
              )}
            >
              {t}
              {i === tab && (
                <motion.span
                  layoutId="p-search-tab"
                  transition={transition.gentle}
                  className="absolute inset-x-0 -bottom-px h-0.5 bg-[var(--p-accent)]"
                />
              )}
            </button>
          ))}
        </div>
      )}

      <div
        className={cn(
          'grid gap-2',
          fields.length >= 4 ? 'sm:grid-cols-2 lg:grid-cols-4' : 'sm:grid-cols-' + fields.length,
        )}
      >
        {fields.map((f) => (
          <PField key={f.label} {...f} compact={compact} />
        ))}
      </div>

      <div className="mt-3">
        <PButton
          size="lg"
          className="w-full"
          onClick={() => {
            setSubmitted(true)
            window.setTimeout(() => setSubmitted(false), 1800)
          }}
        >
          {submitted ? (
            <>
              <Check className="size-4" /> Searching…
            </>
          ) : (
            <>
              <Search className="size-4" /> {submitLabel}
            </>
          )}
        </PButton>
      </div>
    </div>
  )
}
