import { z } from 'zod'

/**
 * Server-only environment. Never import this from a client component —
 * it carries the OpenRouter key.
 */
const schema = z.object({
  // Optional in prod: BYOK means most requests carry their own key via the
  // X-OpenRouter-Key header (see api/generate). This only backstops local
  // dev and USE_FIXTURES, where nobody types a key in.
  OPENROUTER_API_KEY: z.string().optional().default(''),
  OPENROUTER_MODEL: z.string().default('openrouter/free'),
  JEV_MODEL: z.string().default('~typesafe/jev-latest'),
  JEV_DECISIONS_URL: z
    .string()
    .url()
    .default('https://openrouter.ai/api/alpha/decisions'),
  // Copy generation (stage ③) — a named, paid OpenRouter model, not the free
  // router. Free-tier models (both OpenRouter's router and Groq's free
  // reasoning models) proved unreliable for a page-sized structured-output
  // call: empty responses, silent truncation, and hard per-minute quotas.
  // gpt-5-nano: OpenAI's cheapest current model with native strict
  // json_schema enforcement (constrained decoding, not a hint) — about
  // $0.001-0.002/page. gpt-4o-mini also works but is being retired by
  // OpenAI through 2026, so it's not the default for anything long-lived.
  COMPOSING_MODEL: z.string().default('openai/gpt-5-nano'),
  // Reasoning effort for the composing model's calls (hypothesize, compose,
  // critique). gpt-5-nano at its default effort spends minutes per page on
  // hidden reasoning; "low" cuts that sharply with no visible loss on these
  // structured tasks. Set to an empty string for a model with no reasoning
  // support — with require_parameters on, sending it would exclude every
  // provider for that model.
  COMPOSING_REASONING: z.string().default('low'),
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
  USE_FIXTURES: z
    .string()
    .optional()
    .transform((v) => v === '1' || v === 'true'),
})

export type Env = z.infer<typeof schema>

let cached: Env | null = null

export function env(): Env {
  if (cached) return cached
  const parsed = schema.safeParse(process.env)
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .join('; ')
    throw new Error(`Invalid environment: ${issues}`)
  }
  cached = parsed.data
  return cached
}
