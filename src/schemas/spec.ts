import { z } from 'zod'

/**
 * The landing page spec — what the renderer draws.
 *
 * Structure (which sections, in what order, which hero, which theme) is fixed
 * upstream by the PageBlueprint; the composing model fills these validated
 * shapes with copy and picks layouts. It never emits markup or code. Each
 * section type's schema is exported on its own (`SECTION_SCHEMAS`) so the
 * composer's response schema can be assembled from ONLY the types a blueprint
 * allows — see `compose.ts`.
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
  'story',
  'useCases',
  'codeSample',
  'integrations',
] as const

export type SectionType = (typeof SECTION_TYPES)[number]

export const linkSpec = z.object({ label: z.string(), href: z.string().default('#') })

export const THEME_DIRECTIONS = [
  'clean_utility',
  'warm_editorial',
  'bold_confident',
  'technical_precise',
] as const
export type ThemeDirection = (typeof THEME_DIRECTIONS)[number]

export const HERO_VARIANTS = ['search_first', 'value_prop', 'social_proof', 'product_demo'] as const
export type HeroVariant = (typeof HERO_VARIANTS)[number]

export const PROOF_VARIANTS = ['customer_logos', 'testimonials', 'metrics', 'ratings_reviews'] as const
export type ProofVariant = (typeof PROOF_VARIANTS)[number]

export const ACCENTS = ['blue', 'emerald', 'amber', 'violet', 'rose', 'slate'] as const

export const themeSpec = z.object({
  direction: z.enum(THEME_DIRECTIONS),
  accent: z.enum(ACCENTS),
})

export const navigationSpec = z.object({
  wordmark: z.string(),
  links: z.array(linkSpec).max(6).default([]),
  ctaLabel: z.string(),
  sticky: z.boolean().default(true),
})

export const searchField = z.object({
  label: z.string(),
  placeholder: z.string(),
  kind: z.enum(['text', 'date', 'counter', 'select']),
  options: z.array(z.string()).max(8).default([]),
})

export const demoStep = z.object({ label: z.string(), detail: z.string() })

export const heroSpec = z.object({
  /** Selects the hero component. */
  variant: z.enum(HERO_VARIANTS),
  eyebrow: z.string().nullable().default(null),
  headline: z.string(),
  subheadline: z.string(),
  primaryCta: z.string(),
  secondaryCta: z.string().nullable().default(null),
  /** Trust chips shown under the hero when Jev says trust is the barrier. */
  trustSignals: z.array(z.string()).max(4).default([]),
  /** For search_first: the fields the hero's search control should show. */
  searchFields: z.array(searchField).max(4).default([]),
  /** For product_demo: labelled steps of a fake interface. */
  demoSteps: z.array(demoStep).max(4).default([]),
})

const sectionBase = {
  heading: z.string(),
  subheading: z.string().nullable().default(null),
  /** Background band; null keeps the section type's own default. */
  tone: z.enum(['plain', 'surface']).nullable().default(null),
  /** The blueprint slot this section fills. Set by code, never by the model. */
  slot: z.string().optional(),
}

/** How a section arranges its content. The first option is the fallback. */
const layout = <const T extends [string, ...string[]]>(options: T) =>
  z.enum(options).default(options[0] as T[0])

