/**
 * The ink landing's vocabulary: fifteen moods, each a background, three inks
 * and a drift speed, plus the words that summon it. A word may belong to more
 * than one mood ("beach" is travel and ocean) — both pour.
 *
 * Trigger rules live in `words.ts`: under four letters matches exactly (or
 * plural); four and up also catches up to three trailing letters. So avoid
 * short stems that swallow common words — "care" would catch "career", "exam"
 * would catch "example".
 */

export type RGB = [number, number, number]
export type Palette = { bg: RGB; ink: [RGB, RGB, RGB]; speed: number }
type Mood = Palette & { triggers: string[] }

const hex = (h: string): RGB => [0, 2, 4].map((i) => parseInt(h.slice(1 + i, 3 + i), 16)) as RGB
const mood = (bg: string, ink: [string, string, string], speed: number, triggers: string): Mood => ({
  bg: hex(bg),
  ink: ink.map(hex) as [RGB, RGB, RGB],
  speed,
  triggers: triggers.split(/\s+/).filter(Boolean),
})

export const MOODS = {
  luxury: mood('#0b0906', ['#c9a24b', '#6b1c2a', '#3a2c1c'], 0.25, `
    luxury luxurious premium exclusive elegant elegance jewel jewellery jewelry diamond gold
    perfume fragrance wine champagne boutique couture villa yacht bespoke serum skincare cosmetic
    beauty atelier private concierge suite penthouse sommelier cashmere silk leather velvet
    heritage prestige prestigious sophisticated refined curated fine`),
  playful: mood('#fff3df', ['#ff5fa2', '#ffd23f', '#3ec5ff'], 1.5, `
    kid kids child children fun funny toy play playful party candy sweet cartoon school pet puppy
    kitten colourful colorful cute family baby birthday balloon sticker emoji silly happy joy
    joyful bright friendly cheerful teen kindergarten preschool parent mom dad`),
  finance: mood('#0a1624', ['#2f6df6', '#2fb68b', '#1c3350'], 0.4, `
    finance financial fintech bank invest investment investor money insurance insure loan
    mortgage tax account payment pay payroll crypto trading trader stock wealth budget savings
    saving credit debit wallet secure security trust trustworthy legal law lawyer enterprise
    compliance audit invoice billing fund capital pension retirement`),
  wellness: mood('#eef4f1', ['#7cc8b2', '#a3bdea', '#e3d3ec'], 0.35, `
    health healthcare wellness wellbeing yoga pilates meditat sleep therapy therapist calm mental
    caring clinic doctor spa mindful mindfulness patient clinical nurse hospital dental dentist
    massage breath relax relaxing recovery nutrition diet vitamin supplement gentle soft balance
    peace peaceful heal pharmacy`),
  energetic: mood('#140606', ['#ff3b1f', '#ff9a00', '#ff006e'], 1.8, `
    sport sports fitness gym run running runner workout training athlete gaming game esport
    energy energetic bold fast speed race racing music festival nightlife club dance dancing
    concert extreme power intense adrenaline football cricket basketball cycling bike motor loud hype`),
  nature: mood('#f2eee0', ['#6b8f3a', '#d9a441', '#a8c686'], 0.6, `
    food organic eco ecology sustainab sustainability garden gardening farm farmer coffee tea bakery bake vegan
    vegetarian plant green recipe restaurant cafe outdoor outdoors natural nature forest earth
    fresh local seasonal harvest flower honey bread kitchen cook chef grocery fruit veggie wild
    hiking camping climate`),
  tech: mood('#07061a', ['#6c4bff', '#00c8ff', '#2b1b8f'], 0.8, `
    ai developer dev code coding software api saas data database cloud startup automat platform
    tool analytics product app digital tech technology engineer machine robot robotics web website
    infrastructure github llm agent algorithm dashboard workflow integration pipeline deploy server cyber`),
  travel: mood('#fdf0e4', ['#ff8a4c', '#2fa4ff', '#ffc68f'], 0.7, `
    flight fly flying travel trip holiday vacation hotel hostel beach tour destination booking
    airline airport explore adventure journey passport visa getaway resort island backpack road
    roadtrip map abroad wander wanderlust luggage stay sightseeing`),
  romantic: mood('#fbeef0', ['#e8798f', '#f6b8c4', '#b44a6a'], 0.45, `
    wedding bride bridal groom love romance romantic dating date couple valentine flower florist
    bouquet rose honeymoon engagement proposal anniversary heart gift chocolate intimate passion
    soulmate marriage matchmaking lingerie poetry`),
  ocean: mood('#04202b', ['#1fb5c9', '#0e6e8c', '#7fe0d6'], 0.6, `
    ocean sea marine surf sail boat dive diving swim swimming water beach coast island wave fish
    cruise harbour harbor blue aqua reef shore lake river kayak yacht whale seafood pool`),
  street: mood('#0c0c0c', ['#c6ff2e', '#f5f5f0', '#5a5a5a'], 1.3, `
    street streetwear sneaker skate skateboard urban city cities hip hiphop rap graffiti tattoo
    barber nightclub drop underground edgy rebel punk vinyl merch hoodie culture youth raw grunge
    brutalist indie`),
  creative: mood('#f4efe6', ['#e2412b', '#1d1d1b', '#f2b632'], 0.9, `
    art artist design designer studio portfolio photo photography photographer gallery film
    filmmaker illustration illustrator creative creator craft handmade artisan architecture
    architect agency magazine editorial print typography museum theatre theater writer writing
    poster animation paint`),
  learning: mood('#f5f1e6', ['#2b4c9b', '#e8a33d', '#7aa0d8'], 0.5, `
    learn course student study studies tutor university college school teacher teach lesson exams
    education educational language books ebook library reading knowledge skill academy classes
    classroom degree research science history math`),
  cozy: mood('#f3e7da', ['#c8663f', '#8a5a3b', '#e8c49a'], 0.4, `
    home house homeware interior furniture decor candle blanket cozy cosy warm comfort comfortable
    knit knitting wool ceramic pottery dog cat cottage cabin hygge rustic vintage antique slow
    soup bed bedding sofa`),
  corporate: mood('#eef0f3', ['#3d4a5c', '#9aa7b8', '#5f7cae'], 0.35, `
    consulting consultant recruit recruiting hiring hr team office business professional corporate
    productivity project management manager meeting crm sales marketing strategy operations
    employee workplace remote hybrid collaboration efficient efficiency reliable simple clean minimal`),
} satisfies Record<string, Mood>

