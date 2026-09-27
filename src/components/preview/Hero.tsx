'use client'

import { motion } from 'motion/react'
import { ArrowRight, Check, Play, Quote, Star } from 'lucide-react'
import { cn } from '@/lib/cn'
import { listContainer, listItem, transition } from '@/lib/motion/tokens'
import { PButton, PSearchPanel } from '@/components/preview/controls'
import type { HeroSpec } from '@/schemas/spec'

/**
 * ────────────────────────────────────────────────────────────
 *  Jev → design consequence, at its most direct.
 *
 *  heroStrategy = "search_first"  →  <SearchFirstHero>
 *  heroStrategy = "value_prop"    →  <ValuePropHero>
 *  heroStrategy = "social_proof"  →  <SocialProofHero>
 *  heroStrategy = "product_demo"  →  <ProductDemoHero>
 *
 *  Nothing else picks this. The switch below is the decision.
 * ────────────────────────────────────────────────────────────
 */
export function Hero({ hero }: { hero: HeroSpec }) {
  switch (hero.variant) {
    case 'search_first':
      return <SearchFirstHero hero={hero} />
    case 'social_proof':
      return <SocialProofHero hero={hero} />
    case 'product_demo':
      return <ProductDemoHero hero={hero} />
    case 'value_prop':
    default:
      return <ValuePropHero hero={hero} />
  }
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="p-eyebrow inline-flex items-center gap-1.5 border border-[var(--p-border-strong)] bg-[var(--p-surface)] px-2.5 py-1 text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-[var(--p-muted)]"
      style={{ borderRadius: '99px' }}
    >
      {children}
    </span>
  )
}

function Headline({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <h1
      className={cn('text-balance text-[clamp(2rem,5.2vw,3.5rem)] leading-[1.05]', className)}
      style={{
        letterSpacing: 'var(--p-heading-tracking)',
        fontWeight: 'var(--p-heading-weight)' as unknown as number,
      }}
    >
      {children}
    </h1>
  )
}

function Sub({ children }: { children: React.ReactNode }) {
  return (
    <p className="max-w-xl text-pretty text-[clamp(1rem,1.6vw,1.125rem)] leading-relaxed text-[var(--p-muted)]">
      {children}
    </p>
  )
}

function TrustRow({ signals }: { signals: string[] }) {
  if (!signals.length) return null
  return (
    <motion.ul
      variants={listContainer}
      initial="hidden"
      animate="show"
      className="flex flex-wrap items-center gap-x-5 gap-y-2"
    >
      {signals.map((s) => (
        <motion.li
          key={s}
          variants={listItem}
          className="flex items-center gap-1.5 text-[0.8125rem] text-[var(--p-muted)]"
        >
          <Check className="size-3.5 shrink-0 text-[var(--p-accent)]" />
          {s}
        </motion.li>
      ))}
    </motion.ul>
  )
}

function Ctas({ hero, size = 'lg' }: { hero: HeroSpec; size?: 'md' | 'lg' }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <PButton size={size} className="group">
        {hero.primaryCta}
        <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
      </PButton>
      {hero.secondaryCta && (
        <PButton size={size} variant="secondary">
          {hero.secondaryCta}
        </PButton>
      )}
    </div>
  )
}

const SECTION = 'px-5 sm:px-8'

/* ── search_first ─────────────────────────────────────────── */

function SearchFirstHero({ hero }: { hero: HeroSpec }) {
  return (
    <header className={cn(SECTION, 'pb-12 pt-12 sm:pb-16 sm:pt-20')}>
      <div className="mx-auto max-w-5xl">
        <motion.div
          variants={listContainer}
          initial="hidden"
          animate="show"
          className="flex flex-col items-start gap-4 sm:items-center sm:text-center"
        >
          {hero.eyebrow && (
            <motion.div variants={listItem}>
              <Eyebrow>{hero.eyebrow}</Eyebrow>
            </motion.div>
          )}
          <motion.div variants={listItem}>
            <Headline className="sm:text-center">{hero.headline}</Headline>
          </motion.div>
          <motion.div variants={listItem} className="sm:mx-auto">
            <Sub>{hero.subheadline}</Sub>
          </motion.div>
        </motion.div>

        {/* The whole point of this variant: the tool is above the fold. */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...transition.soft, delay: 0.15 }}
          className="mt-8"
        >
          <PSearchPanel
            fields={hero.searchFields.length ? hero.searchFields : FALLBACK_FIELDS}
            submitLabel={hero.primaryCta}
          />
        </motion.div>

        <div className="mt-6 sm:flex sm:justify-center">
          <TrustRow signals={hero.trustSignals} />
        </div>
      </div>
    </header>
  )
}

const FALLBACK_FIELDS = [
  { label: 'From', placeholder: 'Start typing', kind: 'text' as const, options: [] },
  { label: 'To', placeholder: 'Destination', kind: 'text' as const, options: [] },
  { label: 'Date', placeholder: 'Add date', kind: 'date' as const, options: [] },
]

/* ── value_prop ───────────────────────────────────────────── */

