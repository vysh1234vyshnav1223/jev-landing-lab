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
] as const
