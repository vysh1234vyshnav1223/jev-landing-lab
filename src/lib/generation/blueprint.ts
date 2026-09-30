import { ARCHETYPES, allowedHeroes, allowedSections } from '@/lib/generation/archetypes'
import type { Execution } from '@/lib/jev/directions'
import type { ProductBrief } from '@/schemas/brief'
import { pageBlueprint, type BlueprintSlot, type CritiqueIssue, type PageBlueprint } from '@/schemas/blueprint'
import {
  PROOF_VARIANTS,
  SECTION_TYPES,
  THEME_DIRECTIONS,
  type LandingPageSpec,
  type ProofVariant,
  type SectionType,
  type ThemeDirection,
} from '@/schemas/spec'
import { CONVERSION_LABELS, type StrategyHypothesis } from '@/schemas/strategy'

/**
 * Stage ④ — Jev's selected strategy + Jev's execution decisions → PageBlueprint.
 *
 * Plain TypeScript; no model participates. This is where the strategy stops
 * being advice and becomes law:
 *
 *   1. The archetype fixes the section vocabulary. Everything outside it is
 *      forbidden and never reaches the composer.
 *   2. Jev's execution answers gate what remains: no pricing section unless
 *      Jev says the offer leads; no prices in copy at all if Jev says price
 *      is absent; hero trust signals only when Jev says trust is the barrier.
 *   3. The brief gates evidence: no comparison without named alternatives.
 *
 * The composer's response schema is then built from the result, so each rule
 * here is enforced by construction rather than by asking nicely.
 */

const NAV_LINKS = [0, 3, 5] as const

function gate(
  type: SectionType,
  brief: ProductBrief,
  execution: Execution,
): string | null {
  if (type === 'pricing' && execution.offerProminence < 2) {
    return execution.offerProminence === 0
      ? 'Jev judged price absent from this decision — no pricing section.'
      : 'Jev judged price secondary — it can be mentioned, but it gets no section of its own.'
  }
  if (type === 'comparison' && brief.competitors.length === 0) {
    return 'The brief names no alternatives, so there is nothing honest to compare against.'
  }
  return null
}

