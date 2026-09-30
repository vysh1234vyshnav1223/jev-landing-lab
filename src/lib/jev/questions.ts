/**
 * Jev's execution questions — the fixed half of the decision surface.
 *
 * The strategic half (WHICH page to build) is generated per run from the
 * candidate strategies; see `strategies.ts`. These questions refine how the
 * chosen strategy is executed, and several of them are gates: the blueprint
 * reads `offerProminence` to decide whether a pricing section may exist at
 * all, `trustIsPrimaryBarrier` to require hero trust signals, and so on.
 *
 * Every question is atomic and narrowly scoped — TypeSafe's guidance is to
 * decompose multi-factor judgements into separate questions and recombine them
 * with ordinary code. Both halves travel in ONE request.
 */

export type ChoiceQuestion = {
  type: 'choice'
  instructions: string
  criteria: Record<string, string>
}

export type NoulQuestion = {
  type: 'noul'
  instructions: string
  criteria: { true: string; false: string }
}

export type ScoreQuestion = {
  type: 'score'
  instructions: string
  /** Ordered low → high. Index position is the score. */
  criteria: string[]
}

export type JevQuestion = ChoiceQuestion | NoulQuestion | ScoreQuestion

export const QUESTIONS = {
  socialProofType: {
    type: 'choice',
    instructions:
      'Which form of social proof will carry the most weight with this audience?',
    criteria: {
      customer_logos:
        'Recognisable company names; the audience is professional and judges by peers',
      testimonials:
        'Named individual quotes; the audience responds to human stories',
      metrics:
        'Hard numbers — users, volume, ratings; the audience responds to scale',
      ratings_reviews:
        'Aggregate star ratings and review counts; consumer purchase with many alternatives',
    },
  },
  visualDirection: {
    type: 'choice',
    instructions:
      'Which visual register best matches this brand and audience?',
    criteria: {
      clean_utility:
        'Neutral, dense, efficient — reads as a reliable tool',
      warm_editorial:
        'Generous spacing, imagery-led, magazine-like — reads as inviting and considered',
      bold_confident:
        'High contrast, strong type, saturated accent — reads as decisive and modern',
      technical_precise:
        'Monospace accents, fine borders, restrained palette — reads as built for experts',
    },
  },
  navigationComplexity: {
    type: 'score',
    instructions:
      'How much navigation does this page need for the visitor to feel oriented without being distracted from the primary action?',
    criteria: [
      'Almost none — a wordmark and a single action; anything more competes with conversion',
      'Moderate — a few destinations plus the primary action',
      'Full — multiple sections and categories; the visitor genuinely needs to navigate',
    ],
  },
  offerProminence: {
    type: 'score',
    instructions:
      'How prominent should price, offers or commercial terms be on this page?',
    criteria: [
      'Absent — price is not how this decision is made, or is not public',
      'Present but secondary — available for those who look, not leading',
      'Leading — price or offer is the strongest argument and belongs high on the page',
    ],
  },
  trustIsPrimaryBarrier: {
    type: 'noul',
    instructions:
      'Is trust or credibility the main thing preventing this audience from converting?',
    criteria: {
      true: 'The audience is sceptical, the category has known bad actors, money or sensitive data is at stake, or the brand is unknown',
      false:
        'The audience already trusts the category; the barrier is price, effort, awareness or fit rather than credibility',
    },
  },
  requiresEducation: {
    type: 'noul',
    instructions:
      'Does the visitor need to be taught something before the offer makes sense?',
    criteria: {
      true: 'The category is new or unfamiliar, the mechanism is non-obvious, or the visitor may not know they have the problem',
      false:
        'The visitor already understands the category and is comparing options within it',
    },
  },
} as const satisfies Record<string, JevQuestion>

export type QuestionId = keyof typeof QUESTIONS

/** Narrow helper: the literal option keys of a given choice question. */
export type OptionsOf<K extends QuestionId> =
  (typeof QUESTIONS)[K] extends { type: 'choice'; criteria: infer C }
    ? Extract<keyof C, string>
    : never

export const QUESTION_IDS = Object.keys(QUESTIONS) as QuestionId[]

/** Short display names for the inspector, compare view and examples page. */
export const QUESTION_TITLES: Record<string, string> = {
  socialProofType: 'Social proof',
  visualDirection: 'Visual direction',
  navigationComplexity: 'Navigation',
  offerProminence: 'Offer prominence',
  trustIsPrimaryBarrier: 'Trust is the barrier',
  requiresEducation: 'Needs education',
}
