import { z } from 'zod'
import { COMPOSING, generateStructured } from '@/lib/openrouter/client'
import { accentFor, navLinkCount, planSections } from '@/lib/generation/architecture'
import type { Strategy } from '@/lib/jev/directions'
import type { ProductBrief } from '@/schemas/brief'
import { landingPageSpec, type LandingPageSpec, type SectionType } from '@/schemas/spec'

/**
 * Stage ③ — copy for Jev's chosen strategy, in one call.
 *
 * Runs on a named paid model (see the `COMPOSING` provider), not the free
 * router: composing is the stage a person actually waits on to see a page,
 * so it gets strict JSON-schema enforcement and a reliable provider instead
 * of a free-tier gamble.
 *
 * The model chooses words. It does not choose structure — hero variant,
 * section list and theme are merged in from Jev's decisions afterwards.
 */

const HERO_BRIEF: Record<string, string> = {
  search_first:
    'The hero contains a working search/input control. Write field labels and placeholders for it. The headline should be short and functional.',
  value_prop:
    'The hero leads with a clear benefit headline and an explanatory subheadline. No search control.',
  social_proof:
    'The hero leads with credibility. Provide trust signals and a headline that borrows authority.',
  product_demo:
    'The hero shows the product working. Provide 2-4 demo steps that narrate what the interface does.',
}

const CTA_BRIEF: Record<string, string> = {
  direct_action: 'CTA asks for the core action immediately.',
  free_trial: 'CTA offers a free or low-commitment entry point.',
  explore: 'CTA invites browsing rather than committing.',
  contact: 'CTA asks the visitor to talk to a person.',
}

const TONE: Record<string, string> = {
  clean_utility: 'Plain, efficient, concrete. Short sentences.',
  warm_editorial: 'Warm and considered, a little more spacious in phrasing.',
  bold_confident: 'Direct and declarative. Strong verbs, no hedging.',
  technical_precise: 'Precise and specific. Name real mechanisms, avoid adjectives.',
}

const SYSTEM = `You write the copy for a landing page.

The STRUCTURE of the page is already decided and is not yours to change. You are given the exact hero type and the exact ordered list of sections. Produce content for precisely those sections, in that order, with those types.

Copy rules:
- Specific over generic. Name real things the product does.
- No AI-startup filler: never "unleash", "revolutionise", "supercharge", "game-changing", "seamless", "cutting-edge", "empower".
- Headlines under 70 characters. Subheadlines under 160.
- CTA labels are 2-4 words, verb-first.
- Invent plausible, concrete specifics (names, numbers, places, prices) suited to the market. Keep them realistic.
- Where a section supports an "icon", use a lucide-react icon name in kebab-case, e.g. "shield-check", "map-pin", "zap".
- Return JSON only.`

/**
 * offerProminence 1 ("secondary") gets no dedicated pricing section — that's
 * reserved for 2 ("leading"). The model still needs somewhere to put the
 * number, or it either invents a pricing section the schema will reject, or
 * drops price entirely, which is its own kind of wrong for a 1.
 */
const PRICE_PLACEMENT: Record<number, string> = {
  0: 'Price is not part of this page. Do not mention a number anywhere.',
  1: 'Price is secondary, not a section of its own. Mention it once, in passing — a hero eyebrow, or one bullet in whichever feature/detail section fits — not a headline, not its own block.',
  2: 'Price leads. The pricing section is where it belongs; make it prominent there.',
}

function strategyPrompt(s: Strategy, sections: string[]) {
  return `Hero type: ${s.heroStrategy}
  ${HERO_BRIEF[s.heroStrategy]}
CTA intent: ${s.ctaStrategy} — ${CTA_BRIEF[s.ctaStrategy]}
Tone: ${TONE[s.visualDirection]}
Social proof format: ${s.socialProofType}
Leads with: ${s.contentHierarchy}
Price: ${PRICE_PLACEMENT[s.offerProminence] ?? PRICE_PLACEMENT[0]}
Price-sensitive audience: ${s.audienceIsPriceSensitive ? 'yes — make value explicit' : 'no — do not lead on cost'}
Trust is the main barrier: ${s.trustIsPrimaryBarrier ? 'yes — reassure early' : 'no'}
Needs education: ${s.requiresEducation ? 'yes — explain the concept before pitching' : 'no'}
Navigation links: exactly ${navLinkCount(s)}
Sections, in this exact order: ${sections.join(' → ')}`
}

/** The model's payload: copy only, no theme (Jev owns that). */
const baseResponseSchema = landingPageSpec.omit({ theme: true })

/**
 * A model can return valid JSON that's simply short a section or two — every
 * field it did include passes the base schema fine, so nothing before this
 * caught it. That used to ship silently: compose.ts's merge step just filters
 * `wanted` down to whatever sections happen to be present, with no error and
 * no retry, so a page that asked for 4 sections could quietly end up with 2.
 * Baking the exact wanted list into the validator turns "missing section"
 * into an ordinary validation failure, which the existing retry loop in
 * generateStructured already repairs the same way it repairs anything else —
 * by naming exactly what's missing and asking again.
 */