export function buildBlueprint(
  brief: ProductBrief,
  hypothesis: StrategyHypothesis,
  execution: Execution,
): PageBlueprint {
  const archetype = ARCHETYPES[hypothesis.archetype]
  const vocabulary = allowedSections(hypothesis.archetype)

  const forbidden: PageBlueprint['forbidden'] = []
  for (const type of SECTION_TYPES) {
    if (!vocabulary.includes(type)) {
      forbidden.push({ type, reason: `Not part of a ${archetype.label.toLowerCase()} page.` })
      continue
    }
    const reason = gate(type, brief, execution)
    if (reason) forbidden.push({ type, reason })
  }
  const isForbidden = (t: SectionType) => forbidden.some((f) => f.type === t)

  // When Jev's proof form is testimonials, a socialProof section is just a
  // second quote block beside the testimonials section — the same point twice.
  const quotesTwice =
    execution.socialProofType === 'testimonials' &&
    hypothesis.sections.some((s) => s.type === 'testimonials')

  const removed: PageBlueprint['removed'] = []
  const sections: BlueprintSlot[] = []
  const counts = new Map<SectionType, number>()
  for (const s of hypothesis.sections) {
    const reason =
      forbidden.find((f) => f.type === s.type)?.reason ??
      (quotesTwice && s.type === 'socialProof'
        ? 'Jev chose testimonials as the proof form, and the testimonials section already carries them.'
        : undefined)
    if (reason) {
      removed.push({ type: s.type, purpose: s.purpose, reason })
      continue
    }
    const n = (counts.get(s.type) ?? 0) + 1
    if (n > 2) {
      removed.push({ type: s.type, purpose: s.purpose, reason: 'A section type appears at most twice.' })
      continue
    }
    counts.set(s.type, n)
    // Jev says the visitor already understands the category: teaching them
    // is allowed, but no longer required.
    const required = s.essential && !(s.type === 'explainer' && !execution.requiresEducation)
    sections.push({ key: `s${sections.length + 1}_${s.type}`, type: s.type, purpose: s.purpose, required })
  }

  // A page always ends on an ask: a strategy that trails off into an FAQ or
  // a stats row (or that a gate cut short) gets a closing CTA.
  const last = sections.at(-1)?.type
  const endsOnAsk = last === 'cta' || last === 'search'
  if (!endsOnAsk && (counts.get('cta') ?? 0) < 2 && !isForbidden('cta')) {
    sections.push({
      key: `s${sections.length + 1}_cta`,
      type: 'cta',
      purpose: `Close by asking the visitor to ${brief.conversionAction}.`,
      required: true,
    })
  }

  const heroes = allowedHeroes(hypothesis.archetype)
  const heroVariant = heroes.includes(hypothesis.hero.variant) ? hypothesis.hero.variant : heroes[0]
  const proofType: ProofVariant = (PROOF_VARIANTS as readonly string[]).includes(execution.socialProofType)
    ? (execution.socialProofType as ProofVariant)
    : 'testimonials'
  const direction: ThemeDirection = (THEME_DIRECTIONS as readonly string[]).includes(execution.visualDirection)
    ? (execution.visualDirection as ThemeDirection)
    : 'clean_utility'
  const navLevel = Math.min(2, Math.max(0, Math.round(execution.navigationComplexity)))
  const prominence = Math.min(2, Math.max(0, Math.round(execution.offerProminence)))
  const pricesAllowed = prominence >= 1

  const contentRequirements = [
    'Every section does the job its purpose names, in the order given. Do not repurpose a section.',
    `The primary CTA asks the visitor to ${brief.conversionAction} — ${CONVERSION_LABELS[hypothesis.conversion.approach].toLowerCase()}.`,
    `Frame the visitor as: ${hypothesis.audienceFraming}.`,
    execution.trustIsPrimaryBarrier
      ? 'Trust is the main barrier: the hero carries 2-4 concrete, checkable trust signals.'
      : 'Trust is not the barrier: no trust-signal chips in the hero.',
    prominence === 2
      ? 'Price is a leading argument: make the offer explicit.'
      : prominence === 1
        ? 'Price is secondary: mention it only where a visitor would look for it.'
        : 'Price is not part of this decision: state no price, fee, discount or plan anywhere.',
  ]

  const constraints = [
    'No performance percentages, multipliers or benchmark results unless the brief states them.',
    'No awards, certifications, press mentions or rankings unless the brief states them.',
    'Never name real, well-known companies as customers, partners or integrations unless the brief does; plausible illustrative names are fine.',
    'Testimonials, reviewer names and sample items are illustrative: keep them ordinary and plausible, never superlative.',
    'Say nothing that belongs to a different kind of business than this one.',
  ]

  return pageBlueprint.parse({
    strategyId: hypothesis.id,
    strategyName: hypothesis.name,
    archetype: hypothesis.archetype,
    strategicGoal: `Get ${brief.audience} to ${brief.conversionAction}.`,
    thesis: hypothesis.thesis,
    persuasion: hypothesis.persuasion,
    audienceFraming: hypothesis.audienceFraming,
    narrative: hypothesis.narrative,
    hero: { variant: heroVariant, purpose: hypothesis.hero.purpose, trustSignals: execution.trustIsPrimaryBarrier },
    sections,
    forbidden,
    removed,
    visual: { direction },
    conversion: {
      approach: hypothesis.conversion.approach,
      action: brief.conversionAction,
      rationale: hypothesis.conversion.rationale,
    },
    proof: { type: proofType },
    navigation: { maxLinks: NAV_LINKS[navLevel], sticky: navLevel > 0 },
    offer: { prominence, pricesAllowed },
    contentRequirements,
    constraints,
  })
}

/* ------------------------------------------------------------------ */
/* Rule checks — the deterministic half of the critique                */
/* ------------------------------------------------------------------ */

/** A currency amount, or a number with a billing period. */
const PRICE = /(?:[$€£₹¥]|\b(?:USD|EUR|GBP|INR|Rs\.?)\s?)\s?\d|\b\d[\d,.]*\s?(?:\/\s?(?:mo|month|yr|year|night)\b|per (?:month|year|night|user|seat)\b)/i

function strings(value: unknown): string[] {
  if (typeof value === 'string') return [value]
  if (Array.isArray(value)) return value.flatMap(strings)
  if (value && typeof value === 'object') return Object.values(value).flatMap(strings)
  return []
}

