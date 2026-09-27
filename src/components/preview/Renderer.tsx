'use client'

import { motion } from 'motion/react'
import { useState } from 'react'
import { Menu, X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { transition } from '@/lib/motion/tokens'
import { PButton } from '@/components/preview/controls'
import { Hero } from '@/components/preview/Hero'
import { Section } from '@/components/preview/sections'
import type { LandingPageSpec } from '@/schemas/spec'

/**
 * Renders a validated LandingPageSpec using our own components.
 *
 * The model never emits markup or code — only data that passed Zod. The
 * `data-preview` wrapper scopes the generated page's theme so it can never
 * leak into the lab shell around it.
 */
export function Renderer({ spec }: { spec: LandingPageSpec }) {
  return (
    <div
      data-preview
      data-theme={spec.theme.direction}
      data-accent={spec.theme.accent}
      className="min-h-full"
    >
      <Nav spec={spec} />
      <Hero hero={spec.hero} />
      <main>
        {spec.sections.map((section, i) => (
          <Section key={`${section.type}-${i}`} spec={section} />
        ))}
      </main>
      <Footer spec={spec} />
    </div>
  )
}

function Nav({ spec }: { spec: LandingPageSpec }) {
  const [open, setOpen] = useState(false)
  const { navigation } = spec

  return (
    <nav
      className={cn(
        'z-20 border-b border-[var(--p-border)] bg-[var(--p-bg)]/85 backdrop-blur-md',
        navigation.sticky && 'sticky top-0',
      )}
    >
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-5 sm:h-16 sm:px-8">
        <span
          className="text-[1.0625rem] tracking-tight"
          style={{ fontWeight: 'var(--p-heading-weight)' as unknown as number }}
        >
          {navigation.wordmark}
        </span>

        {navigation.links.length > 0 && (
          <ul className="hidden items-center gap-1 md:flex">
            {navigation.links.map((l) => (
              <li key={l.label}>
                <a
                  href={l.href}
                  onClick={(e) => e.preventDefault()}
                  className="px-3 py-1.5 text-[0.875rem] text-[var(--p-muted)] transition-colors hover:text-[var(--p-text)]"
                  style={{ borderRadius: 'var(--p-radius)' }}
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        )}

        <div className="flex items-center gap-2">
          <PButton size="sm" variant="secondary" className="hidden sm:inline-flex">
            {navigation.ctaLabel}
          </PButton>
          {navigation.links.length > 0 && (
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              aria-label={open ? 'Close menu' : 'Open menu'}
              aria-expanded={open}
              className="grid size-9 place-items-center text-[var(--p-muted)] transition-colors hover:text-[var(--p-text)] md:hidden"
              style={{ borderRadius: 'var(--p-radius)' }}
            >
              {open ? <X className="size-4.5" /> : <Menu className="size-4.5" />}
            </button>
          )}
        </div>
      </div>

      {open && (
        <motion.ul
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          transition={transition.normal}
          className="overflow-hidden border-t border-[var(--p-border)] px-5 md:hidden"
        >
          {spec.navigation.links.map((l) => (
            <li key={l.label}>
              <a
                href={l.href}
                onClick={(e) => {
                  e.preventDefault()
                  setOpen(false)
                }}
                className="block py-3 text-[0.9375rem] text-[var(--p-text)]"
              >
                {l.label}
              </a>
            </li>
          ))}
          <li className="py-3">
            <PButton size="sm" variant="secondary" className="w-full">
              {spec.navigation.ctaLabel}
            </PButton>
          </li>
        </motion.ul>
      )}
    </nav>
  )
}

function Footer({ spec }: { spec: LandingPageSpec }) {
  return (
    <footer className="border-t border-[var(--p-border)] bg-[var(--p-surface)] px-5 py-10 sm:px-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-8 sm:flex-row sm:justify-between">
        <div className="max-w-xs">
          <span
            className="text-[1rem] tracking-tight"
            style={{ fontWeight: 'var(--p-heading-weight)' as unknown as number }}
          >
            {spec.navigation.wordmark}
          </span>
          <p className="mt-2 text-[0.8125rem] leading-relaxed text-[var(--p-muted)]">
            {spec.footer.tagline}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
          {spec.footer.columns.map((col) => (
            <div key={col.title}>
              <h3 className="mb-2.5 text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-[var(--p-muted)]">
                {col.title}
              </h3>
              <ul className="flex flex-col gap-1.5">
                {col.links.map((l) => (
                  <li key={l}>
                    <a
                      href="#"
                      onClick={(e) => e.preventDefault()}
                      className="text-[0.8125rem] text-[var(--p-muted)] transition-colors hover:text-[var(--p-text)]"
                    >
                      {l}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </footer>
  )
}