function responseSchemaFor(wanted: SectionType[]) {
  return baseResponseSchema.superRefine((val, ctx) => {
    const got = new Set(val.sections.map((s) => s.type))
    const missing = wanted.filter((t) => !got.has(t))
    if (missing.length > 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['sections'],
        message: `Missing required section(s): ${missing.join(', ')}. The response must include exactly these sections, in this order: ${wanted.join(' → ')}.`,
      })
    }
  })
}

/**
 * `oneOf` → `anyOf`, recursively. Zod's discriminated unions (used for the 11
 * `sections` variants) compile to `oneOf`, valid JSON Schema — but this
 * endpoint's strict-mode implementation specifically rejects `oneOf` and
 * wants `anyOf` for the exact same "exactly one of these shapes" meaning.
 * The two behave identically for a discriminated union (the `type` literal
 * already makes the branches mutually exclusive), so renaming the key is a
 * no-op semantically and a required one for this provider.
 */
function oneOfToAnyOf(schema: unknown): unknown {
  if (Array.isArray(schema)) return schema.map(oneOfToAnyOf)
  if (schema === null || typeof schema !== 'object') return schema
  const obj = schema as Record<string, unknown>
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj)) {
    out[key === 'oneOf' ? 'anyOf' : key] = oneOfToAnyOf(value)
  }
  return out
}

/**
 * Generated straight from the Zod validator, not hand-written. OpenAI's real
 * strict mode (constrained decoding, not a hint) demands `additionalProperties:
 * false` and a complete `required` array on every object, at every nesting
 * level, including inside a discriminated union like `sections` (11 section
 * types, each needing its own fully-enumerated branch) — hand-maintaining a
 * second copy of the schema kept drifting out of sync with the real one and
 * cost three separate 400s to a real request before catching each gap. Zod's
 * own `{ target: 'openai' }` output satisfies every one of those rules by
 * construction, from the same source of truth the response is validated
 * against; `oneOfToAnyOf` covers the one gap Zod's output still has for this
 * endpoint. Built from `baseResponseSchema`, not the per-request refined one —
 * `superRefine` is a runtime check with no JSON Schema representation, and
 * the wanted-sections list already goes to the model in the prose prompt.
 */
function jsonSchema() {
  return oneOfToAnyOf(z.toJSONSchema(baseResponseSchema, { target: 'openai' }))
}

const SECTION_FIELD_GUIDE = `Required fields per section type:
- search: heading, tabs[], fields[{label,placeholder,kind,options[]}], submitLabel
- featureGrid: heading, items[{icon,title,body}] (2-6)
- socialProof: heading, variant, and the matching payload — logos[] | quotes[{quote,name,role}] | metrics[{value,label}] | rating{score,count,source}
- stats: heading, items[{value,label}] (2-4)
- pricing: heading, billingToggle, annualDiscountLabel, plans[{name,monthlyPrice,annualPrice,period,description,features[],cta,featured}] (2-4)
- testimonials: heading, items[{quote,name,role}] (2-6)
- showcase: heading, categories[], items[{title,meta,detail,category,badge}] (3-9) — every item.category must appear in categories
- comparison: heading, columns[] (2-3), rows[{label,values[]}] — values length must equal columns length
- explainer: heading, steps[{title,body}] (2-4)
- faq: heading, items[{q,a}] (3-6)
- cta: heading, primaryCta, secondaryCta, reassurance`

export async function composeSpec(
  brief: ProductBrief,
  strategy: Strategy,
  apiKey?: string,
): Promise<LandingPageSpec> {
  const wanted = planSections(strategy)

  const user = `PRODUCT
Name: ${brief.productName}
What it is: ${brief.product}
Industry: ${brief.industry}
Audience: ${brief.audience}
Primary goal: ${brief.primaryGoal}
Conversion action: ${brief.conversionAction}
Brand: ${brief.brandAttributes.join(', ')}
${brief.geography ? `Market: ${brief.geography}` : ''}
${brief.competitors.length ? `Competitors: ${brief.competitors.join(', ')}` : ''}
${brief.priceContext ? `Pricing context: ${brief.priceContext}` : ''}

${SECTION_FIELD_GUIDE}

${strategyPrompt(strategy, wanted)}`

  const raw = await generateStructured({
    provider: COMPOSING,
    system: SYSTEM,
    user,
    schemaName: 'landing_page',
    jsonSchema: jsonSchema(),
    // Rejects (and triggers a repair retry on) a response missing any
    // section `wanted` asked for — see responseSchemaFor's comment. By the
    // time this resolves, raw.sections is guaranteed to have all of them.
    validator: responseSchemaFor(wanted),
    stage: 'composing',
    apiKey,
  })

  // Merge Jev's decisions back over whatever the model produced. The model
  // does not get the final word on structure.
  return landingPageSpec.parse({
    ...raw,
    theme: {
      direction: strategy.visualDirection,
      accent: accentFor(strategy),
    },
    navigation: {
      ...raw.navigation,
      links: raw.navigation.links.slice(0, navLinkCount(strategy)),
      sticky: strategy.navigationComplexity > 0,
    },
    hero: { ...raw.hero, variant: strategy.heroStrategy },
    // Reorder to the architecture's exact order (the model can still return
    // its own extras or a different order) — every wanted type is guaranteed
    // present by the validator above, so this find() is never empty.
    sections: wanted.map((type) => raw.sections.find((s) => s.type === type)!),
  })
}
