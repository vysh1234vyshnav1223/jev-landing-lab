import { cn } from '@/lib/cn'
import { ARCHETYPES } from '@/lib/generation/archetypes'
import { SectionChips } from '@/components/decisions/StrategyList'
import type { CritiqueReport, PageBlueprint } from '@/schemas/blueprint'
import { CONVERSION_LABELS } from '@/schemas/strategy'

/**
 * One blueprint, read-only: the strategy a page was built from and the rules
 * it was held to. Used side by side in Compare and on the examples page.
 */
export function BlueprintSummary({
  blueprint: bp,
  probability,
  label,
  critique,
  accent,
}: {
  blueprint: PageBlueprint
  /** Jev's combined probability for this strategy. */
  probability: number | null
  label: string
  critique?: CritiqueReport | null
  accent?: boolean
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2 text-[0.75rem] leading-relaxed text-[var(--lab-text-muted)]">
      <div className="flex items-baseline justify-between gap-2">
        <span className={cn('text-[0.6875rem] font-medium', accent ? 'text-[var(--lab-warn)]' : 'text-[var(--lab-accent)]')}>
          {label}
        </span>
        {probability !== null && (
          <span className="font-mono text-[0.6875rem] tabular-nums text-[var(--lab-text-faint)]">
            Jev {Math.round(probability * 100)}%
          </span>
        )}
      </div>
      <h3 className="text-[0.875rem] font-semibold text-[var(--lab-text)]">{bp.strategyName}</h3>
      <p>
        <span className="text-[var(--lab-text-faint)]">{ARCHETYPES[bp.archetype].label} · </span>
        {bp.thesis}
      </p>
      <p>
        <span className="text-[var(--lab-text-faint)]">Story </span>
        {bp.narrative.join(' → ')}
      </p>
      <SectionChips
        types={[`hero · ${bp.hero.variant}`, ...bp.sections.map((s) => s.type)]}
        struck={bp.removed.map((r) => r.type)}
      />
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
        <dt className="text-[var(--lab-text-faint)]">Ask</dt>
        <dd>{CONVERSION_LABELS[bp.conversion.approach]}</dd>
        <dt className="text-[var(--lab-text-faint)]">Visual</dt>
        <dd className="font-mono text-[0.6875rem]">{bp.visual.direction}</dd>
        <dt className="text-[var(--lab-text-faint)]">Proof</dt>
        <dd className="font-mono text-[0.6875rem]">{bp.proof.type}</dd>
        <dt className="text-[var(--lab-text-faint)]">Ruled out</dt>
        <dd className="font-mono text-[0.6875rem]">{bp.forbidden.map((f) => f.type).join(', ') || 'nothing'}</dd>
        {critique && (
          <>
            <dt className="text-[var(--lab-text-faint)]">Critique</dt>
            <dd>{critiqueLine(critique)}</dd>
          </>
        )}
      </dl>
    </div>
  )
}

export function critiqueLine(c: CritiqueReport): string {
  const blocking = c.issues.filter((i) => i.severity === 'blocking').length
  const minor = c.issues.length - blocking
  const found =
    c.issues.length === 0
      ? 'No issues found'
      : `${blocking} blocking, ${minor} minor`
  const repaired = c.repaired.length ? ` · repaired ${c.repaired.join(', ')}` : ''
  const left = c.remaining.length ? ` · ${c.remaining.length} unresolved` : ''
  const who = c.reviewer === 'rules' ? ' (rules only)' : ''
  return `${found}${repaired}${left}${who}`
}
