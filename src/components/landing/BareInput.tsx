'use client'

import { useEffect, useRef, type CSSProperties } from 'react'

const MIN_CHARS = 20

/**
 * The only thing on screen: no box, no button, just a caret. Enter submits,
 * Shift+Enter breaks a line. The hint appears once the brief is long enough.
 */
export function BareInput({
  value,
  onChange,
  onSubmit,
  locked = false,
  style,
}: {
  value: string
  onChange: (v: string) => void
  onSubmit: (brief: string) => void
  /** Read-only while the brief is being worked on. */
  locked?: boolean
  style?: CSSProperties
}) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const ready = value.trim().length >= MIN_CHARS

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [value])

  return (
    <div className="w-full max-w-[40rem]" style={style}>
      <textarea
        ref={ref}
        autoFocus
        rows={1}
        readOnly={locked}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key !== 'Enter' || e.shiftKey) return
          e.preventDefault()
          if (ready && !locked) onSubmit(value.trim())
        }}
        placeholder="Describe the landing page you want…"
        aria-label="Describe your product"
        className="block max-h-[50dvh] w-full resize-none bg-transparent text-center text-[clamp(1.375rem,3.2vw,2.125rem)] leading-[1.3] tracking-[-0.02em] text-current caret-current outline-none placeholder:text-current placeholder:opacity-35 focus-visible:outline-none"
      />
      <p
        aria-live="polite"
        className="mt-5 text-center font-mono text-[0.6875rem] tracking-wide transition-opacity duration-500"
        style={{ opacity: ready && !locked ? 0.55 : 0 }}
      >
        press enter ↵
      </p>
    </div>
  )
}
