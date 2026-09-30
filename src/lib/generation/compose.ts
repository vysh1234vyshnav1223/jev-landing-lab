import { z } from 'zod'
import { COMPOSING, generateStructured } from '@/lib/openrouter/client'
import { blueprintText, briefText, COPY_RULES, fieldGuide, strictJsonSchema } from '@/lib/generation/prompting'
import type { BlueprintSlot, PageBlueprint } from '@/schemas/blueprint'
import type { ProductBrief } from '@/schemas/brief'
import {
  ACCENTS,
  demoStep,
  footerSpec,
  heroSpec,
  landingPageSpec,
  searchField,
  SECTION_SCHEMAS,
  type LandingPageSpec,
  type ProofVariant,
} from '@/schemas/spec'

/**
 * Stage ⑤ — execute the blueprint.
 *
 * The composing model is the creative executor, not the strategist. Its
 * response schema is generated FROM the blueprint:
 *
 *   - `sections` is an object with one property per blueprint slot, in
 *     blueprint order. Forbidden section types do not exist in it; the model
 *     cannot add, drop (unless the slot is optional), reorder or swap one.
 *   - `hero.variant`, `theme.direction` and the social-proof form are
 *     single-value literals fixed by Jev.
 *   - Trust signals, search fields and demo steps are required or forbidden
 *     per the blueprint, via array bounds.
 *
 * What remains free is the craft: every word, each section's layout and tone,
 * the accent colour, navigation and footer.
 */

const SYSTEM = `You are the creative lead executing a landing page whose strategy has already been decided. Jev, an expert decision model, chose this strategy from several candidates, and application code turned it into the blueprint below.

The blueprint is binding and the response schema enforces it: the narrative, the sections and their order, the hero variant, the social-proof form, the visual direction and the conversion approach are fixed. You cannot add, remove, reorder or swap sections — except that an optional slot may be null when it genuinely cannot earn its place.

Your job is everything else, done exceptionally well: every word of copy, each section's layout and tone, the accent colour, navigation links and footer. The page should feel like it belongs to its category — a hotel page reads like a hotel, a developer tool like a developer tool, a shop like a shop.

Execution rules:
- Each section does the job its purpose names and moves the narrative on from the section before it. No two sections make the same point.
- Give the page rhythm with layout and tone: alternate dense and airy, contained and full-bleed. Accent bands (layout "band") at most twice.
- Every section has a real heading. Fill only the hero fields its variant uses; leave the others empty.
${COPY_RULES}
- Follow the blueprint's content requirements and constraints exactly. They are checked after you answer.
- Return JSON only.`

const quote = z.object({ quote: z.string(), name: z.string(), role: z.string() })
const metric = z.object({ value: z.string(), label: z.string() })

/** Social proof with the variant Jev chose, and only that variant's payload. */
function socialProofSchema(type: ProofVariant) {
  return SECTION_SCHEMAS.socialProof.omit({ slot: true }).extend({
    variant: z.literal(type),
    logos: type === 'customer_logos' ? z.array(z.string()).min(3).max(8) : z.array(z.string()).max(0),
    quotes: type === 'testimonials' ? z.array(quote).min(2).max(4) : z.array(quote).max(0),
    metrics: type === 'metrics' ? z.array(metric).min(2).max(4) : z.array(metric).max(0),
    rating:
      type === 'ratings_reviews'
        ? z.object({ score: z.string(), count: z.string(), source: z.string() })
        : z.null(),
  })
}

export function slotSchema(slot: BlueprintSlot, bp: PageBlueprint): z.ZodType {
  const schema =
    slot.type === 'socialProof'
      ? socialProofSchema(bp.proof.type)
      : (SECTION_SCHEMAS[slot.type] as z.ZodObject).omit({ slot: true })
  return slot.required ? schema : schema.nullable()
}

