/**
 * Starter briefs. Deliberately spread across industries — the decision engine
 * is domain-agnostic, and these are the fastest way to demonstrate that.
 */
export const EXAMPLES = [
  {
    id: 'travel',
    label: 'Travel booking',
    brief:
      'I am building a flight and hotel booking platform for budget-conscious travellers in India. We compete with MakeMyTrip and Goibibo, mostly on price transparency — no booking fee, taxes shown upfront. The main thing I want visitors to do is run a flight search. The brand should feel trustworthy, fast and affordable.',
    audience: 'Budget-conscious Indian travellers',
    primaryGoal: 'Get visitors to search for flights',
    brandAttributes: ['Trustworthy', 'Fast', 'Affordable'],
  },
  {
    id: 'saas',
    label: 'B2B analytics',
    brief:
      'A product analytics platform for B2B SaaS teams who have outgrown spreadsheets but find Amplitude too expensive and too complex. Buyers are heads of product and growth at 20–200 person companies. We want them to start a free trial and connect their data source within the first session.',
    audience: 'Heads of product at 20–200 person SaaS companies',
    primaryGoal: 'Start a free trial',
    brandAttributes: ['Precise', 'Capable', 'Calm'],
  },
  {
    id: 'skincare',
    label: 'D2C skincare',
    brief:
      'A premium skincare brand selling a small range of clinically-backed serums direct to consumers. Our customers are in their 30s and 40s, have tried a lot of products that did not work, and are sceptical of marketing claims. Every ingredient is disclosed with its concentration. We want first-time visitors to buy the starter set.',
    audience: 'Sceptical skincare buyers in their 30s and 40s',
    primaryGoal: 'Buy the starter set',
    brandAttributes: ['Clinical', 'Honest', 'Refined'],
  },
  {
    id: 'devtool',
    label: 'AI coding assistant',
    brief:
      'An AI pair programmer that runs locally and never sends source code to a server. Aimed at engineers at companies with strict data policies — finance, health, defence. Developers are the users but security teams are the blockers. The goal is getting an engineer to install the CLI and run it on a real repository.',
    audience: 'Engineers at security-conscious companies',
    primaryGoal: 'Install the CLI',
    brandAttributes: ['Technical', 'Private', 'Fast'],
  },
  {
    id: 'education',
    label: 'Online education',
    brief:
      'An online school teaching data skills to working professionals who want to change careers. Courses are part-time over 16 weeks with live cohorts and a job guarantee. Students are 25–40, currently employed, and nervous about whether it will actually lead to a job. We want them to book a call with an admissions advisor.',
    audience: 'Working professionals changing careers into data',
    primaryGoal: 'Book an admissions call',
    brandAttributes: ['Supportive', 'Credible', 'Practical'],
  },
  {
    id: 'sports',
    label: 'Sports store',
    brief:
      'An independent running and outdoor store with two shops in Manchester and an online shop. We stock trail and road shoes, waterproof jackets, hydration packs and GPS watches from the big brands, and our staff are all runners who do free gait analysis in store. We want visitors to find the right gear for how they run and buy it online.',
    audience: 'Road and trail runners in the north of England',
    primaryGoal: 'Buy running gear online',
    brandAttributes: ['Knowledgeable', 'Local', 'Energetic'],
  },
  {
    id: 'hotel',
    label: 'Luxury hotel',
    brief:
      'A 24-room boutique hotel in a restored 18th-century palazzo in Lecce, southern Italy. Rooftop pool looking over the baroque old town, a restaurant run by a local chef, and a small spa in the old cisterns. Guests are couples from northern Europe and the US on a special trip. We want them to check availability and book direct instead of through Booking.com.',
    audience: 'Couples planning a special trip to southern Italy',
    primaryGoal: 'Check availability and book direct',
    brandAttributes: ['Intimate', 'Warm', 'Timeless'],
  },
  {
    id: 'api',
    label: 'Developer API',
    brief:
      'An address verification API. Send a messy address, get back a standardised, geocoded, deliverability-checked one in under 50ms. Covers 240 countries, has SDKs for JavaScript, Python and Go, and a free tier of 1,000 lookups a month. Users are backend engineers at e-commerce and logistics companies. We want them to get an API key and make a first call.',
    audience: 'Backend engineers at e-commerce and logistics companies',
    primaryGoal: 'Get an API key and make a first call',
    brandAttributes: ['Precise', 'Fast', 'Dependable'],
  },
  {
    id: 'subscription',
    label: 'Meal-kit subscription',
    brief:
      'A weekly meal-kit subscription for busy families in the UK: three or four dinners a week, recipes under 30 minutes, kids-approved, delivered in recyclable packaging. You pick meals each week and can skip or pause any time. Parents are tired of deciding what to cook every night. We want them to start their first box.',
    audience: 'Busy UK parents cooking for a family',
    primaryGoal: 'Start a first box',
    brandAttributes: ['Warm', 'Easy', 'Reliable'],
  },
] as const