function ValuePropHero({ hero }: { hero: HeroSpec }) {
  return (
    <header className={cn(SECTION, 'pb-16 pt-16 sm:pb-24 sm:pt-28')}>
      <motion.div
        variants={listContainer}
        initial="hidden"
        animate="show"
        className="mx-auto flex max-w-3xl flex-col items-start gap-5 text-left sm:items-center sm:text-center"
      >
        {hero.eyebrow && (
          <motion.div variants={listItem}>
            <Eyebrow>{hero.eyebrow}</Eyebrow>
          </motion.div>
        )}
        <motion.div variants={listItem}>
          <Headline>{hero.headline}</Headline>
        </motion.div>
        <motion.div variants={listItem}>
          <Sub>{hero.subheadline}</Sub>
        </motion.div>
        <motion.div variants={listItem} className="pt-1">
          <Ctas hero={hero} />
        </motion.div>
        <motion.div variants={listItem} className="pt-2">
          <TrustRow signals={hero.trustSignals} />
        </motion.div>
      </motion.div>
    </header>
  )
}

/* ── social_proof ─────────────────────────────────────────── */

function SocialProofHero({ hero }: { hero: HeroSpec }) {
  return (
    <header className={cn(SECTION, 'pb-16 pt-14 sm:pb-20 sm:pt-20')}>
      <div className="mx-auto grid max-w-5xl items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
        <motion.div
          variants={listContainer}
          initial="hidden"
          animate="show"
          className="flex flex-col items-start gap-5"
        >
          <motion.div variants={listItem} className="flex items-center gap-2">
            <div className="flex" aria-label="Rated 5 out of 5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="size-4 fill-[var(--p-accent)] text-[var(--p-accent)]" />
              ))}
            </div>
            {hero.eyebrow && (
              <span className="text-[0.8125rem] text-[var(--p-muted)]">{hero.eyebrow}</span>
            )}
          </motion.div>
          <motion.div variants={listItem}>
            <Headline>{hero.headline}</Headline>
          </motion.div>
          <motion.div variants={listItem}>
            <Sub>{hero.subheadline}</Sub>
          </motion.div>
          <motion.div variants={listItem}>
            <Ctas hero={hero} />
          </motion.div>
        </motion.div>

        {/* Proof carries the visual weight in this variant. */}
        <motion.div
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ ...transition.soft, delay: 0.12 }}
          className="flex flex-col gap-3"
        >
          {(hero.trustSignals.length ? hero.trustSignals : ['Trusted by teams everywhere']).map(
            (s, i) => (
              <div
                key={s}
                className="flex items-start gap-3 border border-[var(--p-border)] bg-[var(--p-raised)] p-4 shadow-[var(--p-shadow)]"
                style={{ borderRadius: 'var(--p-radius)', marginLeft: `${i * 10}px` }}
              >
                <Quote className="size-4 shrink-0 text-[var(--p-accent)]" />
                <p className="text-[0.9375rem] leading-relaxed text-[var(--p-text)]">{s}</p>
              </div>
            ),
          )}
        </motion.div>
      </div>
    </header>
  )
}

/* ── product_demo ─────────────────────────────────────────── */

function ProductDemoHero({ hero }: { hero: HeroSpec }) {
  const steps = hero.demoSteps.length
    ? hero.demoSteps
    : [{ label: 'Open the app', detail: 'Everything starts from one screen' }]

  return (
    <header className={cn(SECTION, 'pb-16 pt-14 sm:pb-20 sm:pt-20')}>
      <motion.div
        variants={listContainer}
        initial="hidden"
        animate="show"
        className="mx-auto flex max-w-3xl flex-col items-start gap-4 sm:items-center sm:text-center"
      >
        {hero.eyebrow && (
          <motion.div variants={listItem}>
            <Eyebrow>{hero.eyebrow}</Eyebrow>
          </motion.div>
        )}
        <motion.div variants={listItem}>
          <Headline>{hero.headline}</Headline>
        </motion.div>
        <motion.div variants={listItem}>
          <Sub>{hero.subheadline}</Sub>
        </motion.div>
        <motion.div variants={listItem}>
          <Ctas hero={hero} />
        </motion.div>
      </motion.div>

      {/* A fake but legible interface — this variant argues by showing. */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...transition.soft, delay: 0.16 }}
        className="mx-auto mt-10 max-w-4xl overflow-hidden border border-[var(--p-border)] bg-[var(--p-raised)] shadow-[var(--p-shadow)]"
        style={{ borderRadius: 'calc(var(--p-radius) * 1.6)' }}
      >
        <div className="flex items-center gap-2 border-b border-[var(--p-border)] bg-[var(--p-surface)] px-4 py-2.5">
          <span className="size-2.5 rounded-full bg-[var(--p-border-strong)]" />
          <span className="size-2.5 rounded-full bg-[var(--p-border-strong)]" />
          <span className="size-2.5 rounded-full bg-[var(--p-border-strong)]" />
          <span className="p-mono ml-2 text-[0.75rem] text-[var(--p-muted)]">preview</span>
          <Play className="ml-auto size-3.5 text-[var(--p-accent)]" />
        </div>
        <ol className="divide-y divide-[var(--p-border)]">
          {steps.map((s, i) => (
            <motion.li
              key={s.label}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 + i * 0.12, duration: 0.3 }}
              className="flex items-center gap-4 px-5 py-4"
            >
              <span
                className="grid size-7 shrink-0 place-items-center text-[0.75rem] font-semibold"
                style={{
                  borderRadius: '99px',
                  background: 'var(--p-accent-soft)',
                  color: 'var(--p-accent)',
                }}
              >
                {i + 1}
              </span>
              <div className="min-w-0">
                <p className="text-[0.9375rem] font-medium text-[var(--p-text)]">{s.label}</p>
                <p className="truncate text-[0.8125rem] text-[var(--p-muted)]">{s.detail}</p>
              </div>
            </motion.li>
          ))}
        </ol>
      </motion.div>
    </header>
  )
}
