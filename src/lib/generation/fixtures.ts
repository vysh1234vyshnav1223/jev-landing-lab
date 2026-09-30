import type { z } from 'zod'
import { withIds } from '@/lib/generation/hypothesize'
import type { PageBlueprint } from '@/schemas/blueprint'
import type { ProductBrief } from '@/schemas/brief'
import type { ConversionApproach, StrategyHypothesis } from '@/schemas/strategy'
import {
  landingPageSpec,
  type LandingPageSpec,
  type ProofVariant,
  sectionSpec,
  type SectionType,
} from '@/schemas/spec'

/**
 * Offline fixtures (USE_FIXTURES=1).
 *
 * Canned strategies and copy for one product (Wayfare). Everything downstream
 * of them is real: Jev's fixture answers are judged by the same code, the
 * blueprint is built by the same code, and the fixture page follows that
 * blueprint's sections, order, hero and gates exactly. Free models allow 50
 * requests/day; UI iteration should not spend them.
 */

export function fixtureBrief(): ProductBrief {
  return {
    productName: 'Wayfare',
    industry: 'travel',
    product:
      'A flight and hotel booking platform focused on low fares for domestic Indian routes.',
    audience: 'Budget-conscious Indian travellers booking domestic trips',
    primaryGoal: 'Get visitors to run a flight search',
    secondaryGoals: ['Sign up for fare alerts', 'Download the mobile app'],
    brandAttributes: ['trustworthy', 'fast', 'affordable', 'modern'],
    conversionAction: 'search for flights',
    geography: 'India',
    competitors: ['MakeMyTrip', 'Goibibo', 'Cleartrip'],
    priceContext: 'Competes on lowest visible fare; no booking fee',
  }
}

/** Three genuinely different arguments for the same product. */
export function fixtureHypotheses(): StrategyHypothesis[] {
  return withIds([
    {
      name: 'Search first, prove it after',
      archetype: 'marketplace_search',
      thesis: 'Visitors arrive ready to search; get them searching, then justify the fare with proof.',
      persuasion: 'Utility first, transparency as reassurance',
      audienceFraming: 'A traveller with a route in mind who wants the lowest real fare',
      narrative: ['Search now', 'See what routes cost this month', 'Why our fare is the real fare', 'Others trust it', 'Search'],
      hero: { variant: 'search_first', purpose: 'Put the flight search above the fold' },
      conversion: { approach: 'direct_action', rationale: 'Intent is already high; any detour costs searches.' },
      sections: [
        { type: 'showcase', purpose: 'Show real routes and fares this month', essential: true },
        { type: 'comparison', purpose: 'Prove no booking fee against typical booking sites', essential: true },
        { type: 'socialProof', purpose: 'Show that millions of trips were booked', essential: true },
        { type: 'faq', purpose: 'Answer fee and cancellation doubts', essential: false },
        { type: 'cta', purpose: 'Send them back to search', essential: true },
      ],
    },
    {
      name: 'The fare transparency argument',
      archetype: 'marketplace_search',
      thesis: 'Travellers have been burned by checkout surprises; lead with why this fare is the fare.',
      persuasion: 'Risk reversal through radical transparency',
      audienceFraming: 'A sceptical traveller who has been hit by hidden fees before',
      narrative: ['Name the hidden-fee problem', 'Show how pricing works here', 'Compare side by side', 'Stories from travellers', 'Search'],
      hero: { variant: 'value_prop', purpose: 'State the no-fee promise plainly' },
      conversion: { approach: 'direct_action', rationale: 'Once trust is established, the search is the natural next step.' },
      sections: [
        { type: 'explainer', purpose: 'Explain how fares are sourced and shown', essential: true },
        { type: 'comparison', purpose: 'Line up total cost against typical booking sites', essential: true },
        { type: 'testimonials', purpose: 'Travellers who saved on a real route', essential: true },
        { type: 'search', purpose: 'Let the convinced visitor search', essential: true },
        { type: 'cta', purpose: 'Close with the promise', essential: false },
      ],
    },
    {
      name: 'Deal discovery',
      archetype: 'marketplace_search',
      thesis: 'Many visitors are flexible; inspire a trip with the cheapest routes this month.',
      persuasion: 'Desire through concrete, cheap options',
      audienceFraming: 'A flexible traveller browsing for where to go next',
      narrative: ['Where could you go', 'Routes worth booking', 'What makes the price low', 'Scale', 'Search a route'],
      hero: { variant: 'value_prop', purpose: 'Invite browsing by price' },
      conversion: { approach: 'explore', rationale: 'Flexible travellers decide after browsing.' },
      sections: [
        { type: 'showcase', purpose: 'Carousel of the cheapest routes this month', essential: true },
        { type: 'featureGrid', purpose: 'Fare alerts, flexible dates, free cancellation', essential: true },
        { type: 'stats', purpose: 'Scale of fares compared', essential: false },
        { type: 'search', purpose: 'Search once a route appeals', essential: true },
        { type: 'cta', purpose: 'Set a fare alert', essential: true },
      ],
    },
  ])
}

