import { z } from 'zod'
import { COMPOSING, generateStructured } from '@/lib/openrouter/client'
import { checkBlueprint, slotKeys } from '@/lib/generation/blueprint'
import { executionParts } from '@/lib/generation/compose'
import { blueprintText, briefText, COPY_RULES, fieldGuide, strictJsonSchema } from '@/lib/generation/prompting'
import { ISSUE_TYPES, type CritiqueIssue, type CritiqueReport, type PageBlueprint } from '@/schemas/blueprint'
import type { ProductBrief } from '@/schemas/brief'
import { landingPageSpec, type LandingPageSpec, type SectionSpec } from '@/schemas/spec'

/**
 * Stage ⑥ — did execution stay faithful to the strategy?
 *
 *   1. Rules (`checkBlueprint`): everything checkable without judgment —
 *      forbidden or missing sections, fixed choices overridden, prices where
 *      Jev said price is absent.
 *   2. Review: a model reads the page against the blueprint for what rules
 *      can't see — relevance, duplication, unsupported claims, narrative,
 *      conversion.
 *   3. Repair: if anything is blocking, ONE targeted call rewrites only the
 *      flagged parts (a section, the hero…) under the same blueprint-derived
 *      schemas the composer used. Nothing else is regenerated.
 *
 * The review and the repair are best-effort. A page that passed the composer's
 * schema is already on-blueprint structurally, so if either call fails the
 * run still succeeds, with the report saying what could not be checked.
 */

const REVIEW_SYSTEM = `You review a composed landing page against the strategy it was meant to execute. You did not write it. Be exacting but fair: report only real problems.

Check:
1. Strategic fidelity — does each section do the job its blueprint purpose names, and does the page make the strategy's argument?
2. Section relevance — does every section have a reason to exist for THIS product? A section that only makes sense for a different kind of business is irrelevant.
3. Duplication — do two sections make essentially the same point?
4. Evidence — does the copy assert specifics the brief does not support: performance percentages, benchmark results, awards, certifications, well-known real companies named as customers or partners, prices where the blueprint forbids them? Illustrative testimonials and sample items are allowed when ordinary and plausible.
5. Narrative coherence — does the page tell the blueprint's story, in the blueprint's order?
6. Conversion alignment — does every call to action point at the conversion action?

Severity: "blocking" only when a visitor would be misled, a section fails its purpose, or the strategy is visibly not followed; "minor" for polish. Target the smallest part: "hero", "navigation", "footer" or a section's key. At most 8 issues; an empty list is a valid answer. Return JSON only.`

const REPAIR_SYSTEM = `You are fixing specific parts of a landing page after review. Rewrite ONLY the parts in the response schema; everything else on the page stays as it is. Each rewritten part must resolve its issues, do the job the blueprint gives it, and still fit the page around it. An optional section flagged as irrelevant or duplicative may be returned as null to drop it.

${COPY_RULES}
- Follow the blueprint's content requirements and constraints exactly.
- Return JSON only.`

/** The page as the reviewer reads it: sections keyed by their blueprint slot. */
function pageView(spec: LandingPageSpec, bp: PageBlueprint) {
  const keys = slotKeys(spec, bp)
  return {
    hero: spec.hero,
    navigation: spec.navigation,
    sections: Object.fromEntries(spec.sections.map((s, i) => [keys[i] ?? `section_${i + 1}`, strip(s)])),
    footer: spec.footer,
  }
}

function strip(section: SectionSpec) {
  const rest: Partial<SectionSpec> = { ...section }
  delete rest.slot
  return rest
}

async function review(
  brief: ProductBrief,
  bp: PageBlueprint,
  spec: LandingPageSpec,
  apiKey?: string,
): Promise<CritiqueIssue[]> {
  const targets = ['hero', 'navigation', 'footer', ...bp.sections.map((s) => s.key)] as [string, ...string[]]
  const schema = z.object({
    issues: z
      .array(
        z.object({
          type: z.enum(ISSUE_TYPES),
          severity: z.enum(['blocking', 'minor']),
          target: z.enum(targets),
          reason: z.string(),
          fix: z.string(),
        }),
      )
      .max(8),
  })
  const { issues } = await generateStructured({
    provider: COMPOSING,
    system: REVIEW_SYSTEM,
    user: `${briefText(brief)}

BLUEPRINT
${blueprintText(bp)}

PAGE
${JSON.stringify(pageView(spec, bp))}`,
    schemaName: 'page_critique',
    jsonSchema: strictJsonSchema(schema),
    validator: schema,
    stage: 'critiquing',
    apiKey,
  })
  return issues
}

