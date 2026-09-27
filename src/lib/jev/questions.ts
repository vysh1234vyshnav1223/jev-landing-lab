/**
 * The decision surface handed to Jev.
 *
 * Every question here is atomic and narrowly scoped — TypeSafe's guidance is to
 * decompose multi-factor judgements into separate questions and recombine them
 * with ordinary code, which is exactly what `directions.ts` does.
 *
 * All of these travel in ONE request. Jev evaluates them in parallel with no
 * latency penalty, so there is no reason to split them up.
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
  heroStrategy: {
    type: 'choice',
    instructions:
      'Which hero strategy will best move a first-time visitor toward the primary conversion action?',
    criteria: {
      search_first:
        'Visitors already know what they want; putting the core tool or search directly in the hero beats persuasion',
      value_prop:
        'The product needs to be explained before anyone will act; a clear headline and benefit statement lead',
      social_proof:
        'Credibility is the main thing standing between the visitor and the action; lead with proof others trust it',
      product_demo:
        'Seeing the product work is the most convincing argument; lead with a visual or interactive demonstration',
    },
  },
  ctaStrategy: {
    type: 'choice',
    instructions:
      'What should the primary call to action ask the visitor to do?',
    criteria: {
      direct_action:
        'Ask for the core conversion action immediately — the visitor is ready',
      free_trial:
        'Ask for a low-commitment trial or free tier before asking for money',
      explore:
        'Ask the visitor to browse or discover first; the decision needs more input',
      contact:
        'Ask the visitor to talk to a person; the purchase is considered, high-value or bespoke',
    },
  },
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
  contentHierarchy: {
    type: 'choice',
    instructions:
      'What should the page lead with after the hero, given how this audience makes decisions?',
    criteria: {
      utility:
        'Lead with what the product does and how to use it — function over feeling',
      discovery:
        'Lead with browsing, inspiration and options — the visitor is still choosing',
      persuasion:
        'Lead with benefits, proof and objection handling — the visitor needs convincing',
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
  pageArchitecture: {
    type: 'choice',
    instructions:
      'How much page does this product need to make its case?',
    criteria: {
      focused:
        'A short page — hero, proof, one CTA. More would dilute a simple decision',
      standard:
        'A conventional mid-length page covering features, proof and pricing',
      comprehensive:
        'A long page — the decision is complex and needs features, comparison, FAQ and objection handling',
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
  interactionDensity: {
    type: 'score',
    instructions:
      'How interactive should this page be for this audience and product?',
    criteria: [
      'Static and editorial — reading, not operating; interaction would be noise',
      'Some interactive affordances — tabs, toggles, a few controls that aid the decision',
      'Heavily interactive — the page should behave like the product itself',
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
  audienceIsPriceSensitive: {
    type: 'noul',
    instructions: 'Is this audience primarily motivated by price?',
    criteria: {
      true: 'The audience compares on cost, seeks deals or discounts, or has a constrained budget',
      false:
        'The audience buys on quality, capability, convenience or status rather than price',
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
