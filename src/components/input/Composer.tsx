'use client'

import { motion, useReducedMotion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { CornerDownLeft } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/Button'
import { EXAMPLES } from '@/components/input/examples'
import { listContainer, listItem, transition } from '@/lib/motion/tokens'
import type { BriefInput } from '@/schemas/brief'

/**
 * The brief composer.
 *
 * Left-aligned and sized like a working surface, not a marketing hero. The
 * point is that this is an input to a system, not a pitch — so the copy is
 * small, the field is large, and nothing is centered.
 */

const MIN_CHARS = 20

export function Composer({
  onSubmit,
  disabled,
}: {
  onSubmit: (input: BriefInput) => void
  disabled?: boolean
}) {
  const [brief, setBrief] = useState('')
  const [audience, setAudience] = useState('')
  const [primaryGoal, setPrimaryGoal] = useState('')
  const [attributes, setAttributes] = useState('')
  const [activeExample, setActiveExample] = useState<string | null>(null)
  const [touched, setTouched] = useState(false)
  const ref = useRef<HTMLTextAreaElement>(null)
  const reduced = useReducedMotion()

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 260)}px`
  }, [brief])

  // Cmd/Ctrl+Enter from anywhere submits; plain typing focuses the field.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault()
        submit()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const tooShort = brief.trim().length < MIN_CHARS
  const showError = touched && tooShort

  function submit() {
    setTouched(true)
    if (tooShort) {
      ref.current?.focus()
      return
    }
    onSubmit({
      brief: brief.trim(),
      audience: audience.trim() || undefined,
      primaryGoal: primaryGoal.trim() || undefined,
      brandAttributes: attributes
        .split(/[,·]/)
        .map((a) => a.trim())
        .filter(Boolean)
        .slice(0, 6),
    })
  }

  function applyExample(ex: (typeof EXAMPLES)[number]) {
    setActiveExample(ex.id)
    setBrief(ex.brief)
    setAudience(ex.audience)
    setPrimaryGoal(ex.primaryGoal)
    setAttributes(ex.brandAttributes.join(' · '))
    setTouched(false)
    ref.current?.focus()
  }

  return (
    <motion.div
      variants={listContainer}
      initial="hidden"
      animate="show"
      className="w-full"
    >
      <motion.div variants={listItem}>
        <div
          className={cn(
            'overflow-hidden border bg-[var(--ink-2)] transition-all duration-200',
            showError
              ? 'border-[#ff7a7a]/60 shadow-[0_0_0_3px_rgba(255,122,122,.08)]'
              : 'border-[var(--hair)] focus-within:border-[var(--sodium)] focus-within:shadow-[0_0_0_3px_rgba(255,176,58,.1)]',
          )}
        >
          <div className="flex items-center gap-2 border-b border-[var(--hair)] px-3 py-1.5">
            <span className="font-mono text-[0.6875rem] text-[var(--dim)]">
              Brief
            </span>
            <span className="ml-auto font-mono text-[0.625rem] tabular-nums text-[var(--dim)]">
              {brief.trim().length}
            </span>
          </div>

          <textarea
            ref={ref}
            value={brief}
            disabled={disabled}
            onChange={(e) => {
              setBrief(e.target.value)
              setActiveExample(null)
            }}
            rows={5}
            placeholder="A flight booking platform for budget travellers in India. We compete with MakeMyTrip on price transparency — no booking fee, taxes shown upfront. The main thing I want people to do is search for flights."
            aria-label="Product brief"
            aria-invalid={showError}
            className="block min-h-[7.5rem] w-full resize-none bg-transparent px-3.5 py-3 text-[0.9375rem] leading-relaxed text-[var(--paper)] outline-none placeholder:text-[var(--dim)]"
          />

          <div className="flex items-center justify-between gap-3 border-t border-[var(--hair)] bg-[var(--ink)]/40 px-3 py-2">
            <span
              className={cn(
                'font-mono text-[0.75rem]',
                showError ? 'text-[#ff7a7a]' : 'text-[var(--dim)]',
              )}
            >
              {showError
                ? `${MIN_CHARS - brief.trim().length} more characters`
                : 'More context, sharper decisions'}
            </span>
            <Button
              onClick={submit}
              size="sm"
              loading={disabled}
              className="rounded-none bg-[var(--sodium)] font-mono text-[var(--ink)] shadow-none hover:bg-[#ffc266]"
            >
              Run decision pass
              <kbd className="ml-1 hidden items-center gap-0.5 rounded border border-current/25 px-1 text-[0.5625rem] opacity-70 sm:inline-flex">
                <CornerDownLeft className="size-2.5" />
              </kbd>
            </Button>
          </div>
        </div>
      </motion.div>

      <motion.div variants={listItem} className="mt-3 flex flex-wrap items-center gap-1.5">
        {EXAMPLES.map((ex) => (
          <motion.button
            key={ex.id}
            type="button"
            disabled={disabled}
            onClick={() => applyExample(ex)}
            whileTap={reduced ? undefined : { scale: 0.97 }}
            transition={transition.spring}
            className={cn(
              'rounded-full border px-2.5 py-1 font-mono text-[0.75rem] transition-colors duration-150 disabled:opacity-40',
              activeExample === ex.id
                ? 'border-[var(--sodium)]/50 bg-[rgba(255,176,58,.1)] text-[var(--sodium)]'
                : 'border-[var(--hair)] text-[var(--dim)] hover:border-[var(--dim)]/50 hover:bg-[var(--ink-2)] hover:text-[var(--paper)]',
            )}
          >
            {ex.label}
          </motion.button>
        ))}
      </motion.div>

      <motion.div variants={listItem} className="mt-5 grid gap-px overflow-hidden border border-[var(--hair)] bg-[var(--hair)] sm:grid-cols-3">
        <Field label="Audience" value={audience} onChange={setAudience} disabled={disabled} />
        <Field label="Primary goal" value={primaryGoal} onChange={setPrimaryGoal} disabled={disabled} />
        <Field label="Brand" value={attributes} onChange={setAttributes} disabled={disabled} />
      </motion.div>

      <motion.p variants={listItem} className="mt-2 font-mono text-[0.6875rem] text-[var(--dim)]">
        Optional — anything left blank is inferred from the brief.
      </motion.p>
    </motion.div>
  )
}

function Field({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  disabled?: boolean
}) {
  return (
    <label className="flex flex-col gap-0.5 bg-[var(--ink-2)] px-3 py-2 transition-colors focus-within:bg-[var(--ink-3)]">
      <span className="font-mono text-[0.6875rem] text-[var(--dim)]">
        {label}
      </span>
      <input
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Inferred"
        className="w-full bg-transparent text-[0.8125rem] text-[var(--paper)] outline-none placeholder:text-[var(--dim)]/60"
      />
    </label>
  )
}
