'use client'

import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useState } from 'react'
import {
  ArrowRight,
  Check,
  ChevronDown,
  Minus,
  Star,
  type LucideIcon,
} from 'lucide-react'
import * as Icons from 'lucide-react'
import { cn } from '@/lib/cn'
import { transition } from '@/lib/motion/tokens'
import { PButton, PSearchPanel } from '@/components/preview/controls'
import type { SectionSpec } from '@/schemas/spec'

/**
 * Section renderers. One component per section type in the spec; the spec is
 * Zod-validated before it reaches here, so these never defend against
 * arbitrary model output.
 */

const SECTION = 'px-5 sm:px-8'

function Shell({
  heading,
  subheading,
  children,
  center,
  tone = 'plain',
}: {
  heading: string
  subheading?: string | null
  children: React.ReactNode
  center?: boolean
  tone?: 'plain' | 'surface'
}) {
  return (
    <section
      className={cn(SECTION, tone === 'surface' && 'bg-[var(--p-surface)]')}
      style={{ paddingTop: 'var(--p-section-y)', paddingBottom: 'var(--p-section-y)' }}
    >
      <div className="mx-auto max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={transition.slow}
          className={cn('mb-8 flex flex-col gap-2', center && 'items-center text-center')}
        >
          <h2
            className="text-balance text-[clamp(1.5rem,3vw,2.125rem)] leading-tight"
            style={{
              letterSpacing: 'var(--p-heading-tracking)',
              fontWeight: 'var(--p-heading-weight)' as unknown as number,
            }}
          >
            {heading}
          </h2>
          {subheading && (
            <p className="max-w-2xl text-pretty text-[1rem] leading-relaxed text-[var(--p-muted)]">
              {subheading}
            </p>
          )}
        </motion.div>
        {children}
      </div>
    </section>
  )
}

/** Model gives us a kebab-case lucide name; fall back rather than crash. */
function iconFor(name: string): LucideIcon {
  const pascal = name
    .split(/[-_\s]/)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join('')
  const found = (Icons as unknown as Record<string, LucideIcon>)[pascal]
  return found ?? Icons.Sparkles
}

function reveal(i: number) {
  return {
    initial: { opacity: 0, y: 14 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: '-40px' },
    transition: { ...transition.slow, delay: Math.min(i * 0.06, 0.3) },
  }
}

const cardStyle = { borderRadius: 'var(--p-radius)' }

