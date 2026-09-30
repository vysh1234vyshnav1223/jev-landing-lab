import type { HeroVariant, SectionType } from '@/schemas/spec'

/**
 * Page archetypes — what KIND of page a strategy builds, and the section
 * vocabulary that kind of page is allowed to use.
 *
 * This table is the first line of enforcement. A strategy may only propose
 * sections from its archetype's list (validated at the hypothesis stage), the
 * blueprint forbids everything else, and the composer's response schema is
 * built from what's left — so a retail catalogue cannot grow a SaaS pricing
 * table no matter what the composing model would like to write.
 *
 * Lists are deliberately short. Adding a section type to an archetype is a
 * product decision: it means "pages of this kind can legitimately need this".
 */

type Archetype = {
  label: string
  /** Handed to the hypothesizer and to Jev; what makes a page this kind. */
  description: string
  sections: readonly SectionType[]
  heroes: readonly HeroVariant[]
}

export const ARCHETYPES = {
  commerce_catalog: {
    label: 'Retail catalogue',
    description:
      'A shop selling a range of physical products. The visitor is choosing what to buy, not whether to buy software.',
    sections: ['showcase', 'useCases', 'featureGrid', 'story', 'testimonials', 'socialProof', 'search', 'faq', 'cta'],
    heroes: ['value_prop', 'social_proof', 'search_first'],
  },
  brand_product: {
    label: 'Product brand',
    description:
      'A brand selling one product or a small range direct to consumers. The visitor is deciding whether to trust it enough to try it.',
    sections: ['story', 'featureGrid', 'showcase', 'explainer', 'comparison', 'testimonials', 'socialProof', 'stats', 'faq', 'cta'],
    heroes: ['value_prop', 'social_proof', 'product_demo'],
  },
  consumer_subscription: {
    label: 'Consumer subscription',
    description:
      'A recurring consumer service or app. The visitor is deciding whether it is worth signing up and paying for every month.',
    sections: ['story', 'featureGrid', 'explainer', 'showcase', 'useCases', 'pricing', 'comparison', 'testimonials', 'socialProof', 'stats', 'faq', 'cta'],
    heroes: ['value_prop', 'social_proof', 'product_demo'],
  },
  saas_product: {
    label: 'B2B software',
    description:
      'Software sold to teams or businesses. The buyer is judging whether it solves their problem better than what they do today.',
    sections: ['story', 'featureGrid', 'explainer', 'useCases', 'integrations', 'socialProof', 'testimonials', 'stats', 'comparison', 'pricing', 'faq', 'cta'],
    heroes: ['value_prop', 'product_demo', 'social_proof'],
  },
  developer_platform: {
    label: 'Developer platform',
    description:
      'An API, SDK, CLI or infrastructure product. The visitor is an engineer who judges it by how it works and how fast they can try it.',
    sections: ['codeSample', 'featureGrid', 'explainer', 'integrations', 'useCases', 'stats', 'socialProof', 'testimonials', 'comparison', 'pricing', 'faq', 'cta'],
    heroes: ['product_demo', 'value_prop'],
  },
  hospitality_experience: {
    label: 'Hospitality & experiences',
    description:
      'A hotel, venue, restaurant, tour or place. The visitor is imagining being there and deciding whether to book.',
    sections: ['story', 'showcase', 'featureGrid', 'search', 'testimonials', 'socialProof', 'faq', 'cta'],
    heroes: ['value_prop', 'search_first', 'social_proof'],
  },
  marketplace_search: {
    label: 'Search marketplace',
    description:
      'A marketplace or booking engine across many providers. The visitor arrives with intent and wants to search right away.',
    sections: ['search', 'showcase', 'featureGrid', 'explainer', 'comparison', 'socialProof', 'testimonials', 'stats', 'faq', 'cta'],
    heroes: ['search_first', 'value_prop'],
  },
  service_consultative: {
    label: 'Considered service',
    description:
      'A service sold through a conversation: education, agencies, clinics, advisors. The visitor needs confidence before talking to a person.',
    sections: ['story', 'explainer', 'showcase', 'featureGrid', 'testimonials', 'socialProof', 'stats', 'pricing', 'comparison', 'faq', 'cta'],
    heroes: ['value_prop', 'social_proof'],
  },
} as const satisfies Record<string, Archetype>

export type ArchetypeId = keyof typeof ARCHETYPES

export const ARCHETYPE_IDS = Object.keys(ARCHETYPES) as [ArchetypeId, ...ArchetypeId[]]

export function allowedSections(id: ArchetypeId): readonly SectionType[] {
  return ARCHETYPES[id].sections
}

export function allowedHeroes(id: ArchetypeId): readonly HeroVariant[] {
  return ARCHETYPES[id].heroes
}