/** Each part of the page, constrained by the blueprint. Repair reuses these. */
export function executionParts(bp: PageBlueprint) {
  const variant = bp.hero.variant
  return {
    theme: z.object({ direction: z.literal(bp.visual.direction), accent: z.enum(ACCENTS) }),
    navigation: z.object({
      wordmark: z.string(),
      links: z.array(z.object({ label: z.string(), href: z.string() })).max(bp.navigation.maxLinks),
      ctaLabel: z.string(),
    }),
    hero: heroSpec.extend({
      variant: z.literal(variant),
      trustSignals: bp.hero.trustSignals ? z.array(z.string()).min(2).max(4) : z.array(z.string()).max(0),
      searchFields: variant === 'search_first' ? z.array(searchField).min(1).max(4) : z.array(searchField).max(0),
      demoSteps: variant === 'product_demo' ? z.array(demoStep).min(2).max(4) : z.array(demoStep).max(0),
    }),
    slots: Object.fromEntries(bp.sections.map((s) => [s.key, slotSchema(s, bp)])) as Record<string, z.ZodType>,
    footer: footerSpec,
  }
}

export type ComposerOutput = {
  theme: unknown
  navigation: { wordmark: string; links: { label: string; href: string }[]; ctaLabel: string }
  hero: unknown
  sections: Record<string, unknown>
  footer: unknown
}

function comparisonRowsMatch(section: unknown): boolean {
  const s = section as { type?: string; columns?: unknown[]; rows?: { values: unknown[] }[] }
  if (s?.type !== 'comparison') return true
  return (s.rows ?? []).every((r) => r.values.length === s.columns?.length)
}

export function executionSchema(bp: PageBlueprint) {
  const parts = executionParts(bp)
  return z
    .object({
      theme: parts.theme,
      navigation: parts.navigation,
      hero: parts.hero,
      sections: z.object(parts.slots),
      footer: parts.footer,
    })
    .superRefine((val, ctx) => {
      // Blank copy passes a strict schema (an empty string is a string); it
      // fails here so the retry loop asks for real words.
      const hero = val.hero as { headline: string; subheadline: string; primaryCta: string }
      for (const field of ['headline', 'subheadline', 'primaryCta'] as const) {
        if (!hero[field].trim()) ctx.addIssue({ code: 'custom', path: ['hero', field], message: 'Must not be empty.' })
      }
      for (const [key, section] of Object.entries(val.sections as Record<string, unknown>)) {
        if (!section) continue
        if (!(section as { heading: string }).heading.trim()) {
          ctx.addIssue({ code: 'custom', path: ['sections', key, 'heading'], message: 'Every section needs a heading.' })
        }
        if (!comparisonRowsMatch(section)) {
          ctx.addIssue({ code: 'custom', path: ['sections', key], message: 'Every comparison row needs one value per column.' })
        }
      }
    })
}

/** Composer output → the renderer's spec, in blueprint order, slots stamped. */
export function toSpec(out: ComposerOutput, bp: PageBlueprint): LandingPageSpec {
  return landingPageSpec.parse({
    theme: out.theme,
    navigation: { ...out.navigation, sticky: bp.navigation.sticky },
    hero: out.hero,
    sections: bp.sections.flatMap((slot) => {
      const section = out.sections[slot.key]
      return section ? [{ ...(section as object), slot: slot.key }] : []
    }),
    footer: out.footer,
  })
}

export function composeUser(brief: ProductBrief, bp: PageBlueprint): string {
  return `${briefText(brief)}

BLUEPRINT
${blueprintText(bp)}

SECTION FIELDS (only the types this blueprint uses)
${fieldGuide(bp.sections.map((s) => s.type))}`
}

export async function composeSpec(
  brief: ProductBrief,
  bp: PageBlueprint,
  apiKey?: string,
): Promise<LandingPageSpec> {
  const schema = executionSchema(bp)
  const out = await generateStructured({
    provider: COMPOSING,
    system: SYSTEM,
    user: composeUser(brief, bp),
    schemaName: 'landing_page',
    jsonSchema: strictJsonSchema(schema),
    validator: schema,
    stage: 'composing',
    apiKey,
  })
  return toSpec(out as ComposerOutput, bp)
}