const HEADLINES = [
  'Every fare, one search',
  'Find where to go next',
  'Tell us the trip. We price it.',
]

const SUBHEADS = [
  'Compare 40+ airlines on domestic routes. No booking fee, no surprises at checkout.',
  'Browse routes by what they actually cost this month, then book the one that fits.',
  'Describe your trip in a sentence and we build the itinerary around your budget.',
]

const SEARCH_FIELDS = [
  { label: 'From', placeholder: 'Delhi (DEL)', kind: 'text' as const, options: [] },
  { label: 'To', placeholder: 'Mumbai (BOM)', kind: 'text' as const, options: [] },
  { label: 'Departure', placeholder: 'Add date', kind: 'date' as const, options: [] },
  { label: 'Travellers', placeholder: '1 adult', kind: 'counter' as const, options: [] },
]

const PROOF: Record<ProofVariant, object> = {
  ratings_reviews: {
    variant: 'ratings_reviews',
    rating: { score: '4.6', count: '61,400 reviews', source: 'Google Play' },
  },
  metrics: {
    variant: 'metrics',
    metrics: [
      { value: '2.8M', label: 'Trips booked' },
      { value: '40+', label: 'Airlines compared' },
      { value: '0', label: 'Booking fees' },
    ],
  },
  testimonials: {
    variant: 'testimonials',
    quotes: [
      { quote: 'The fare on the search page was the fare I paid.', name: 'Ananya R.', role: 'Bengaluru' },
      { quote: 'Moved my trip by a day and saved 3,200 rupees.', name: 'Karthik M.', role: 'Chennai' },
    ],
  },
  customer_logos: {
    variant: 'customer_logos',
    logos: ['Northwind Travel Desk', 'Ashoka Offsites', 'Monsoon Events', 'Paper Plane Co.'],
  },
}

