import sports from './sports.json'
import saas from './saas.json'
import hotel from './hotel.json'
import api from './api.json'
import subscription from './subscription.json'
import skincare from './skincare.json'
import type { CritiqueReport, PageBlueprint } from '@/schemas/blueprint'
import type { ProductBrief } from '@/schemas/brief'
import type { DecisionSet } from '@/schemas/decisions'
import type { LandingPageSpec } from '@/schemas/spec'
import type { StrategyHypothesis, StrategyJudgment } from '@/schemas/strategy'

/**
 * Six real runs of the actual pipeline, captured once and frozen — not
 * synthetic fixtures. Real candidate strategies, real Jev judgment, real
 * blueprints, real generated and critiqued pages. Served statically so the
 * examples page needs no API key and costs nothing per visitor.
 *
 * Regenerate with `npx tsx --env-file=.env.local scripts/capture-examples.mts`
 * (see that file) if the questions, archetypes, schemas or these briefs change.
 */
export type CapturedExample = {
  id: string
  label: string
  brief: string
  result: {
    brief: ProductBrief
    hypotheses: StrategyHypothesis[]
    decisions: DecisionSet
    judgment: StrategyJudgment
    blueprint: PageBlueprint
    spec: LandingPageSpec
    critique: CritiqueReport
  }
}

export const CAPTURED_EXAMPLES = [sports, saas, hotel, api, subscription, skincare] as unknown as CapturedExample[]