export const SECTION_SCHEMAS = {
  search: z.object({
    type: z.literal('search'),
    ...sectionBase,
    tabs: z.array(z.string()).max(4).default([]),
    fields: z.array(searchField).max(4).default([]),
    submitLabel: z.string(),
  }),
  featureGrid: z.object({
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
  socialProof: z.object({
    type: z.literal('socialProof'),
    ...sectionBase,
    variant: z.enum(PROOF_VARIANTS),
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
  stats: z.object({
    type: z.literal('stats'),
    ...sectionBase,
    layout: layout(['row', 'band', 'cards']),
    items: z.array(z.object({ value: z.string(), label: z.string() })).min(2).max(4),
  }),
  pricing: z.object({
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
  testimonials: z.object({
    type: z.literal('testimonials'),
    ...sectionBase,
    layout: layout(['grid', 'spotlight', 'wall']),
    items: z
      .array(z.object({ quote: z.string(), name: z.string(), role: z.string() }))
      .min(2)
      .max(6),
  }),
  showcase: z.object({
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
  comparison: z.object({
    type: z.literal('comparison'),
    ...sectionBase,
    layout: layout(['table', 'cards']),
    columns: z.array(z.string()).min(2).max(3),
    rows: z
      .array(z.object({ label: z.string(), values: z.array(z.string()).min(2).max(3) }))
      .min(3)
      .max(7),
  }),
  explainer: z.object({
    type: z.literal('explainer'),
    ...sectionBase,
    layout: layout(['cards', 'timeline', 'numbered']),
    steps: z
      .array(z.object({ title: z.string(), body: z.string() }))
      .min(2)
      .max(4),
  }),
  faq: z.object({
    type: z.literal('faq'),
    ...sectionBase,
    layout: layout(['accordion', 'columns', 'split']),
    items: z.array(z.object({ q: z.string(), a: z.string() })).min(3).max(6),
  }),
  cta: z.object({
    type: z.literal('cta'),
    ...sectionBase,
    layout: layout(['card', 'band', 'split']),
    primaryCta: z.string(),
    secondaryCta: z.string().nullable().default(null),
    reassurance: z.string().nullable().default(null),
  }),
  /** Prose: atmosphere, a problem worth naming, a place, a point of view. */
  story: z.object({
    type: z.literal('story'),
    ...sectionBase,
    layout: layout(['statement', 'split', 'editorial']),
    eyebrow: z.string().nullable().default(null),
    paragraphs: z.array(z.string()).min(1).max(3),
    /** Short label/value facts beside the prose: distances, specs, numbers. */
    facts: z
      .array(z.object({ label: z.string(), value: z.string() }))
      .max(6)
      .default([]),
  }),
  /** Choose by need: each use case maps to what to pick. */
  useCases: z.object({
    type: z.literal('useCases'),
    ...sectionBase,
    layout: layout(['tabs', 'tiles']),
    items: z
      .array(
        z.object({
          icon: z.string(),
          title: z.string(),
          body: z.string(),
          recommendation: z.string(),
        }),
      )
      .min(2)
      .max(6),
  }),
  /** Real code, for an audience that judges a product by using it. */
  codeSample: z.object({
    type: z.literal('codeSample'),
    ...sectionBase,
    layout: layout(['split', 'stacked']),
    points: z
      .array(z.object({ title: z.string(), body: z.string() }))
      .max(4)
      .default([]),
    snippets: z
      .array(z.object({ label: z.string(), code: z.string() }))
      .min(1)
      .max(3),
  }),
  /** What it plugs into. */
  integrations: z.object({
    type: z.literal('integrations'),
    ...sectionBase,
    layout: layout(['grid', 'inline']),
    items: z
      .array(z.object({ name: z.string(), detail: z.string() }))
      .min(3)
      .max(12),
  }),
}

const S = SECTION_SCHEMAS
export const sectionSpec = z.discriminatedUnion('type', [
  S.search,
  S.featureGrid,
  S.socialProof,
  S.stats,
  S.pricing,
  S.testimonials,
  S.showcase,
  S.comparison,
  S.explainer,
  S.faq,
  S.cta,
  S.story,
  S.useCases,
  S.codeSample,
  S.integrations,
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
  sections: z.array(sectionSpec).max(10),
  footer: footerSpec,
})

export type LandingPageSpec = z.infer<typeof landingPageSpec>
export type SectionSpec = z.infer<typeof sectionSpec>
export type HeroSpec = z.infer<typeof heroSpec>
export type ThemeSpec = z.infer<typeof themeSpec>
export type SectionOf<T extends SectionType> = Extract<SectionSpec, { type: T }>
