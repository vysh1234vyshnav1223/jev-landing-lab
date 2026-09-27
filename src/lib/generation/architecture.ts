import type { Strategy } from '@/lib/jev/directions'
import type { SectionType } from '@/schemas/spec'

/**
 * Jev's strategy → page structure. Deterministic; no model involved.
 *
 * This is the second half of the causal chain. `directions.ts` resolves what
 * Jev decided; this decides what that MEANS for the page — which sections
 * exist and in what order. The generative model is handed the result and only
 * fills in words.
 */

const SECTION_BUDGET: Record<string, number> = {
  focused: 4,
  standard: 6,
  comprehensive: 8,
}

/** Accent colour follows the visual register Jev chose. */
const ACCENT_BY_DIRECTION: Record<string, 'blue' | 'emerald' | 'amber' | 'violet' | 'rose' | 'slate'> = {
  clean_utility: 'blue',
  warm_editorial: 'amber',
  bold_confident: 'violet',
  technical_precise: 'slate',
}

export function accentFor(strategy: Strategy) {
  // A price-led pitch reads better in a value colour than a premium one.
  if (strategy.audienceIsPriceSensitive && strategy.offerProminence >= 2) return 'emerald'
  return ACCENT_BY_DIRECTION[strategy.visualDirection] ?? 'blue'
}

export function navLinkCount(strategy: Strategy): number {
  return [1, 3, 5][strategy.navigationComplexity] ?? 3
}

/**
 * The ordered section list for a direction.
 *
 * Read this next to `questions.ts` and the whole system is legible: every
 * branch below names the Jev decision that drives it.
 */
export function planSections(strategy: Strategy): SectionType[] {
  const sections: SectionType[] = []

  // heroStrategy — a search-first hero puts the tool above the fold, so the
  // full search block moves down; any other hero needs it early to convert.
  const wantsSearchBlock =
    strategy.heroStrategy !== 'search_first' && strategy.interactionDensity >= 2

  // requiresEducation — teach before pitching.
  if (strategy.requiresEducation) sections.push('explainer')

  // trustIsPrimaryBarrier — proof rises above the fold-adjacent slot.
  if (strategy.trustIsPrimaryBarrier) sections.push('socialProof')

  // contentHierarchy — what leads the body of the page.
  if (strategy.contentHierarchy === 'utility') {
    if (wantsSearchBlock) sections.push('search')
    sections.push('featureGrid')
  } else if (strategy.contentHierarchy === 'discovery') {
    sections.push('showcase')
    if (wantsSearchBlock) sections.push('search')
  } else {
    sections.push('featureGrid')
    if (!strategy.trustIsPrimaryBarrier) sections.push('socialProof')
  }

  // offerProminence — only 2 ("leading") earns a dedicated pricing section.
  // 1 ("secondary") means price shows up somewhere quiet instead — a line in
  // the hero or a feature bullet, via compose.ts's prompt — not a whole
  // section built for it; 0 omits price entirely. A boutique, a tutor
  // booking or a record shop got the exact same subscription-tier section as
  // a SaaS page before this distinction existed.
  if (strategy.offerProminence >= 2) sections.push('pricing')

  // socialProofType — metrics read better as a stats band than a proof block.
  if (strategy.socialProofType === 'metrics') sections.push('stats')

  if (!sections.includes('socialProof') && strategy.socialProofType !== 'metrics') {
    sections.push('socialProof')
  }

  // pageArchitecture — only a comprehensive page earns comparison + FAQ.
  if (strategy.pageArchitecture === 'comprehensive') {
    sections.push('comparison')
    sections.push('faq')
  } else if (strategy.pageArchitecture === 'standard') {
    sections.push('testimonials')
  }

  // Dedupe, then trim to the budget pageArchitecture allows, always keeping
  // the closing CTA.
  const unique = [...new Set(sections)]
  const budget = SECTION_BUDGET[strategy.pageArchitecture] ?? 6
  return [...unique.slice(0, budget), 'cta']
}