function section(type: SectionType, proof: ProofVariant = 'ratings_reviews'): z.input<typeof sectionSpec> {
  switch (type) {
    case 'search':
      return {
        type: 'search',
        heading: 'Search domestic flights',
        subheading: 'Live fares from 40+ airlines',
        tabs: ['Flights', 'Hotels', 'Trains'],
        fields: SEARCH_FIELDS,
        submitLabel: 'Search flights',
      }
    case 'featureGrid':
      return {
        type: 'featureGrid',
        heading: 'Built for the way you actually book',
        subheading: null,
        items: [
          {
            icon: 'wallet',
            title: 'No booking fee',
            body: 'The fare you see is the fare you pay. We make nothing on the ticket itself.',
          },
          {
            icon: 'bell',
            title: 'Fare alerts',
            body: 'Watch a route and we tell you the day it drops below your number.',
          },
          {
            icon: 'calendar-range',
            title: 'Flexible dates',
            body: 'See a whole month at a glance and move your trip to the cheapest day.',
          },
          {
            icon: 'shield-check',
            title: 'Free cancellation',
            body: 'Cancel within 24 hours of booking on most domestic fares.',
          },
        ],
      }
    case 'socialProof':
      return {
        type: 'socialProof',
        heading: 'Trusted on 2.8 million trips',
        subheading: null,
        variant: proof,
        logos: [],
        quotes: [],
        metrics: [],
        rating: null,
        ...PROOF[proof],
      }
    case 'stats':
      return {
        type: 'stats',
        heading: 'Wayfare by the numbers',
        subheading: null,
        items: [
          { value: '2,140', label: 'Median domestic fare (INR)' },
          { value: '40+', label: 'Airlines compared' },
          { value: '2.8M', label: 'Trips booked' },
        ],
      }
    case 'pricing':
      return {
        type: 'pricing',
        heading: 'Fare alerts, free or unlimited',
        subheading: 'Booking is always free. Alerts are the only thing we charge for.',
        billingToggle: true,
        annualDiscountLabel: 'Save 20%',
        plans: [
          {
            name: 'Free',
            monthlyPrice: '0',
            annualPrice: '0',
            period: 'forever',
            description: 'Everything you need to book a trip.',
            features: ['Unlimited search', 'Three fare alerts', '90-day price history'],
            cta: 'Start searching',
            featured: false,
          },
          {
            name: 'Plus',
            monthlyPrice: '149',
            annualPrice: '119',
            period: 'per month',
            description: 'For people who fly every month.',
            features: [
              'Unlimited fare alerts',
              'Whole-month fare view',
              'Seat and baggage tracking',
              'Priority support',
            ],
            cta: 'Try Plus free',
            featured: true,
          },
        ],
      }
    case 'testimonials':
      return {
        type: 'testimonials',
        heading: 'What travellers say',
        subheading: null,
        items: [
          {
            quote:
              'Saved 3,200 rupees on a Delhi to Goa return by shifting one day. The month view paid for itself.',
            name: 'Ananya R.',
            role: 'Bengaluru',
          },
          {
            quote:
              'I stopped checking four sites. The fare here has matched the airline every single time.',
            name: 'Karthik M.',
            role: 'Chennai',
          },
          {
            quote: 'Set an alert for Pune to Jaipur and got a ping at 1,890 three weeks later.',
            name: 'Devika S.',
            role: 'Pune',
          },
        ],
      }
    case 'showcase':
      return {
        type: 'showcase',
        heading: 'Routes worth booking this month',
        subheading: 'Median fares over the next 60 days',
        categories: ['Beaches', 'Mountains', 'Cities'],
        items: [
          {
            title: 'Delhi to Goa',
            meta: 'from 2,340',
            detail: 'Cheapest on Tuesdays. 2h 40m nonstop.',
            category: 'Beaches',
            badge: 'Lowest in 90 days',
          },
          {
            title: 'Mumbai to Kochi',
            meta: 'from 2,890',
            detail: 'Six daily departures. 1h 55m.',
            category: 'Beaches',
            badge: null,
          },
          {
            title: 'Delhi to Leh',
            meta: 'from 4,120',
            detail: 'Morning flights only. Book three weeks out.',
            category: 'Mountains',
            badge: null,
          },
          {
            title: 'Bengaluru to Srinagar',
            meta: 'from 5,650',
            detail: 'One stop via Delhi. 6h 10m.',
            category: 'Mountains',
            badge: null,
          },
          {
            title: 'Chennai to Kolkata',
            meta: 'from 3,180',
            detail: 'Nonstop, 2h 25m.',
            category: 'Cities',
            badge: null,
          },
          {
            title: 'Hyderabad to Jaipur',
            meta: 'from 2,760',
            detail: 'Cheapest midweek. 2h 5m.',
            category: 'Cities',
            badge: 'Trending',
          },
        ],
      }
    case 'comparison':
      return {
        type: 'comparison',
        heading: 'How we compare',
        subheading: null,
        columns: ['Wayfare', 'Typical booking site'],
        rows: [
          { label: 'Booking fee', values: ['None', '200 to 600'] },
          { label: 'Taxes shown upfront', values: ['Always', 'At checkout'] },
          { label: 'Free 24h cancellation', values: ['Most fares', 'Select fares'] },
          { label: 'Price history', values: ['90 days', 'Not shown'] },
        ],
      }
    case 'explainer':
      return {
        type: 'explainer',
        heading: 'How Wayfare finds the lower fare',
        subheading: null,
        steps: [
          {
            title: 'We poll airlines directly',
            body: 'Fares come from airline inventory rather than a reseller cache, so what you see is bookable.',
          },
          {
            title: 'We price the whole month',
            body: 'Instead of one date, we check every departure across a 30-day window.',
          },
          {
            title: 'We keep watching',
            body: 'Set a target and we carry on checking after you close the tab.',
          },
        ],
      }
    case 'faq':
      return {
        type: 'faq',
        heading: 'Questions, answered',
        subheading: null,
        items: [
          {
            q: 'Do you add a booking fee?',
            a: 'No. We earn a commission from the airline, so the fare you see is what you pay.',
          },
          {
            q: 'Can I cancel?',
            a: 'Most domestic fares can be cancelled free within 24 hours of booking, from your trip page.',
          },
          {
            q: 'Are these real-time fares?',
            a: 'Yes. Fares are pulled from airline inventory when you search, not from a cache.',
          },
          {
            q: 'How do fare alerts work?',
            a: 'Pick a route and a target price. We check several times a day and notify you when it drops.',
          },
        ],
      }
    case 'cta':
      return {
        type: 'cta',
        heading: 'Find your fare',
        subheading: 'It takes about fifteen seconds.',
        primaryCta: 'Search flights',
        secondaryCta: 'Set a fare alert',
        reassurance: 'No account needed to search. No booking fee, ever.',
      }
    case 'story':
      return {
        type: 'story',
        heading: 'The fare you see should be the fare you pay',
        subheading: null,
        eyebrow: 'Why Wayfare',
        paragraphs: [
          'Most booking sites show a low fare and add to it at checkout. We show the total from the first search.',
        ],
        facts: [
          { label: 'Booking fee', value: 'None' },
          { label: 'Airlines', value: '40+' },
        ],
      }
    case 'useCases':
      return {
        type: 'useCases',
        heading: 'However you travel',
        subheading: null,
        items: [
          { icon: 'briefcase', title: 'Work trips', body: 'Morning departures, flexible fares.', recommendation: 'Filter by refundable' },
          { icon: 'sun', title: 'Weekend escapes', body: 'Short hops under two hours.', recommendation: 'Browse the month view' },
        ],
      }
    case 'codeSample':
      return {
        type: 'codeSample',
        heading: 'Fares, as data',
        subheading: null,
        snippets: [{ label: 'curl', code: 'curl https://api.wayfare.example/fares?from=DEL&to=GOI' }],
      }
    case 'integrations':
      return {
        type: 'integrations',
        heading: 'Where your bookings go',
        subheading: null,
        items: [
          { name: 'Calendar', detail: 'Add trips automatically' },
          { name: 'Email', detail: 'Tickets and changes' },
          { name: 'WhatsApp', detail: 'Gate and delay alerts' },
        ],
      }
  }
}