function issue(
  type: CritiqueIssue['type'],
  target: string,
  reason: string,
  fix: string,
  severity: CritiqueIssue['severity'] = 'blocking',
): CritiqueIssue {
  return { type, severity, target, reason, fix }
}

/**
 * Pairs each rendered section with its blueprint slot: by the `slot` key the
 * composer path stamps, or — for specs made elsewhere — the next unused slot
 * of the same type.
 */
export function slotKeys(spec: LandingPageSpec, bp: PageBlueprint): (string | null)[] {
  let cursor = 0
  return spec.sections.map((section) => {
    const byKey = section.slot ? bp.sections.findIndex((s) => s.key === section.slot) : -1
    const index =
      byKey >= 0 ? byKey : bp.sections.findIndex((s, i) => i >= cursor && s.type === section.type)
    if (index < 0) return null
    cursor = index + 1
    return bp.sections[index].key
  })
}

/**
 * Everything about a page that can be checked without judgment. The composer
 * schema already makes most of these impossible; this is the proof, and the
 * guard for any spec that did not come through the composer.
 */
export function checkBlueprint(spec: LandingPageSpec, bp: PageBlueprint): CritiqueIssue[] {
  const issues: CritiqueIssue[] = []
  const keys = slotKeys(spec, bp)

  if (spec.hero.variant !== bp.hero.variant) {
    issues.push(issue('off_blueprint', 'hero', `Hero is ${spec.hero.variant}; the blueprint fixes ${bp.hero.variant}.`, `Use the ${bp.hero.variant} hero.`))
  }
  if (spec.theme.direction !== bp.visual.direction) {
    issues.push(issue('off_blueprint', 'page', `Theme is ${spec.theme.direction}; Jev chose ${bp.visual.direction}.`, `Use ${bp.visual.direction}.`))
  }
  if (spec.navigation.links.length > bp.navigation.maxLinks) {
    issues.push(issue('off_blueprint', 'navigation', `${spec.navigation.links.length} nav links; at most ${bp.navigation.maxLinks}.`, 'Cut navigation links.'))
  }
  if (bp.hero.trustSignals && spec.hero.trustSignals.length === 0) {
    issues.push(issue('off_blueprint', 'hero', 'Jev flagged trust as the barrier, but the hero has no trust signals.', 'Add 2-4 concrete trust signals.'))
  }
  if (!bp.hero.trustSignals && spec.hero.trustSignals.length > 0) {
    issues.push(issue('off_blueprint', 'hero', 'Trust signals present though trust is not the barrier.', 'Remove the trust chips.', 'minor'))
  }

  const forbidden = new Set(bp.forbidden.map((f) => f.type))
  spec.sections.forEach((section, i) => {
    const target = keys[i] ?? `section ${i + 1}`
    if (forbidden.has(section.type)) {
      const reason = bp.forbidden.find((f) => f.type === section.type)?.reason ?? ''
      issues.push(issue('off_blueprint', target, `"${section.type}" is forbidden by the blueprint. ${reason}`, 'Remove it.'))
    } else if (keys[i] === null) {
      issues.push(issue('off_blueprint', target, `"${section.type}" is not in the blueprint, or is out of order.`, 'Remove it.'))
    }
    if (section.type === 'socialProof' && section.variant !== bp.proof.type) {
      issues.push(issue('off_blueprint', target, `Social proof is ${section.variant}; Jev chose ${bp.proof.type}.`, `Use ${bp.proof.type}.`))
    }
  })
  for (const slot of bp.sections) {
    if (slot.required && !keys.includes(slot.key)) {
      issues.push(issue('off_blueprint', slot.key, `Required ${slot.type} section is missing.`, `Add it: ${slot.purpose}`))
    }
  }

  if (!bp.offer.pricesAllowed) {
    const parts: [string, unknown][] = [
      ['hero', spec.hero],
      ['navigation', spec.navigation],
      ['footer', spec.footer],
      ...spec.sections.map((s, i): [string, unknown] => [keys[i] ?? `section ${i + 1}`, s]),
    ]
    for (const [target, value] of parts) {
      const hit = strings(value).find((text) => PRICE.test(text))
      if (hit) {
        issues.push(
          issue('unsupported_claim', target, `States a price ("${hit.slice(0, 60)}") though Jev judged price absent from this decision.`, 'Remove every price, fee and discount figure.'),
        )
      }
    }
  }

  return issues
}
