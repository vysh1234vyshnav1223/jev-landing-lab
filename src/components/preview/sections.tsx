'use client'

import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { createElement, useId, useState } from 'react'
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
  split,
}: {
  heading: string
  subheading?: string | null
  children: React.ReactNode
  center?: boolean
  tone?: 'plain' | 'surface'
  /** Heading pinned left, content right, on wide screens. */
  split?: boolean
}) {
  return (
    <section
      className={cn(SECTION, tone === 'surface' && 'bg-[var(--p-surface)]')}
      style={{ paddingTop: 'var(--p-section-y)', paddingBottom: 'var(--p-section-y)' }}
    >
      <div
        className={cn(
          'mx-auto max-w-5xl',
          split && 'grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-14',
        )}
      >
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={transition.slow}
          className={cn(
            'flex flex-col gap-2',
            !split && 'mb-8',
            center && !split && 'items-center text-center',
          )}
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
        <div>{children}</div>
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

type Of<T extends SectionSpec['type']> = Extract<SectionSpec, { type: T }>

const headingStyle = {
  letterSpacing: 'var(--p-heading-tracking)',
  fontWeight: 'var(--p-heading-weight)' as unknown as number,
}

const softBadge = {
  borderRadius: '99px',
  background: 'var(--p-accent-soft)',
  color: 'var(--p-accent)',
}

function IconBadge({ name, large }: { name: string; large?: boolean }) {
  return (
    <span
      className={cn('grid shrink-0 place-items-center', large ? 'size-11' : 'size-9')}
      style={{ borderRadius: 'var(--p-radius)', background: 'var(--p-accent-soft)', color: 'var(--p-accent)' }}
    >
      {createElement(iconFor(name), { className: large ? 'size-5.5' : 'size-4.5' })}
    </span>
  )
}

/** Full-bleed accent band, used by the `band` layouts. */
function Band({ children }: { children: React.ReactNode }) {
  return (
    <section
      className={SECTION}
      style={{
        paddingTop: 'var(--p-section-y)',
        paddingBottom: 'var(--p-section-y)',
        background: 'var(--p-accent)',
        color: 'var(--p-accent-fg)',
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={transition.slow}
        className="mx-auto max-w-5xl"
      >
        {children}
      </motion.div>
    </section>
  )
}

export function Section({ spec }: { spec: SectionSpec }) {
  switch (spec.type) {
    case 'search':
      return (
        <Shell heading={spec.heading} subheading={spec.subheading} center tone={spec.tone ?? 'surface'}>
          <PSearchPanel fields={spec.fields} submitLabel={spec.submitLabel} tabs={spec.tabs} compact />
        </Shell>
      )
    case 'featureGrid':
      return <FeatureGrid spec={spec} />
    case 'socialProof':
      return <SocialProof spec={spec} />
    case 'stats':
      return <Stats spec={spec} />
    case 'pricing':
      return <Pricing spec={spec} />
    case 'testimonials':
      return <Testimonials spec={spec} />
    case 'showcase':
      return <Showcase spec={spec} />
    case 'comparison':
      return <Comparison spec={spec} />
    case 'explainer':
      return <Explainer spec={spec} />
    case 'faq':
      return <Faq spec={spec} />
    case 'cta':
      return <Cta spec={spec} />
  }
}

/* ── feature grid: cards | list | split | bento ─────────────── */

function FeatureGrid({ spec }: { spec: Of<'featureGrid'> }) {
  const tone = spec.tone ?? 'plain'

  if (spec.layout === 'list' || spec.layout === 'split') {
    return (
      <Shell heading={spec.heading} subheading={spec.subheading} tone={tone} split={spec.layout === 'split'}>
        <div className={cn('grid gap-7', spec.layout === 'list' && 'gap-x-10 sm:grid-cols-2')}>
          {spec.items.map((item, i) => (
            <motion.div key={item.title} {...reveal(i)} className="flex gap-4">
              <IconBadge name={item.icon} />
              <div>
                <h3 className="mb-1 text-[1rem] font-semibold">{item.title}</h3>
                <p className="text-[0.9375rem] leading-relaxed text-[var(--p-muted)]">{item.body}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </Shell>
    )
  }

  const bento = spec.layout === 'bento'
  return (
    <Shell heading={spec.heading} subheading={spec.subheading} tone={tone}>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {spec.items.map((item, i) => {
          const hero = bento && i === 0
          return (
            <motion.div
              key={item.title}
              {...reveal(i)}
              className={cn(
                'group flex flex-col border border-[var(--p-border)] bg-[var(--p-raised)] p-5 transition-colors duration-200 hover:border-[var(--p-border-strong)]',
                hero && 'justify-end bg-[var(--p-accent-soft)] p-7 sm:col-span-2 lg:row-span-2',
              )}
              style={cardStyle}
            >
              <span className="mb-3 transition-transform duration-200 group-hover:-translate-y-0.5">
                <IconBadge name={item.icon} large={hero} />
              </span>
              <h3 className={cn('mb-1.5 font-semibold', hero ? 'text-[1.5rem] leading-tight' : 'text-[1rem]')}>
                {item.title}
              </h3>
              <p
                className={cn(
                  'leading-relaxed text-[var(--p-muted)]',
                  hero ? 'max-w-md text-[1rem]' : 'text-[0.9375rem]',
                )}
              >
                {item.body}
              </p>
            </motion.div>
          )
        })}
      </div>
    </Shell>
  )
}

/* ── stats: row | band | cards ──────────────────────────────── */

function Stats({ spec }: { spec: Of<'stats'> }) {
  if (spec.layout === 'band') {
    return (
      <Band>
        <h2 className="text-[1rem] font-medium opacity-85">{spec.heading}</h2>
        {spec.subheading && <p className="mt-1 max-w-2xl text-[0.9375rem] opacity-70">{spec.subheading}</p>}
        <div className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {spec.items.map((s) => (
            <div key={s.label}>
              <div className="text-[clamp(2.25rem,5vw,3.5rem)] leading-none" style={headingStyle}>
                {s.value}
              </div>
              <div className="mt-2 text-[0.875rem] opacity-80">{s.label}</div>
            </div>
          ))}
        </div>
      </Band>
    )
  }

  if (spec.layout === 'cards') {
    return (
      <Shell heading={spec.heading} subheading={spec.subheading} tone={spec.tone ?? 'plain'}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {spec.items.map((s, i) => (
            <motion.div
              key={s.label}
              {...reveal(i)}
              className="border border-[var(--p-border)] bg-[var(--p-raised)] p-5"
              style={cardStyle}
            >
              <div className="text-[clamp(1.75rem,3.5vw,2.25rem)] leading-none text-[var(--p-accent)]" style={headingStyle}>
                {s.value}
              </div>
              <div className="mt-3 text-[0.875rem] text-[var(--p-muted)]">{s.label}</div>
            </motion.div>
          ))}
        </div>
      </Shell>
    )
  }

  return (
    <Shell heading={spec.heading} subheading={spec.subheading} center tone={spec.tone ?? 'surface'}>
      <div className="grid gap-6 sm:grid-cols-3">
        {spec.items.map((s, i) => (
          <motion.div key={s.label} {...reveal(i)} className="text-center">
            <div className="text-[clamp(1.75rem,4vw,2.5rem)] leading-none text-[var(--p-text)]" style={headingStyle}>
              {s.value}
            </div>
            <div className="mt-2 text-[0.875rem] text-[var(--p-muted)]">{s.label}</div>
          </motion.div>
        ))}
      </div>
    </Shell>
  )
}

/* ── testimonials: grid | spotlight | wall ──────────────────── */

type Quote = { quote: string; name: string; role: string }

function QuoteCard({ t, i, className }: { t: Quote; i: number; className?: string }) {
  return (
    <motion.figure
      {...reveal(i)}
      className={cn('flex flex-col gap-4 border border-[var(--p-border)] bg-[var(--p-raised)] p-5', className)}
      style={cardStyle}
    >
      <blockquote className="text-[0.9375rem] leading-relaxed text-[var(--p-text)]">“{t.quote}”</blockquote>
      <figcaption className="mt-auto flex items-center gap-2.5">
        <span className="grid size-8 place-items-center text-[0.75rem] font-semibold" style={softBadge}>
          {t.name.charAt(0)}
        </span>
        <span className="text-[0.8125rem]">
          <span className="block font-medium text-[var(--p-text)]">{t.name}</span>
          <span className="block text-[var(--p-muted)]">{t.role}</span>
        </span>
      </figcaption>
    </motion.figure>
  )
}

function Testimonials({ spec }: { spec: Of<'testimonials'> }) {
  const tone = spec.tone ?? 'plain'

  if (spec.layout === 'spotlight') {
    const [lead, ...rest] = spec.items
    return (
      <Shell heading={spec.heading} subheading={spec.subheading} center tone={tone}>
        <motion.figure {...reveal(0)} className="mx-auto mb-10 max-w-3xl text-center">
          <blockquote className="text-balance text-[clamp(1.25rem,2.6vw,1.75rem)] leading-snug" style={headingStyle}>
            “{lead.quote}”
          </blockquote>
          <figcaption className="mt-5 text-[0.875rem] text-[var(--p-muted)]">
            <span className="font-medium text-[var(--p-text)]">{lead.name}</span> · {lead.role}
          </figcaption>
        </motion.figure>
        {rest.length > 0 && (
          <div className="grid gap-3 text-left sm:grid-cols-2 lg:grid-cols-3">
            {rest.map((t, i) => (
              <QuoteCard key={t.name + i} t={t} i={i + 1} />
            ))}
          </div>
        )}
      </Shell>
    )
  }

  if (spec.layout === 'wall') {
    return (
      <Shell heading={spec.heading} subheading={spec.subheading} tone={tone}>
        <div className="columns-1 gap-3 sm:columns-2 lg:columns-3">
          {spec.items.map((t, i) => (
            <QuoteCard key={t.name + i} t={t} i={i} className="mb-3 break-inside-avoid" />
          ))}
        </div>
      </Shell>
    )
  }

  return (
    <Shell heading={spec.heading} subheading={spec.subheading} tone={tone}>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {spec.items.map((t, i) => (
          <QuoteCard key={t.name + i} t={t} i={i} />
        ))}
      </div>
    </Shell>
  )
}

/* ── comparison: table | cards ──────────────────────────────── */

function Comparison({ spec }: { spec: Of<'comparison'> }) {
  const tone = spec.tone ?? 'surface'

  if (spec.layout === 'cards') {
    return (
      <Shell heading={spec.heading} subheading={spec.subheading} tone={tone}>
        <div className={cn('grid gap-3', spec.columns.length === 3 ? 'md:grid-cols-3' : 'sm:grid-cols-2')}>
          {spec.columns.map((col, c) => (
            <motion.div
              key={col}
              {...reveal(c)}
              className={cn(
                'border bg-[var(--p-raised)] p-5',
                c === 0 ? 'border-[var(--p-accent)] shadow-[var(--p-shadow)]' : 'border-[var(--p-border)]',
              )}
              style={cardStyle}
            >
              <h3 className={cn('mb-4 text-[1.0625rem] font-semibold', c === 0 && 'text-[var(--p-accent)]')}>{col}</h3>
              <dl className="flex flex-col divide-y divide-[var(--p-border)]">
                {spec.rows.map((row) => (
                  <div key={row.label} className="flex justify-between gap-4 py-2.5 text-[0.875rem]">
                    <dt className="text-[var(--p-muted)]">{row.label}</dt>
                    <dd className={cn('text-right', c === 0 ? 'font-medium' : 'text-[var(--p-muted)]')}>
                      {row.values[c]}
                    </dd>
                  </div>
                ))}
              </dl>
            </motion.div>
          ))}
        </div>
      </Shell>
    )
  }

  return (
    <Shell heading={spec.heading} subheading={spec.subheading} tone={tone}>
      <div className="overflow-x-auto border border-[var(--p-border)] bg-[var(--p-raised)]" style={cardStyle}>
        <table className="w-full text-left text-[0.9375rem]">
          <thead>
            <tr className="border-b border-[var(--p-border)]">
              <th className="px-4 py-3 font-medium text-[var(--p-muted)]" />
              {spec.columns.map((c, i) => (
                <th
                  key={c}
                  className={cn('px-4 py-3 font-semibold', i === 0 ? 'text-[var(--p-accent)]' : 'text-[var(--p-muted)]')}
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
                    className={cn('px-4 py-3', i === 0 ? 'font-medium text-[var(--p-text)]' : 'text-[var(--p-muted)]')}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      {i === 0 && /^(yes|always|none|free|included)/i.test(v) && (
                        <Check className="size-3.5 text-[var(--p-accent)]" />
                      )}
                      {i > 0 && /^(no|not shown|never)/i.test(v) && <Minus className="size-3.5 opacity-60" />}
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
}

/* ── explainer: cards | timeline | numbered ─────────────────── */

function Explainer({ spec }: { spec: Of<'explainer'> }) {
  const tone = spec.tone ?? 'plain'

  if (spec.layout === 'timeline') {
    return (
      <Shell heading={spec.heading} subheading={spec.subheading} tone={tone}>
        <ol className="relative ml-3.5 flex max-w-2xl flex-col gap-8 border-l border-[var(--p-border-strong)]">
          {spec.steps.map((s, i) => (
            <motion.li key={s.title} {...reveal(i)} className="relative pl-8">
              <span
                className="p-mono absolute -left-3.5 top-0 grid size-7 place-items-center text-[0.75rem] font-semibold"
                style={{ borderRadius: '99px', background: 'var(--p-accent)', color: 'var(--p-accent-fg)' }}
              >
                {i + 1}
              </span>
              <h3 className="mb-1 pt-0.5 text-[1.0625rem] font-semibold">{s.title}</h3>
              <p className="text-[0.9375rem] leading-relaxed text-[var(--p-muted)]">{s.body}</p>
            </motion.li>
          ))}
        </ol>
      </Shell>
    )
  }

  if (spec.layout === 'numbered') {
    return (
      <Shell heading={spec.heading} subheading={spec.subheading} tone={tone} split>
        <ol className="flex flex-col divide-y divide-[var(--p-border)]">
          {spec.steps.map((s, i) => (
            <motion.li key={s.title} {...reveal(i)} className="flex gap-6 py-6 first:pt-0">
              <span className="p-mono text-[2.5rem] leading-none text-[var(--p-accent)]" style={headingStyle}>
                {String(i + 1).padStart(2, '0')}
              </span>
              <div>
                <h3 className="mb-1.5 text-[1.0625rem] font-semibold">{s.title}</h3>
                <p className="text-[0.9375rem] leading-relaxed text-[var(--p-muted)]">{s.body}</p>
              </div>
            </motion.li>
          ))}
        </ol>
      </Shell>
    )
  }

  return (
    <Shell heading={spec.heading} subheading={spec.subheading} tone={tone}>
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
              style={softBadge}
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
}

/* ── cta: card | band | split ───────────────────────────────── */

function CtaButtons({ spec, onAccent }: { spec: Of<'cta'>; onAccent?: boolean }) {
  return (
    <div className="flex flex-wrap gap-3">
      <PButton size="lg" variant={onAccent ? 'secondary' : 'primary'} className="group">
        {spec.primaryCta}
        <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
      </PButton>
      {spec.secondaryCta &&
        (onAccent ? (
          <button type="button" className="h-12 px-4 text-[1rem] font-medium underline-offset-4 hover:underline">
            {spec.secondaryCta}
          </button>
        ) : (
          <PButton size="lg" variant="secondary">
            {spec.secondaryCta}
          </PButton>
        ))}
    </div>
  )
}

function Cta({ spec }: { spec: Of<'cta'> }) {
  if (spec.layout === 'band') {
    return (
      <Band>
        <div className="flex flex-col items-center gap-5 text-center">
          <h2 className="text-balance text-[clamp(1.75rem,4vw,2.75rem)] leading-tight" style={headingStyle}>
            {spec.heading}
          </h2>
          {spec.subheading && <p className="max-w-lg text-[1rem] opacity-80">{spec.subheading}</p>}
          <CtaButtons spec={spec} onAccent />
          {spec.reassurance && <p className="text-[0.8125rem] opacity-75">{spec.reassurance}</p>}
        </div>
      </Band>
    )
  }

  if (spec.layout === 'split') {
    return (
      <section
        className={cn(SECTION, 'border-y border-[var(--p-border)]', spec.tone === 'surface' && 'bg-[var(--p-surface)]')}
        style={{ paddingTop: 'var(--p-section-y)', paddingBottom: 'var(--p-section-y)' }}
      >
        <motion.div
          {...reveal(0)}
          className="mx-auto flex max-w-5xl flex-col gap-6 md:flex-row md:items-center md:justify-between"
        >
          <div className="max-w-xl">
            <h2 className="text-balance text-[clamp(1.5rem,3.2vw,2.25rem)] leading-tight" style={headingStyle}>
              {spec.heading}
            </h2>
            {spec.subheading && <p className="mt-2 text-[1rem] text-[var(--p-muted)]">{spec.subheading}</p>}
            {spec.reassurance && <p className="mt-3 text-[0.8125rem] text-[var(--p-muted)]">{spec.reassurance}</p>}
          </div>
          <CtaButtons spec={spec} />
        </motion.div>
      </section>
    )
  }

  return (
    <section
      className={cn(SECTION, spec.tone === 'surface' && 'bg-[var(--p-surface)]')}
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
        <h2 className="text-balance text-[clamp(1.5rem,3.4vw,2.25rem)] leading-tight" style={headingStyle}>
          {spec.heading}
        </h2>
        {spec.subheading && <p className="max-w-lg text-[1rem] text-[var(--p-muted)]">{spec.subheading}</p>}
        <div className="flex justify-center">
          <CtaButtons spec={spec} />
        </div>
        {spec.reassurance && <p className="text-[0.8125rem] text-[var(--p-muted)]">{spec.reassurance}</p>}
      </motion.div>
    </section>
  )
}

/* ── social proof: four genuinely different formats ─────────── */

function SocialProof({ spec }: { spec: Of<'socialProof'> }) {
  if (spec.variant === 'metrics' && spec.metrics.length) {
    return (
      <Shell heading={spec.heading} subheading={spec.subheading} center tone={spec.tone ?? 'surface'}>
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
      <Shell heading={spec.heading} subheading={spec.subheading} center tone={spec.tone ?? 'surface'}>
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
      <Shell heading={spec.heading} subheading={spec.subheading} center tone={spec.tone ?? 'surface'}>
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
    <Shell heading={spec.heading} subheading={spec.subheading} tone={spec.tone ?? 'surface'}>
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

function Pricing({ spec }: { spec: Of<'pricing'> }) {
  const [annual, setAnnual] = useState(false)
  const reduced = useReducedMotion()

  return (
    <Shell heading={spec.heading} subheading={spec.subheading} center tone={spec.tone ?? 'plain'}>
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

function Showcase({ spec }: { spec: Of<'showcase'> }) {
  const pillId = useId()
  const list = spec.layout === 'list'
  const carousel = spec.layout === 'carousel'
  const [active, setActive] = useState<string | null>(null)
  const categories = spec.categories.filter((c) => spec.items.some((i) => i.category === c))
  const items = active ? spec.items.filter((i) => i.category === active) : spec.items

  return (
    <Shell heading={spec.heading} subheading={spec.subheading} tone={spec.tone ?? 'plain'}>
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
                  layoutId={pillId}
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

      <motion.div
        layout
        className={cn(
          list && 'flex flex-col gap-2',
          carousel && '-mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-3 sm:-mx-8 sm:px-8',
          !list && !carousel && 'grid gap-3 sm:grid-cols-2 lg:grid-cols-3',
        )}
      >
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
              className={cn(
                'group cursor-pointer border border-[var(--p-border)] bg-[var(--p-raised)] p-5 transition-colors duration-200 hover:border-[var(--p-border-strong)]',
                list && 'sm:grid sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_auto] sm:items-center sm:gap-6 sm:py-4',
                carousel && 'w-72 shrink-0 snap-start',
              )}
              style={cardStyle}
            >
              <div className={cn('mb-2 flex items-start justify-between gap-3', list && 'sm:mb-0')}>
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
              <p className={cn('mb-3 text-[0.875rem] text-[var(--p-muted)]', list && 'sm:mb-0')}>{item.detail}</p>
              <div className="flex items-center justify-between gap-3">
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

function Faq({ spec }: { spec: Of<'faq'> }) {
  const [open, setOpen] = useState<number | null>(0)
  const tone = spec.tone ?? 'plain'

  if (spec.layout === 'columns') {
    return (
      <Shell heading={spec.heading} subheading={spec.subheading} tone={tone}>
        <dl className="grid gap-x-10 gap-y-7 sm:grid-cols-2">
          {spec.items.map((item, i) => (
            <motion.div key={item.q} {...reveal(i)}>
              <dt className="mb-1.5 text-[1rem] font-semibold">{item.q}</dt>
              <dd className="text-[0.9375rem] leading-relaxed text-[var(--p-muted)]">{item.a}</dd>
            </motion.div>
          ))}
        </dl>
      </Shell>
    )
  }

  return (
    <Shell heading={spec.heading} subheading={spec.subheading} tone={tone} split={spec.layout === 'split'}>
      <div
        className={cn(
          'divide-y divide-[var(--p-border)] overflow-hidden border border-[var(--p-border)] bg-[var(--p-raised)]',
          spec.layout !== 'split' && 'mx-auto max-w-2xl',
        )}
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
