import { z } from 'zod'
import { COMPOSING, generateStructured } from '@/lib/openrouter/client'
import type { Strategy } from '@/lib/jev/directions'
import { QUESTIONS, QUESTION_IDS, type JevQuestion } from '@/lib/jev/questions'
import type { ProductBrief } from '@/schemas/brief'
import { landingPageSpec, type LandingPageSpec } from '@/schemas/spec'

/**
 * Stage ④ — the whole page, in one call: which sections, in what order, which
 * hero, which theme, and every word of copy.
 *
 * Jev's 12 answers go in verbatim, with the question each one answers and
 * what the chosen answer means. The model reads them as expert judgement and
 * designs a page for THIS product from them — no code decides structure.
 *
 * Runs on a named paid model (see the `COMPOSING` provider), not the free
 * router: this is the stage a person actually waits on, so it gets strict
 * JSON-schema enforcement and a reliable provider.
 */

const MIN_SECTIONS = 3

const SYSTEM = `You are the designer and copywriter of a landing page. You decide its structure AND write its copy.

You are given a product brief and the answers of Jev, an expert decision model, to 12 strategic questions about this page. Treat Jev's answers as the strategic direction: every structural choice you make should be traceable to them and to the product. Do not fall back on a generic SaaS template (features → testimonials → pricing → FAQ → CTA) unless this product genuinely calls for it — a travel search, a skincare brand, a B2B tool and a local tutor should produce visibly different pages.

You decide:
- hero.variant — which hero component leads the page.
- sections — which section types to use, how many, in what order, and each one's layout and tone. Pick only what earns its place; omit anything this product does not need. A section type may appear more than once if the page genuinely benefits.
- theme — the visual register and accent colour.
- navigation — how many links (0-6), whether it is sticky.

Copy rules:
- Specific over generic. Name real things the product does.
- No AI-startup filler: never "unleash", "revolutionise", "supercharge", "game-changing", "seamless", "cutting-edge", "empower".
- Headlines under 70 characters. Subheadlines under 160.
- CTA labels are 2-4 words, verb-first.
- Invent plausible, concrete specifics (names, numbers, places, prices) suited to the market. Keep them realistic. If price is not part of the page, do not mention a number.
- Where a section supports an "icon", use a lucide-react icon name in kebab-case, e.g. "shield-check", "map-pin", "zap".
- Fill only the hero fields the chosen variant uses (searchFields for search_first, demoSteps for product_demo, trustSignals when credibility matters); leave the others empty.
- Return JSON only.`

const CATALOGUE = `HERO VARIANTS
- search_first: a working search/input control in the hero (fill searchFields). Short, functional headline.
- value_prop: a benefit headline and explanatory subheadline. No search control.
- social_proof: leads with credibility (fill trustSignals); headline borrows authority.
- product_demo: shows the product working (fill 2-4 demoSteps).

THEMES
- direction: clean_utility (neutral, dense, efficient) | warm_editorial (spacious, magazine-like) | bold_confident (high contrast, strong type) | technical_precise (monospace accents, fine borders, restrained)
- accent: blue | emerald | amber | violet | rose | slate

SECTION TYPES — what each is for, its layouts, and its fields
Every section also takes tone: plain | surface (a tinted background band) | null (the type's default). Use layout and tone to give the page rhythm and a character of its own — alternate dense and airy, contained and full-bleed; don't give every section the same shape. Accent bands are loud: one or two per page at most.
- search: the core tool as a block. heading, tabs[], fields[{label,placeholder,kind,options[]}], submitLabel
- featureGrid: what it does. layout: cards (3-col cards) | list (icon rows, 2 columns) | split (heading left, stacked items right) | bento (first item large, rest around it). heading, items[{icon,title,body}] (2-6)
- socialProof: credibility. heading, variant, and the matching payload — logos[] | quotes[{quote,name,role}] | metrics[{value,label}] | rating{score,count,source}
- stats: scale in numbers. layout: row (centred numbers) | band (full-width accent-coloured strip, big numbers) | cards. heading, items[{value,label}] (2-4)
- pricing: price as an argument. heading, billingToggle, annualDiscountLabel, plans[{name,monthlyPrice,annualPrice,period,description,features[],cta,featured}] (2-4)
- testimonials: human stories. layout: grid | spotlight (first quote large and centred, rest small) | wall (masonry). heading, items[{quote,name,role}] (2-6)
- showcase: browsable items — destinations, products, templates, courses. layout: grid | list (dense rows) | carousel (horizontal scroll). heading, categories[], items[{title,meta,detail,category,badge}] (3-9) — every item.category must appear in categories
- comparison: against alternatives. layout: table | cards (one card per column). heading, columns[] (2-3), rows[{label,values[]}] — values length must equal columns length
- explainer: teach how it works. layout: cards | timeline (vertical line) | numbered (heading left, large numerals right). heading, steps[{title,body}] (2-4)
- faq: objection handling. layout: accordion | columns (all answers open, 2 columns) | split (heading left, accordion right). heading, items[{q,a}] (3-6)
- cta: a closing ask. layout: card (contained box) | band (full-width accent-coloured strip) | split (text left, buttons right). heading, primaryCta, secondaryCta, reassurance`

/** Each of Jev's answers, with the question and what the chosen answer means. */
function jevAnswers(strategy: Strategy): string {
  return QUESTION_IDS.map((id) => {
    const q: JevQuestion = QUESTIONS[id]
    const value = strategy[id]
    const meaning =
      q.type === 'score'
        ? q.criteria[value as number]
        : (q.criteria as Record<string, string>)[String(value)]
    return `- ${q.instructions}\n  Jev: ${String(value)} — ${meaning ?? ''}`
  }).join('\n')
}

const responseSchema = landingPageSpec.superRefine((val, ctx) => {
  if (val.sections.length < MIN_SECTIONS) {
    ctx.addIssue({
      code: 'custom',
      path: ['sections'],
      message: `A landing page needs at least ${MIN_SECTIONS} sections; got ${val.sections.length}.`,
    })
  }
})

/**
 * `oneOf` → `anyOf`, recursively. Zod's discriminated unions compile to
 * `oneOf`, but this endpoint's strict mode rejects `oneOf` and wants `anyOf`
 * for the same meaning — the `type` literal already makes branches exclusive.
 */
function oneOfToAnyOf(schema: unknown): unknown {
  if (Array.isArray(schema)) return schema.map(oneOfToAnyOf)
  if (schema === null || typeof schema !== 'object') return schema
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(schema as Record<string, unknown>)) {
    out[key === 'oneOf' ? 'anyOf' : key] = oneOfToAnyOf(value)
  }
  return out
}

/**
 * Generated from the Zod validator, not hand-written: OpenAI strict mode needs
 * `additionalProperties: false` and a complete `required` array at every
 * level, which `{ target: 'openai' }` satisfies by construction.
 */
function jsonSchema() {
  return oneOfToAnyOf(z.toJSONSchema(landingPageSpec, { target: 'openai' }))
}

export async function composeSpec(
  brief: ProductBrief,
  strategy: Strategy,
  apiKey?: string,
): Promise<LandingPageSpec> {
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

JEV'S ANSWERS
${jevAnswers(strategy)}

${CATALOGUE}`

  return generateStructured({
    provider: COMPOSING,
    system: SYSTEM,
    user,
    schemaName: 'landing_page',
    jsonSchema: jsonSchema(),
    validator: responseSchema,
    stage: 'composing',
    apiKey,
  })
}
