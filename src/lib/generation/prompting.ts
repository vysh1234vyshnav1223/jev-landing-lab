import { z } from 'zod'
import { ARCHETYPES } from '@/lib/generation/archetypes'
import type { PageBlueprint } from '@/schemas/blueprint'
import type { ProductBrief } from '@/schemas/brief'
import type { SectionType } from '@/schemas/spec'

/** Prompt fragments shared by the hypothesize, compose and critique stages. */

export function briefText(brief: ProductBrief): string {
  return [
    'PRODUCT',
    `Name: ${brief.productName}`,
    `What it is: ${brief.product}`,
    `Industry: ${brief.industry}`,
    `Audience: ${brief.audience}`,
    `Primary goal: ${brief.primaryGoal}`,
    `Conversion action: ${brief.conversionAction}`,
    brief.secondaryGoals.length ? `Secondary goals: ${brief.secondaryGoals.join('; ')}` : '',
    brief.brandAttributes.length ? `Brand: ${brief.brandAttributes.join(', ')}` : '',
    brief.geography ? `Market: ${brief.geography}` : '',
    brief.competitors.length ? `Competitors: ${brief.competitors.join(', ')}` : '',
    brief.priceContext ? `Pricing context: ${brief.priceContext}` : '',
  ]
    .filter(Boolean)
    .join('\n')
}

/** What each section type is FOR — the hypothesizer plans with these. */
const PURPOSES: Record<SectionType, string> = {
  search: 'the core search or booking tool as a block',
  featureGrid: 'what it does or offers, as a set of distinct capabilities or benefits',
  socialProof: 'credibility at a glance: logos, a rating, headline metrics or short quotes',
  stats: 'scale or results in a few numbers',
  pricing: 'plans and prices, as an argument in themselves',
  testimonials: 'longer human stories from named customers',
  showcase: 'browsable items: products, rooms, routes, courses, templates',
  comparison: 'a side-by-side against named alternatives',
  explainer: 'how it works, in 2-4 steps',
  faq: 'objection handling, question by question',
  cta: 'a closing ask',
  story: 'prose: atmosphere, a problem worth naming, a place, a point of view, with optional facts beside it',
  useCases: 'choose by need: each situation mapped to what to pick',
  codeSample: 'real code showing how the product is used',
  integrations: 'what it plugs into',
}

export const SECTION_GUIDE = (Object.keys(PURPOSES) as SectionType[])
  .map((t) => `- ${t}: ${PURPOSES[t]}`)
  .join('\n')

/** Field-level reference for the composer, per section type. */
const FIELDS: Record<SectionType, string> = {
  search: 'heading, tabs[], fields[{label,placeholder,kind,options[]}], submitLabel',
  featureGrid:
    'layout: cards (3-col cards) | list (icon rows, 2 columns) | split (heading left, items right) | bento (first item large). items[{icon,title,body}] (2-6)',
  socialProof:
    'variant is fixed by the blueprint; fill ONLY its payload — logos[] | quotes[{quote,name,role}] | metrics[{value,label}] | rating{score,count,source}',
  stats: 'layout: row (centred numbers) | band (full-width accent strip) | cards. items[{value,label}] (2-4)',
  pricing:
    'billingToggle, annualDiscountLabel, plans[{name,monthlyPrice,annualPrice,period,description,features[],cta,featured}] (2-4)',
  testimonials:
    'layout: grid | spotlight (first quote large and centred) | wall (masonry). items[{quote,name,role}] (2-6)',
  showcase:
    'layout: grid | list (dense rows) | carousel (horizontal scroll). categories[], items[{title,meta,detail,category,badge}] (3-9); every item.category must appear in categories',
  comparison:
    'layout: table | cards (one card per column). columns[] (2-3, ours first), rows[{label,values[]}]; values length must equal columns length',
  explainer: 'layout: cards | timeline (vertical line) | numbered (heading left, large numerals right). steps[{title,body}] (2-4)',
  faq: 'layout: accordion | columns (all answers open) | split (heading left, accordion right). items[{q,a}] (3-6)',
  cta: 'layout: card (contained box) | band (full-width accent strip) | split (text left, buttons right). primaryCta, secondaryCta, reassurance',
  story:
    'layout: statement (large centred prose) | split (prose left, facts right) | editorial (eyebrow, big heading, two-column prose). eyebrow, paragraphs[] (1-3, 1-3 sentences each), facts[{label,value}] (0-6)',
  useCases:
    'layout: tabs (one tab per situation) | tiles (cards). items[{icon,title,body,recommendation}] (2-6); title is the situation, recommendation is what to pick for it',
  codeSample:
    'layout: split (points left, code right) | stacked (code full width). points[{title,body}] (0-4), snippets[{label,code}] (1-3); label is the language or step; code is short, real and runnable-looking, newlines as \\n',
  integrations: 'layout: grid | inline. items[{name,detail}] (3-12)',
}

export function fieldGuide(types: Iterable<SectionType>): string {
  return [...new Set(types)].map((t) => `- ${t}: ${FIELDS[t]}`).join('\n')
}

/** Copy rules every generative stage that writes words follows. */
export const COPY_RULES = `- Specific over generic. Name real things the product does or sells.
- No AI-startup filler: never "unleash", "revolutionise", "supercharge", "game-changing", "seamless", "cutting-edge", "empower", "elevate".
- Headlines under 70 characters. Subheadlines under 160.
- CTA labels are 2-4 words, verb-first.
- Where a section supports an "icon", use a lucide-react icon name in kebab-case, e.g. "shield-check", "map-pin", "zap".`

/**
 * `oneOf` → `anyOf`, recursively. Zod unions can compile to `oneOf`, but
 * OpenAI strict mode rejects it and wants `anyOf` for the same meaning.
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
 * Generated from the Zod validator, never hand-written: OpenAI strict mode
 * needs `additionalProperties: false` and a complete `required` array at every
 * level, which `{ target: 'openai' }` satisfies by construction.
 */
export function strictJsonSchema(schema: z.ZodType): unknown {
  return oneOfToAnyOf(z.toJSONSchema(schema, { target: 'openai' }))
}

/** The blueprint, as the composer and the critic read it. */
export function blueprintText(bp: PageBlueprint): string {
  const slots = bp.sections
    .map(
      (s) =>
        `- ${s.key} [${s.required ? 'required' : 'optional: return null if it cannot earn its place'}] — ${s.purpose}`,
    )
    .join('\n')
  return `STRATEGY: ${bp.strategyName} (${ARCHETYPES[bp.archetype].label})
Goal: ${bp.strategicGoal}
Thesis: ${bp.thesis}
Persuasion: ${bp.persuasion}
Audience framing: ${bp.audienceFraming}
Narrative: ${bp.narrative.join(' → ')}
Conversion: ${bp.conversion.approach} — ${bp.conversion.rationale}

HERO (fixed: ${bp.hero.variant}) — ${bp.hero.purpose}
Hero trust signals: ${bp.hero.trustSignals ? 'required, 2-4' : 'none'}

SECTIONS (fixed order; each key is a response property)
${slots}

SOCIAL PROOF FORM (fixed): ${bp.proof.type}
VISUAL DIRECTION (fixed): ${bp.visual.direction}
NAVIGATION: up to ${bp.navigation.maxLinks} links${bp.navigation.maxLinks === 0 ? ' (none — wordmark and one action only)' : ''}

CONTENT REQUIREMENTS
${bp.contentRequirements.map((r) => `- ${r}`).join('\n')}

CONSTRAINTS
${bp.constraints.map((r) => `- ${r}`).join('\n')}`
}
