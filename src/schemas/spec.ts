import { z } from 'zod'

/**
 * The landing page spec.
 *
 * The generative model chooses structure (hero, sections, order, theme) and
 * writes the copy, guided by Jev's answers — see `compose.ts`. It only ever
 * picks from these validated shapes; it never emits markup or code.
 */

export const SECTION_TYPES = [
  'search',
  'featureGrid',
  'socialProof',
  'stats',
  'pricing',
  'testimonials',
  'showcase',
  'comparison',
  'explainer',
  'faq',
  'cta',
] as const

export type SectionType = (typeof SECTION_TYPES)[number]

const link = z.object({ label: z.string(), href: z.string().default('#') })

export const themeSpec = z.object({
  direction: z.enum([
    'clean_utility',
    'warm_editorial',
    'bold_confident',
    'technical_precise',
  ]),
  accent: z.enum(['blue', 'emerald', 'amber', 'violet', 'rose', 'slate']),
})

export const navigationSpec = z.object({
  wordmark: z.string(),
  links: z.array(link).max(6).default([]),
  ctaLabel: z.string(),
  sticky: z.boolean().default(true),
})

export const heroSpec = z.object({
  /** Selects the hero component. */
  variant: z.enum(['search_first', 'value_prop', 'social_proof', 'product_demo']),
  eyebrow: z.string().nullable().default(null),
  headline: z.string(),
  subheadline: z.string(),
  primaryCta: z.string(),
  secondaryCta: z.string().nullable().default(null),
  /** Trust chips shown under the hero when Jev says trust is the barrier. */
  trustSignals: z.array(z.string()).max(4).default([]),
  /** For search_first: the fields the hero's search control should show. */
  searchFields: z
    .array(
      z.object({
        label: z.string(),
        placeholder: z.string(),
        kind: z.enum(['text', 'date', 'counter', 'select']),
        options: z.array(z.string()).max(8).default([]),
      }),
    )
    .max(4)
    .default([]),
  /** For product_demo: labelled steps of a fake interface. */
  demoSteps: z.array(z.object({ label: z.string(), detail: z.string() })).max(4).default([]),
})

const sectionBase = {
  heading: z.string(),
  subheading: z.string().nullable().default(null),
  /** Background band; null keeps the section type's own default. */
  tone: z.enum(['plain', 'surface']).nullable().default(null),
}

/** How a section arranges its content. The first option is the fallback. */
const layout = <const T extends [string, ...string[]]>(options: T) =>
  z.enum(options).default(options[0] as T[0])

export const sectionSpec = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('search'),
    ...sectionBase,
    tabs: z.array(z.string()).max(4).default([]),
    fields: z
      .array(
        z.object({
          label: z.string(),
          placeholder: z.string(),
          kind: z.enum(['text', 'date', 'counter', 'select']),
          options: z.array(z.string()).max(8).default([]),
        }),
      )
      .max(4)
      .default([]),
    submitLabel: z.string(),
  }),
  z.object({
    type: z.literal('featureGrid'),
    ...sectionBase,
    layout: layout(['cards', 'list', 'split', 'bento']),
    items: z
      .array(
        z.object({
          icon: z.string(),
          title: z.string(),
          body: z.string(),
        }),
      )
      .min(2)
      .max(6),
  }),
  z.object({
    type: z.literal('socialProof'),
    ...sectionBase,
    variant: z.enum(['customer_logos', 'testimonials', 'metrics', 'ratings_reviews']),
    logos: z.array(z.string()).max(8).default([]),
    quotes: z
      .array(z.object({ quote: z.string(), name: z.string(), role: z.string() }))
      .max(4)
      .default([]),
    metrics: z
      .array(z.object({ value: z.string(), label: z.string() }))
      .max(4)
      .default([]),
    rating: z
      .object({ score: z.string(), count: z.string(), source: z.string() })
      .nullable()
      .default(null),
  }),
  z.object({
    type: z.literal('stats'),
    ...sectionBase,
    layout: layout(['row', 'band', 'cards']),
    items: z.array(z.object({ value: z.string(), label: z.string() })).min(2).max(4),
  }),
  z.object({
    type: z.literal('pricing'),
    ...sectionBase,
    /** Interactive monthly/annual toggle when present. */
    billingToggle: z.boolean().default(true),
    annualDiscountLabel: z.string().nullable().default(null),
    plans: z
      .array(
        z.object({
          name: z.string(),
          monthlyPrice: z.string(),
          annualPrice: z.string(),
          period: z.string(),
          description: z.string(),
          features: z.array(z.string()).min(2).max(6),
          cta: z.string(),
          featured: z.boolean().default(false),
        }),
      )
      .min(2)
      .max(4),
  }),
  z.object({
    type: z.literal('testimonials'),
    ...sectionBase,
    layout: layout(['grid', 'spotlight', 'wall']),
    items: z
      .array(z.object({ quote: z.string(), name: z.string(), role: z.string() }))
      .min(2)
      .max(6),
  }),
  z.object({
    type: z.literal('showcase'),
    ...sectionBase,
    layout: layout(['grid', 'list', 'carousel']),
    /** Browsable cards — destinations, products, templates, courses. */
    categories: z.array(z.string()).max(5).default([]),
    items: z
      .array(
        z.object({
          title: z.string(),
          meta: z.string(),
          detail: z.string(),
          category: z.string(),
          badge: z.string().nullable().default(null),
        }),
      )
      .min(3)
      .max(9),
  }),
  z.object({
    type: z.literal('comparison'),
    ...sectionBase,
    layout: layout(['table', 'cards']),
    columns: z.array(z.string()).min(2).max(3),
    rows: z
      .array(z.object({ label: z.string(), values: z.array(z.string()).min(2).max(3) }))
      .min(3)
      .max(7),
  }),
  z.object({
    type: z.literal('explainer'),
    ...sectionBase,
    layout: layout(['cards', 'timeline', 'numbered']),
    steps: z
      .array(z.object({ title: z.string(), body: z.string() }))
      .min(2)
      .max(4),
  }),
  z.object({
    type: z.literal('faq'),
    ...sectionBase,
    layout: layout(['accordion', 'columns', 'split']),
    items: z.array(z.object({ q: z.string(), a: z.string() })).min(3).max(6),
  }),
  z.object({
    type: z.literal('cta'),
    ...sectionBase,
    layout: layout(['card', 'band', 'split']),
    primaryCta: z.string(),
    secondaryCta: z.string().nullable().default(null),
    reassurance: z.string().nullable().default(null),
  }),
])

export const footerSpec = z.object({
  tagline: z.string(),
  columns: z
    .array(z.object({ title: z.string(), links: z.array(z.string()).max(5) }))
    .max(4)
    .default([]),
})

export const landingPageSpec = z.object({
  theme: themeSpec,
  navigation: navigationSpec,
  hero: heroSpec,
  sections: z.array(sectionSpec).max(9),
  footer: footerSpec,
})

export type LandingPageSpec = z.infer<typeof landingPageSpec>
export type SectionSpec = z.infer<typeof sectionSpec>
export type HeroSpec = z.infer<typeof heroSpec>
export type ThemeSpec = z.infer<typeof themeSpec>