export type MoodKey = keyof typeof MOODS

export const TRIGGERS = Object.fromEntries(
  Object.entries(MOODS).map(([k, m]) => [k, m.triggers]),
) as Record<MoodKey, string[]>

/** An empty screen: near-black, barely moving. */
export const IDLE: Palette = {
  bg: hex('#0d0e11'),
  ink: [hex('#2a2e38'), hex('#1f2733'), hex('#33303a')],
  speed: 0.3,
}

/** What a word with no mood leaves behind. */
export const RIPPLE = hex('#8a8f99')

/**
 * Jev's four visual registers (the `visualDirection` question), each with an
 * ink palette in that register's typical accent (clean → blue, warm → amber,
 * bold → violet, technical → slate).
 */
export const REGISTERS: Record<string, Palette> = {
  clean_utility: { bg: hex('#eef2f8'), ink: [hex('#2f6df6'), hex('#9db8f0'), hex('#d5deea')], speed: 0.35 },
  warm_editorial: { bg: hex('#f6eee2'), ink: [hex('#b4700f'), hex('#e8c49a'), hex('#c8663f')], speed: 0.4 },
  bold_confident: { bg: hex('#0c0816'), ink: [hex('#6743d8'), hex('#ff3b7a'), hex('#a78bfa')], speed: 1.1 },
  technical_precise: { bg: hex('#0d1117'), ink: [hex('#3f4855'), hex('#6e8bff'), hex('#57e0a8')], speed: 0.55 },
}
