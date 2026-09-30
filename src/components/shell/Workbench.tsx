'use client'

import { motion } from 'motion/react'
import { cn } from '@/lib/cn'
import { transition } from '@/lib/motion/tokens'

/**
 * The persistent application shell.
 *
 * Every phase — input, generation, result — renders INSIDE this frame. The
 * chrome and the status bar never unmount, so the app never appears
 * to navigate between pages. That continuity is what separates a tool from a
 * sequence of screens.
 */
export function Workbench({
  children,
  status,
  inspector,
}: {
  children: React.ReactNode
  status: React.ReactNode
  inspector?: React.ReactNode
}) {
  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-[var(--lab-0)]">
      <TitleBar />

      <div className="flex min-h-0 flex-1">
        <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
          {children}
        </main>

        {inspector}
      </div>

      <StatusBar>{status}</StatusBar>
    </div>
  )
}

function TitleBar() {
  return (
    <header className="flex h-11 shrink-0 items-center gap-3 border-b border-[var(--lab-border)] bg-[var(--lab-1)] px-3">
      <span className="flex items-center gap-2">
        <Mark />
        <span className="text-[0.8125rem] font-semibold tracking-tight text-[var(--lab-text)]">
          Jev Landing Lab
        </span>
      </span>

      <span className="ml-auto flex items-center gap-2 text-[0.6875rem] text-[var(--lab-text-faint)]">
        <span className="hidden font-mono sm:inline">ai proposes · jev judges · code enforces · ai writes</span>
      </span>
    </header>
  )
}

/** A small deterministic mark — a distribution collapsing to one choice. */
function Mark() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden className="shrink-0">
      <rect x="1" y="2" width="2.5" height="12" rx="1.25" fill="var(--lab-5)" />
      <rect x="5" y="4.5" width="2.5" height="9.5" rx="1.25" fill="var(--lab-5)" />
      <rect x="9" y="1" width="2.5" height="13" rx="1.25" fill="var(--lab-accent)" />
      <rect x="13" y="7" width="2.5" height="7" rx="1.25" fill="var(--lab-5)" />
    </svg>
  )
}

function StatusBar({ children }: { children: React.ReactNode }) {
  return (
    <footer className="flex h-7 shrink-0 items-center gap-3 border-t border-[var(--lab-border)] bg-[var(--lab-1)] px-3 text-[0.6875rem] text-[var(--lab-text-faint)]">
      {children}
    </footer>
  )
}

/** Status bar cell. Monospaced so values don't jitter as they update. */
export function StatusCell({
  label,
  value,
  tone = 'muted',
}: {
  label?: string
  value: string
  tone?: 'muted' | 'accent' | 'positive' | 'danger'
}) {
  return (
    <span className="flex items-center gap-1.5 whitespace-nowrap">
      {label && <span className="text-[var(--lab-text-faint)]">{label}</span>}
      <motion.span
        key={value}
        initial={{ opacity: 0.4 }}
        animate={{ opacity: 1 }}
        transition={transition.fast}
        className={cn(
          'font-mono tabular-nums',
          tone === 'muted' && 'text-[var(--lab-text-muted)]',
          tone === 'accent' && 'text-[var(--lab-accent)]',
          tone === 'positive' && 'text-[var(--lab-positive)]',
          tone === 'danger' && 'text-[var(--lab-danger)]',
        )}
      >
        {value}
      </motion.span>
    </span>
  )
}

export function StatusDivider() {
  return <span className="h-3 w-px shrink-0 bg-[var(--lab-border)]" aria-hidden />
}
