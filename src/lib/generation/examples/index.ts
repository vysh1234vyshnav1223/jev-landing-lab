import travel from './travel.json'
import saas from './saas.json'
import skincare from './skincare.json'
import type { ProductBrief } from '@/schemas/brief'
import type { DecisionSet } from '@/schemas/decisions'
import type { LandingPageSpec } from '@/schemas/spec'

/**
 * Three real runs of the actual pipeline, captured once and frozen — not
 * synthetic fixtures. Real Jev decisions (real cost, ~$0.00007 each), real
 * generated copy. Served statically so the examples page needs no API key
 * and costs nothing per visitor, however many people look at it.
 *
 * Regenerate with `npx tsx --env-file=.env.local scripts/capture-examples.mts`
 * (see that file) if `QUESTIONS`, the spec schema, or these briefs change.
 */
export type CapturedExample = {
  id: string
  label: string
  brief: string
  result: {
    brief: ProductBrief
    decisions: DecisionSet
    spec: LandingPageSpec
  }
}

export const CAPTURED_EXAMPLES = [travel, saas, skincare] as unknown as CapturedExample[]
