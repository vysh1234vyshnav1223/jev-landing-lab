/**
 * Regenerates the static examples in src/lib/generation/examples/*.json by
 * running the real pipeline once per brief — real hypothesizing, real Jev
 * judgment (a few hundredths of a cent), real composing and critique calls (a
 * paid model, a few cents each). Run only when the questions, archetypes,
 * schemas or these briefs change — not on every deploy.
 *
 *   npx tsx --env-file=.env.local scripts/capture-examples.mts [id ...]
 *
 * With no ids, captures every id in PICK. Needs OPENROUTER_API_KEY set in
 * .env.local. The free-tier interpreting model is flaky under load; a failed
 * brief can just be re-run by passing its id.
 */
import { runPipeline } from '@/lib/generation/pipeline'
import { writeFileSync } from 'node:fs'
import { EXAMPLES } from '@/components/input/examples'

const PICK = ['sports', 'saas', 'hotel', 'api', 'subscription', 'skincare'] as const
type Id = (typeof EXAMPLES)[number]['id']

async function run(id: Id) {
  const ex = EXAMPLES.find((e) => e.id === id)
  if (!ex) throw new Error(`No example "${id}"`)
  const input = {
    brief: ex.brief,
    audience: ex.audience,
    primaryGoal: ex.primaryGoal,
    brandAttributes: [...ex.brandAttributes],
  }
  const result: Record<string, unknown> = {}
  for await (const event of runPipeline(input)) {
    if (event.status === 'error') {
      console.error(id, 'FAILED at', event.stage, event.message)
      process.exitCode = 1
      return
    }
    if (event.status !== 'done') continue
    if (event.stage === 'interpreting') result.brief = event.brief
    if (event.stage === 'hypothesizing') result.hypotheses = event.hypotheses
    if (event.stage === 'deciding') Object.assign(result, { decisions: event.decisions, judgment: event.judgment })
    if (event.stage === 'blueprinting') result.blueprint = event.blueprint
    if (event.stage === 'critiquing') Object.assign(result, { spec: event.spec, critique: event.critique })
  }
  const out = { id: ex.id, label: ex.label, brief: ex.brief, result }
  writeFileSync(`src/lib/generation/examples/${id}.json`, JSON.stringify(out, null, 2))
  console.log(id, 'OK ->', `src/lib/generation/examples/${id}.json`)
}

const ids = (process.argv.slice(2).length ? process.argv.slice(2) : PICK) as Id[]
for (const id of ids) await run(id)
