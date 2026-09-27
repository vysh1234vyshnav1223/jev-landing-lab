/**
 * Regenerates the static examples in src/lib/generation/examples/*.json by
 * running the real pipeline once per brief — real Jev calls (a few
 * hundredths of a cent each), real composing calls (a paid model, a few
 * cents each). Run only when QUESTIONS, the spec schema, or these briefs
 * change — not on every deploy.
 *
 *   npx tsx --env-file=.env.local scripts/capture-examples.mts
 *
 * Needs OPENROUTER_API_KEY set in .env.local. The free-tier interpreting
 * model is flaky under load; a failed brief can just be re-run (edit PICK
 * below to retry one at a time).
 */
import { runPipeline } from '@/lib/generation/pipeline'
import { writeFileSync } from 'node:fs'
import { EXAMPLES } from '@/components/input/examples'

const PICK = ['travel', 'saas', 'skincare'] as const

async function run(id: (typeof PICK)[number]) {
  const ex = EXAMPLES.find((e) => e.id === id)!
  const input = {
    brief: ex.brief,
    audience: ex.audience,
    primaryGoal: ex.primaryGoal,
    brandAttributes: [...ex.brandAttributes],
  }
  let brief, decisions, direction, spec
  for await (const event of runPipeline(input)) {
    if (event.status === 'error') {
      console.error(id, 'FAILED at', event.stage, event.message)
      process.exitCode = 1
      return
    }
    if (event.stage === 'interpreting' && event.status === 'done') brief = event.brief
    if (event.stage === 'deciding' && event.status === 'done') decisions = event.decisions
    if (event.stage === 'resolving' && event.status === 'done') direction = event.direction
    if (event.stage === 'composing' && event.status === 'done') spec = event.spec
  }
  const out = { id: ex.id, label: ex.label, brief: ex.brief, result: { brief, decisions, direction, spec } }
  writeFileSync(`src/lib/generation/examples/${id}.json`, JSON.stringify(out, null, 2))
  console.log(id, 'OK ->', `src/lib/generation/examples/${id}.json`)
}

for (const id of PICK) await run(id)
