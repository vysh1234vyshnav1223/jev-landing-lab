import { z } from 'zod'
import { ARCHETYPE_IDS } from '@/lib/generation/archetypes'
import { CONVERSION_APPROACHES } from '@/schemas/strategy'
import { HERO_VARIANTS, PROOF_VARIANTS, SECTION_TYPES, THEME_DIRECTIONS } from '@/schemas/spec'

/**
 * The PageBlueprint — Jev's selected strategy, turned by code into a strict
 * specification the composer must execute.
 *
 * Built deterministically in `lib/generation/blueprint.ts`; no model writes
 * this. Everything here is binding: the composer's response schema is derived
 * from `sections`, `hero.variant`, `visual.direction` and `proof.type`, so it
 * cannot reorder, add, or swap any of them.
 */

export const blueprintSlot = z.object({
  /** Stable key, used as the property name in the composer's schema. */
  key: z.string(),
  type: z.enum(SECTION_TYPES),
  /** What this section must accomplish — the strategy's words, not copy. */
  purpose: z.string(),
  /** Required slots must be filled; the composer may leave an optional one out. */
  required: z.boolean(),
})

export const pageBlueprint = z.object({
  strategyId: z.string(),
  strategyName: z.string(),
  archetype: z.enum(ARCHETYPE_IDS),
  /** What the page is for, in one line. */
  strategicGoal: z.string(),
  thesis: z.string(),
  persuasion: z.string(),
  audienceFraming: z.string(),
  narrative: z.array(z.string()),
  hero: z.object({
    variant: z.enum(HERO_VARIANTS),
    purpose: z.string(),
    /** Jev said trust is the barrier → the hero must carry trust signals. */
    trustSignals: z.boolean(),
  }),
  /** Section order is array order. */
  sections: z.array(blueprintSlot).min(1),
  /** Section types the composer is never offered, and why. */
  forbidden: z.array(z.object({ type: z.enum(SECTION_TYPES), reason: z.string() })),
  /** Sections the strategy asked for that a gate removed, and why. */
  removed: z.array(z.object({ type: z.enum(SECTION_TYPES), purpose: z.string(), reason: z.string() })),
  visual: z.object({ direction: z.enum(THEME_DIRECTIONS) }),
  conversion: z.object({
    approach: z.enum(CONVERSION_APPROACHES),
    action: z.string(),
    rationale: z.string(),
  }),
  proof: z.object({ type: z.enum(PROOF_VARIANTS) }),
  navigation: z.object({ maxLinks: z.number().int().min(0), sticky: z.boolean() }),
  offer: z.object({
    /** Jev's offerProminence: 0 absent, 1 secondary, 2 leading. */
    prominence: z.number().int().min(0).max(2),
    pricesAllowed: z.boolean(),
  }),
  /** What the copy must do. */
  contentRequirements: z.array(z.string()),
  /** What the copy must never do — evidence rules the critic checks. */
  constraints: z.array(z.string()),
})

export type PageBlueprint = z.infer<typeof pageBlueprint>
export type BlueprintSlot = z.infer<typeof blueprintSlot>

/* ------------------------------------------------------------------ */
/* Critique                                                            */
/* ------------------------------------------------------------------ */

export const ISSUE_TYPES = [
  'off_blueprint',
  'irrelevant_section',
  'duplication',
  'unsupported_claim',
  'narrative_break',
  'conversion_misalignment',
] as const

export const critiqueIssue = z.object({
  type: z.enum(ISSUE_TYPES),
  /** Blocking issues trigger a targeted repair; minor ones are reported only. */
  severity: z.enum(['blocking', 'minor']),
  /** "hero", "navigation", "footer", or a blueprint slot key. */
  target: z.string(),
  reason: z.string(),
  /** What a repair should change. */
  fix: z.string(),
})

export type CritiqueIssue = z.infer<typeof critiqueIssue>

export type CritiqueReport = {
  /** True when no blocking issue survives (after repair, if one ran). */
  valid: boolean
  /** Everything found on the composed draft, rules and reviewer combined. */
  issues: CritiqueIssue[]
  /** Blocking issues still present after repair. */
  remaining: CritiqueIssue[]
  /** Targets rewritten by the repair pass. Empty if none ran. */
  repaired: string[]
  /** 'rules' alone when the model review was skipped or failed. */
  reviewer: 'model' | 'rules'
}