const PRIMARY_CTA: Record<ConversionApproach, string> = {
  direct_action: 'Search flights',
  free_trial: 'Try fare alerts',
  explore: 'Browse routes',
  contact: 'Talk to us',
}

/**
 * Builds one fixture spec that follows `bp` exactly: its slots in order, its
 * hero variant, theme, proof form, navigation cap and trust gate. `variant`
 * only picks among the canned copy pools so an alternative strategy still
 * reads as a distinct page — it carries no other meaning.
 */
export function fixtureSpec(bp: PageBlueprint, variant = 0): LandingPageSpec {
  const hero = bp.hero.variant

  return landingPageSpec.parse({
    theme: { direction: bp.visual.direction, accent: 'blue' },
    navigation: {
      wordmark: 'Wayfare',
      links: [
        { label: 'Flights', href: '#' },
        { label: 'Hotels', href: '#' },
        { label: 'Deals', href: '#' },
        { label: 'Alerts', href: '#' },
        { label: 'Help', href: '#' },
      ].slice(0, bp.navigation.maxLinks),
      ctaLabel: bp.conversion.approach === 'contact' ? 'Talk to us' : 'Sign in',
      sticky: bp.navigation.sticky,
    },
    hero: {
      variant: hero,
      eyebrow: bp.offer.pricesAllowed ? 'No booking fee' : null,
      headline: HEADLINES[variant % HEADLINES.length],
      subheadline: SUBHEADS[variant % SUBHEADS.length],
      primaryCta: PRIMARY_CTA[bp.conversion.approach],
      secondaryCta: 'See fares by month',
      trustSignals: bp.hero.trustSignals
        ? ['2.8M trips booked', '4.6 on Google Play', 'Free 24h cancellation']
        : [],
      searchFields: hero === 'search_first' ? SEARCH_FIELDS : [],
      demoSteps:
        hero === 'product_demo'
          ? [
              { label: 'Enter a route', detail: 'Delhi to Goa, sometime in March' },
              { label: 'We price the month', detail: '31 departures compared in 1.2s' },
              { label: 'Book the cheapest day', detail: '2,340 on the 18th' },
            ]
          : [],
    },
    sections: bp.sections.map((slot) => ({ ...section(slot.type, bp.proof.type), slot: slot.key })),
    footer: {
      tagline: 'Wayfare compares domestic fares across 40+ airlines. No booking fee.',
      columns: [
        { title: 'Product', links: ['Flights', 'Hotels', 'Fare alerts'] },
        { title: 'Company', links: ['About', 'Careers', 'Press'] },
        { title: 'Support', links: ['Help centre', 'Contact', 'Refunds'] },
      ],
    },
  })
}
