import { ARCHETYPES, type ArchetypeId } from '@/lib/generation/archetypes'
import { briefText, SECTION_GUIDE, strictJsonSchema } from '@/lib/generation/prompting'
import { COMPOSING, generateStructured } from '@/lib/openrouter/client'
import type { ProductBrief } from '@/schemas/brief'
import {
  CONVERSION_LABELS,
  hypothesisDraftSet,
  hypothesisIssues,
  sectionSignature,
  type HypothesisDraft,
  type StrategyHypothesis,
} from '@/schemas/strategy'

/**
 * Stage ② — the brief → 3 to 5 materially different strategies.
 *
 * The model's job here is breadth: propose genuinely different arguments for
 * what this page should be. It does not choose between them (Jev does) and it
 * writes no copy (the composer does, later, inside a blueprint).
 */

const SYSTEM = `You are a landing-page strategist. Given a product brief, you propose 3 to 5 materially different STRATEGIES for its landing page. You do not choose between them and you write no copy.

A strategy is an argument, not a look. Candidates must differ from each other in at least two of: narrative, persuasion mechanism, conversion approach, information hierarchy, audience framing. Colours, hero size, tone of voice or theme are NOT strategic differences — two candidates that differ only in those are one candidate.

Archetype: pick the archetype that honestly describes this business. Usually every candidate shares it. A candidate may use a different archetype only as a deliberate alternative framing the business genuinely supports (a skincare brand sold as a subscription, say) — never to borrow sections the business has no use for.

Sections: 3 to 8 per strategy, in narrative order, taken ONLY from that archetype's list — other section types do not exist for that kind of page. Each section gets a purpose specific to this product and its place in the story ("prove the sole grips on wet rock", not "show features"). Mark essential=false for any section a strong page could do without. Never include a section because landing pages usually have one. Candidates must not all open with the same section, and not every strategy should close with faq then cta.

Name each strategy by its argument in 2-6 words ("Fitted by runners", "Book the rooftop"), never "Strategy A".

Hero: choose from the archetype's heroes. Its purpose is the job the first screen does.

Return JSON only.`

function archetypeGuide(): string {
  return (Object.keys(ARCHETYPES) as ArchetypeId[])
    .map((id) => {
      const a = ARCHETYPES[id]
      return `- ${id} — ${a.description}\n  sections: ${a.sections.join(', ')}\n  heroes: ${a.heroes.join(', ')}`
    })
    .join('\n')
}

const HERO_GUIDE = `- search_first: a working search control above the fold
- value_prop: a benefit headline and explanation
- social_proof: leads with credibility
- product_demo: shows the product working`

const responseSchema = hypothesisDraftSet.superRefine((val, ctx) => {
  for (const h of val.strategies) {
    for (const message of hypothesisIssues(h)) ctx.addIssue({ code: 'custom', path: ['strategies'], message })
  }
  // A floor, not a style rule: candidates may share a structure when they
  // argue differently (a spa-led and a romance-led hotel page can use the
  // same sections), but a set with ONE structure is one strategy in costume.
  const structures = new Set(val.strategies.map(sectionSignature))
  if (structures.size === 1) {
    ctx.addIssue({
      code: 'custom',
      path: ['strategies'],
      message: 'Every candidate has the same hero and section sequence — at least one must be structured differently.',
    })
  }
})

/** Stable, readable ids — they become Jev's option keys. */
export function withIds(drafts: HypothesisDraft[]): StrategyHypothesis[] {
  const used = new Set<string>()
  return drafts.map((raw) => {
    // "Strategy A — Fitted by runners" → "Fitted by runners"
    const d = { ...raw, name: raw.name.replace(/^(strategy|option|candidate)\s*[a-e1-5]\s*[—–:-]\s*/i, '') }
    const base =
      d.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 40) || 'strategy'
    let id = base
    for (let n = 2; used.has(id); n++) id = `${base}_${n}`
    used.add(id)
    return { ...d, id }
  })
}

export async function hypothesize(brief: ProductBrief, apiKey?: string): Promise<StrategyHypothesis[]> {
  const user = `${briefText(brief)}

ARCHETYPES
${archetypeGuide()}

SECTION TYPES — what each is for
${SECTION_GUIDE}

HEROES
${HERO_GUIDE}

CONVERSION APPROACHES
${Object.entries(CONVERSION_LABELS)
  .map(([k, v]) => `- ${k}: ${v}`)
  .join('\n')}`

  const { strategies } = await generateStructured({
    provider: COMPOSING,
    system: SYSTEM,
    user,
    schemaName: 'strategy_hypotheses',
    jsonSchema: strictJsonSchema(hypothesisDraftSet),
    validator: responseSchema,
    stage: 'hypothesizing',
    apiKey,
  })
  return withIds(strategies)
}