/** Rewrites the flagged parts and merges them back, in blueprint order. */
async function repair(
  brief: ProductBrief,
  bp: PageBlueprint,
  spec: LandingPageSpec,
  blocking: CritiqueIssue[],
  apiKey?: string,
): Promise<{ spec: LandingPageSpec; repaired: string[] }> {
  const parts = executionParts(bp)
  const fixed: Record<string, z.ZodType> = { hero: parts.hero, navigation: parts.navigation, footer: parts.footer }
  const targets = [...new Set(blocking.map((i) => i.target))].filter((t) => t in fixed || t in parts.slots)
  if (targets.length === 0) return { spec, repaired: [] }

  const schema = z.object(Object.fromEntries(targets.map((t) => [t, fixed[t] ?? parts.slots[t]])))
  const view = pageView(spec, bp) as Record<string, unknown> & { sections: Record<string, unknown> }
  const current = Object.fromEntries(targets.map((t) => [t, t in fixed ? view[t] : (view.sections[t] ?? null)]))
  const issuesByTarget = targets
    .map((t) => `${t}:\n${blocking.filter((i) => i.target === t).map((i) => `- ${i.reason} Fix: ${i.fix}`).join('\n')}`)
    .join('\n\n')
  const slotTypes = bp.sections.filter((s) => targets.includes(s.key)).map((s) => s.type)

  const patch = (await generateStructured({
    provider: COMPOSING,
    system: REPAIR_SYSTEM,
    user: `${briefText(brief)}

BLUEPRINT
${blueprintText(bp)}
${slotTypes.length ? `\nSECTION FIELDS\n${fieldGuide(slotTypes)}\n` : ''}
THE WHOLE PAGE, FOR CONTEXT
${JSON.stringify(view)}

PARTS TO REWRITE (current versions)
${JSON.stringify(current)}

ISSUES
${issuesByTarget}`,
    schemaName: 'page_repair',
    jsonSchema: strictJsonSchema(schema),
    validator: schema,
    stage: 'critiquing',
    apiKey,
  })) as Record<string, unknown>

  const keys = slotKeys(spec, bp)
  const bySlot = new Map<string, unknown>(spec.sections.map((s, i) => [keys[i] ?? `section_${i + 1}`, s]))
  for (const slot of bp.sections) {
    if (slot.key in patch) bySlot.set(slot.key, patch[slot.key] ? { ...(patch[slot.key] as object), slot: slot.key } : null)
  }

  const next = landingPageSpec.parse({
    theme: spec.theme,
    navigation: 'navigation' in patch ? { ...(patch.navigation as object), sticky: bp.navigation.sticky } : spec.navigation,
    hero: patch.hero ?? spec.hero,
    sections: bp.sections.flatMap((s) => (bySlot.get(s.key) ? [bySlot.get(s.key)] : [])),
    footer: patch.footer ?? spec.footer,
  })
  return { spec: next, repaired: targets }
}

export async function critique(
  brief: ProductBrief,
  bp: PageBlueprint,
  draft: LandingPageSpec,
  opts: { apiKey?: string; review?: boolean } = {},
): Promise<{ spec: LandingPageSpec; critique: CritiqueReport }> {
  const rules = checkBlueprint(draft, bp)

  let reviewer: CritiqueReport['reviewer'] = 'rules'
  let found: CritiqueIssue[] = []
  if (opts.review !== false) {
    try {
      found = await review(brief, bp, draft, opts.apiKey)
      reviewer = 'model'
    } catch (e) {
      console.warn('critique review failed; rules only', e instanceof Error ? e.message : e)
    }
  }

  const issues = [...rules, ...found]
  const blocking = issues.filter((i) => i.severity === 'blocking')
  if (blocking.length === 0) {
    return { spec: draft, critique: { valid: true, issues, remaining: [], repaired: [], reviewer } }
  }

  let spec = draft
  let repaired: string[] = []
  if (opts.review !== false) {
    try {
      ;({ spec, repaired } = await repair(brief, bp, draft, blocking, opts.apiKey))
    } catch (e) {
      console.warn('critique repair failed; keeping draft', e instanceof Error ? e.message : e)
    }
  }

  // Rules are re-run on the result; the reviewer's own issues count as
  // resolved once their target has been rewritten.
  const remaining = [
    ...checkBlueprint(spec, bp).filter((i) => i.severity === 'blocking'),
    ...found.filter((i) => i.severity === 'blocking' && !repaired.includes(i.target)),
  ]
  return { spec, critique: { valid: remaining.length === 0, issues, remaining, repaired, reviewer } }
}