export function Section({ spec }: { spec: SectionSpec }) {
  switch (spec.type) {
    case 'search':
      return (
        <Shell heading={spec.heading} subheading={spec.subheading} center tone="surface">
          <PSearchPanel fields={spec.fields} submitLabel={spec.submitLabel} tabs={spec.tabs} compact />
        </Shell>
      )

    case 'featureGrid':
      return (
        <Shell heading={spec.heading} subheading={spec.subheading}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {spec.items.map((item, i) => {
              const Icon = iconFor(item.icon)
              return (
                <motion.div
                  key={item.title}
                  {...reveal(i)}
                  className="group border border-[var(--p-border)] bg-[var(--p-raised)] p-5 transition-colors duration-200 hover:border-[var(--p-border-strong)]"
                  style={cardStyle}
                >
                  <span
                    className="mb-3 grid size-9 place-items-center transition-transform duration-200 group-hover:-translate-y-0.5"
                    style={{
                      borderRadius: 'var(--p-radius)',
                      background: 'var(--p-accent-soft)',
                      color: 'var(--p-accent)',
                    }}
                  >
                    <Icon className="size-4.5" />
                  </span>
                  <h3 className="mb-1.5 text-[1rem] font-semibold">{item.title}</h3>
                  <p className="text-[0.9375rem] leading-relaxed text-[var(--p-muted)]">
                    {item.body}
                  </p>
                </motion.div>
              )
            })}
          </div>
        </Shell>
      )

    case 'socialProof':
      return <SocialProof spec={spec} />

    case 'stats':
      return (
        <Shell heading={spec.heading} subheading={spec.subheading} center tone="surface">
          <div className="grid gap-6 sm:grid-cols-3">
            {spec.items.map((s, i) => (
              <motion.div key={s.label} {...reveal(i)} className="text-center">
                <div
                  className="text-[clamp(1.75rem,4vw,2.5rem)] leading-none text-[var(--p-text)]"
                  style={{
                    letterSpacing: 'var(--p-heading-tracking)',
                    fontWeight: 'var(--p-heading-weight)' as unknown as number,
                  }}
                >
                  {s.value}
                </div>
                <div className="mt-2 text-[0.875rem] text-[var(--p-muted)]">{s.label}</div>
              </motion.div>
            ))}
          </div>
        </Shell>
      )

    case 'pricing':
      return <Pricing spec={spec} />

    case 'testimonials':
      return (
        <Shell heading={spec.heading} subheading={spec.subheading}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {spec.items.map((t, i) => (
              <motion.figure
                key={t.name}
                {...reveal(i)}
                className="flex flex-col gap-4 border border-[var(--p-border)] bg-[var(--p-raised)] p-5"
                style={cardStyle}
              >
                <blockquote className="text-[0.9375rem] leading-relaxed text-[var(--p-text)]">
                  “{t.quote}”
                </blockquote>
                <figcaption className="mt-auto flex items-center gap-2.5">
                  <span
                    className="grid size-8 place-items-center text-[0.75rem] font-semibold"
                    style={{
                      borderRadius: '99px',
                      background: 'var(--p-accent-soft)',
                      color: 'var(--p-accent)',
                    }}
                  >
                    {t.name.charAt(0)}
                  </span>
                  <span className="text-[0.8125rem]">
                    <span className="block font-medium text-[var(--p-text)]">{t.name}</span>
                    <span className="block text-[var(--p-muted)]">{t.role}</span>
                  </span>
                </figcaption>
              </motion.figure>
            ))}
          </div>
        </Shell>
      )

    case 'showcase':
      return <Showcase spec={spec} />

    case 'comparison':
      return (
        <Shell heading={spec.heading} subheading={spec.subheading} tone="surface">
          <div
            className="overflow-hidden border border-[var(--p-border)] bg-[var(--p-raised)]"
            style={cardStyle}
          >
            <table className="w-full text-left text-[0.9375rem]">
              <thead>
                <tr className="border-b border-[var(--p-border)]">
                  <th className="px-4 py-3 font-medium text-[var(--p-muted)]" />
                  {spec.columns.map((c, i) => (
                    <th
                      key={c}
                      className={cn(
                        'px-4 py-3 font-semibold',
                        i === 0 ? 'text-[var(--p-accent)]' : 'text-[var(--p-muted)]',
                      )}
                    >
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {spec.rows.map((row) => (
                  <tr
                    key={row.label}
                    className="border-b border-[var(--p-border)] last:border-0 transition-colors hover:bg-[var(--p-surface)]"
                  >
                    <th scope="row" className="px-4 py-3 text-left font-normal text-[var(--p-muted)]">
                      {row.label}
                    </th>
                    {row.values.map((v, i) => (
                      <td
                        key={i}
                        className={cn(
                          'px-4 py-3',
                          i === 0 ? 'font-medium text-[var(--p-text)]' : 'text-[var(--p-muted)]',
                        )}
                      >
                        <span className="inline-flex items-center gap-1.5">
                          {i === 0 && /^(yes|always|none|free|included)/i.test(v) && (
                            <Check className="size-3.5 text-[var(--p-accent)]" />
                          )}
                          {i > 0 && /^(no|not shown|never)/i.test(v) && (
                            <Minus className="size-3.5 opacity-60" />
                          )}
                          {v}
                        </span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Shell>
      )

    case 'explainer':
      return (
        <Shell heading={spec.heading} subheading={spec.subheading}>
          <ol className="grid gap-3 sm:grid-cols-3">
            {spec.steps.map((s, i) => (
              <motion.li
                key={s.title}
                {...reveal(i)}
                className="relative border border-[var(--p-border)] bg-[var(--p-raised)] p-5"
                style={cardStyle}
              >
                <span
                  className="p-mono mb-3 inline-grid size-7 place-items-center text-[0.75rem] font-semibold"
                  style={{
                    borderRadius: '99px',
                    background: 'var(--p-accent-soft)',
                    color: 'var(--p-accent)',
                  }}
                >
                  {i + 1}
                </span>
                <h3 className="mb-1.5 text-[1rem] font-semibold">{s.title}</h3>
                <p className="text-[0.9375rem] leading-relaxed text-[var(--p-muted)]">{s.body}</p>
              </motion.li>
            ))}
          </ol>
        </Shell>
      )

    case 'faq':
      return <Faq spec={spec} />

    case 'cta':
      return (
        <section
          className={SECTION}
          style={{ paddingTop: 'var(--p-section-y)', paddingBottom: 'var(--p-section-y)' }}
        >
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={transition.slow}
            className="mx-auto flex max-w-3xl flex-col items-center gap-5 border border-[var(--p-border)] bg-[var(--p-surface)] px-6 py-12 text-center"
            style={{ borderRadius: 'calc(var(--p-radius) * 1.6)' }}
          >
            <h2
              className="text-balance text-[clamp(1.5rem,3.4vw,2.25rem)] leading-tight"
              style={{
                letterSpacing: 'var(--p-heading-tracking)',
                fontWeight: 'var(--p-heading-weight)' as unknown as number,
              }}
            >
              {spec.heading}
            </h2>
            {spec.subheading && (
              <p className="max-w-lg text-[1rem] text-[var(--p-muted)]">{spec.subheading}</p>
            )}
            <div className="flex flex-wrap justify-center gap-3">
              <PButton size="lg" className="group">
                {spec.primaryCta}
                <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
              </PButton>
              {spec.secondaryCta && (
                <PButton size="lg" variant="secondary">
                  {spec.secondaryCta}
                </PButton>
              )}
            </div>
            {spec.reassurance && (
              <p className="text-[0.8125rem] text-[var(--p-muted)]">{spec.reassurance}</p>
            )}
          </motion.div>
        </section>
      )
  }
}

/* ── social proof: four genuinely different formats ─────────── */

function SocialProof({ spec }: { spec: Extract<SectionSpec, { type: 'socialProof' }> }) {
  if (spec.variant === 'metrics' && spec.metrics.length) {
    return (
      <Shell heading={spec.heading} subheading={spec.subheading} center tone="surface">
        <div className="grid gap-6 sm:grid-cols-4">
          {spec.metrics.map((m, i) => (
            <motion.div key={m.label} {...reveal(i)} className="text-center">
              <div
                className="text-[clamp(1.5rem,3.4vw,2.25rem)] leading-none"
                style={{ fontWeight: 'var(--p-heading-weight)' as unknown as number }}
              >
                {m.value}
              </div>
              <div className="mt-2 text-[0.875rem] text-[var(--p-muted)]">{m.label}</div>
            </motion.div>
          ))}
        </div>
      </Shell>
    )
  }

  if (spec.variant === 'ratings_reviews' && spec.rating) {
    return (
      <Shell heading={spec.heading} subheading={spec.subheading} center tone="surface">
        <motion.div
          {...reveal(0)}
          className="mx-auto flex max-w-md flex-col items-center gap-3 border border-[var(--p-border)] bg-[var(--p-raised)] px-8 py-8"
          style={cardStyle}
        >
          <div className="flex items-center gap-1" aria-hidden>
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className="size-5 fill-[var(--p-accent)] text-[var(--p-accent)]" />
            ))}
          </div>
          <div
            className="text-[2.5rem] leading-none"
            style={{ fontWeight: 'var(--p-heading-weight)' as unknown as number }}
          >
            {spec.rating.score}
          </div>
          <p className="text-[0.875rem] text-[var(--p-muted)]">
            {spec.rating.count} · {spec.rating.source}
          </p>
        </motion.div>
      </Shell>
    )
  }

  if (spec.variant === 'customer_logos' && spec.logos.length) {
    return (
      <Shell heading={spec.heading} subheading={spec.subheading} center tone="surface">
        <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-6">
          {spec.logos.map((l, i) => (
            <motion.span
              key={l}
              {...reveal(i)}
              className="text-[1.0625rem] font-semibold tracking-tight text-[var(--p-muted)] opacity-70 transition-opacity duration-200 hover:opacity-100"
            >
              {l}
            </motion.span>
          ))}
        </div>
      </Shell>
    )
  }

  const quotes = spec.quotes.length
    ? spec.quotes
    : [{ quote: spec.heading, name: '', role: '' }]

  return (
    <Shell heading={spec.heading} subheading={spec.subheading} tone="surface">
      <div className="grid gap-3 sm:grid-cols-2">
        {quotes.map((q, i) => (
          <motion.figure
            key={q.name + i}
            {...reveal(i)}
            className="border border-[var(--p-border)] bg-[var(--p-raised)] p-5"
            style={cardStyle}
          >
            <blockquote className="text-[0.9375rem] leading-relaxed">“{q.quote}”</blockquote>
            {q.name && (
              <figcaption className="mt-3 text-[0.8125rem] text-[var(--p-muted)]">
                {q.name}
                {q.role && ` · ${q.role}`}
              </figcaption>
            )}
          </motion.figure>
        ))}
      </div>
    </Shell>
  )
}

/* ── pricing: a working billing toggle ──────────────────────── */

function Pricing({ spec }: { spec: Extract<SectionSpec, { type: 'pricing' }> }) {
  const [annual, setAnnual] = useState(false)
  const reduced = useReducedMotion()

  return (
    <Shell heading={spec.heading} subheading={spec.subheading} center>
      {spec.billingToggle && (
        <div className="mb-8 flex items-center justify-center gap-3">
          <span
            className={cn(
              'text-[0.875rem] transition-colors',
              !annual ? 'text-[var(--p-text)]' : 'text-[var(--p-muted)]',
            )}
          >
            Monthly
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={annual}
            aria-label="Bill annually"
            onClick={() => setAnnual((a) => !a)}
            className="relative h-6 w-11 rounded-full border border-[var(--p-border-strong)] transition-colors"
            style={{ background: annual ? 'var(--p-accent)' : 'var(--p-surface)' }}
          >
            <motion.span
              layout={!reduced}
              transition={transition.spring}
              className="absolute top-1/2 size-4 -translate-y-1/2 rounded-full bg-white shadow"
              style={{ left: annual ? 'calc(100% - 1.25rem)' : '0.25rem' }}
            />
          </button>
          <span
            className={cn(
              'text-[0.875rem] transition-colors',
              annual ? 'text-[var(--p-text)]' : 'text-[var(--p-muted)]',
            )}
          >
            Annual
          </span>
          {spec.annualDiscountLabel && (
            <span
              className="px-2 py-0.5 text-[0.6875rem] font-medium"
              style={{
                borderRadius: '99px',
                background: 'var(--p-accent-soft)',
                color: 'var(--p-accent)',
              }}
            >
              {spec.annualDiscountLabel}
            </span>
          )}
        </div>
      )}

      <div
        className={cn(
          'grid gap-3',
          spec.plans.length === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-2 lg:grid-cols-3',
        )}
      >
        {spec.plans.map((p, i) => (
          <motion.div
            key={p.name}
            {...reveal(i)}
            className={cn(
              'relative flex flex-col gap-4 border p-6 text-left',
              p.featured
                ? 'border-[var(--p-accent)] bg-[var(--p-raised)] shadow-[var(--p-shadow)]'
                : 'border-[var(--p-border)] bg-[var(--p-raised)]',
            )}
            style={cardStyle}
          >
            {p.featured && (
              <span
                className="absolute -top-2.5 left-6 px-2 py-0.5 text-[0.6875rem] font-semibold"
                style={{
                  borderRadius: '99px',
                  background: 'var(--p-accent)',
                  color: 'var(--p-accent-fg)',
                }}
              >
                Most popular
              </span>
            )}
            <div>
              <h3 className="text-[1rem] font-semibold">{p.name}</h3>
              <p className="mt-1 text-[0.875rem] text-[var(--p-muted)]">{p.description}</p>
            </div>
            <div className="flex items-baseline gap-1.5">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                  key={annual ? p.annualPrice : p.monthlyPrice}
                  initial={reduced ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduced ? undefined : { opacity: 0, y: -6 }}
                  transition={transition.fast}
                  className="text-[2rem] leading-none"
                  style={{ fontWeight: 'var(--p-heading-weight)' as unknown as number }}
                >
                  {annual ? p.annualPrice : p.monthlyPrice}
                </motion.span>
              </AnimatePresence>
              <span className="text-[0.8125rem] text-[var(--p-muted)]">{p.period}</span>
            </div>
            <ul className="flex flex-col gap-2">
              {p.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-[0.875rem]">
                  <Check className="mt-0.5 size-3.5 shrink-0 text-[var(--p-accent)]" />
                  <span className="text-[var(--p-muted)]">{f}</span>
                </li>
              ))}
            </ul>
            <PButton
              variant={p.featured ? 'primary' : 'secondary'}
              className="mt-auto w-full"
            >
              {p.cta}
            </PButton>
          </motion.div>
        ))}
      </div>
    </Shell>
  )
}

/* ── showcase: filterable cards ─────────────────────────────── */

function Showcase({ spec }: { spec: Extract<SectionSpec, { type: 'showcase' }> }) {
  const [active, setActive] = useState<string | null>(null)
  const categories = spec.categories.filter((c) => spec.items.some((i) => i.category === c))
  const items = active ? spec.items.filter((i) => i.category === active) : spec.items

  return (
    <Shell heading={spec.heading} subheading={spec.subheading}>
      {categories.length > 1 && (
        <div className="mb-6 flex flex-wrap gap-2">
          {[null, ...categories].map((c) => (
            <button
              key={c ?? 'all'}
              type="button"
              onClick={() => setActive(c)}
              className={cn(
                'relative px-3 py-1.5 text-[0.8125rem] font-medium transition-colors',
                c === active
                  ? 'text-[var(--p-accent-fg)]'
                  : 'text-[var(--p-muted)] hover:text-[var(--p-text)]',
              )}
              style={{ borderRadius: '99px' }}
            >
              {c === active && (
                <motion.span
                  layoutId="showcase-pill"
                  transition={transition.gentle}
                  className="absolute inset-0"
                  style={{ borderRadius: '99px', background: 'var(--p-accent)' }}
                />
              )}
              <span className="relative z-10">{c ?? 'All'}</span>
            </button>
          ))}
        </div>
      )}

      <motion.div layout className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence mode="popLayout">
          {items.map((item) => (
            <motion.article
              key={item.title}
              layout
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={transition.gentle}
              whileHover={{ y: -3 }}
              className="group cursor-pointer border border-[var(--p-border)] bg-[var(--p-raised)] p-5 transition-colors duration-200 hover:border-[var(--p-border-strong)]"
              style={cardStyle}
            >
              <div className="mb-2 flex items-start justify-between gap-3">
                <h3 className="text-[1rem] font-semibold leading-snug">{item.title}</h3>
                {item.badge && (
                  <span
                    className="shrink-0 px-2 py-0.5 text-[0.6875rem] font-medium"
                    style={{
                      borderRadius: '99px',
                      background: 'var(--p-accent-soft)',
                      color: 'var(--p-accent)',
                    }}
                  >
                    {item.badge}
                  </span>
                )}
              </div>
              <p className="mb-3 text-[0.875rem] text-[var(--p-muted)]">{item.detail}</p>
              <div className="flex items-center justify-between">
                <span className="text-[0.9375rem] font-semibold text-[var(--p-text)]">
                  {item.meta}
                </span>
                <ArrowRight className="size-4 text-[var(--p-accent)] opacity-0 transition-all duration-200 group-hover:translate-x-0.5 group-hover:opacity-100" />
              </div>
            </motion.article>
          ))}
        </AnimatePresence>
      </motion.div>
    </Shell>
  )
}

/* ── faq: real accordion ────────────────────────────────────── */

function Faq({ spec }: { spec: Extract<SectionSpec, { type: 'faq' }> }) {
  const [open, setOpen] = useState<number | null>(0)

  return (
    <Shell heading={spec.heading} subheading={spec.subheading}>
      <div
        className="mx-auto max-w-2xl divide-y divide-[var(--p-border)] overflow-hidden border border-[var(--p-border)] bg-[var(--p-raised)]"
        style={cardStyle}
      >
        {spec.items.map((item, i) => {
          const isOpen = open === i
          return (
            <div key={item.q}>
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : i)}
                aria-expanded={isOpen}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-[var(--p-surface)]"
              >
                <span className="text-[0.9375rem] font-medium">{item.q}</span>
                <ChevronDown
                  className={cn(
                    'size-4 shrink-0 text-[var(--p-muted)] transition-transform duration-200',
                    isOpen && 'rotate-180',
                  )}
                />
              </button>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={transition.normal}
                    className="overflow-hidden"
                  >
                    <p className="px-5 pb-4 text-[0.9375rem] leading-relaxed text-[var(--p-muted)]">
                      {item.a}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}
      </div>
    </Shell>
  )
}
