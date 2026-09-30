'use client'

import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useState, type ComponentType } from 'react'
import { RotateCcw, SplitSquareHorizontal } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Workbench, StatusCell, StatusDivider } from '@/components/shell/Workbench'
import { GenerationCanvas } from '@/components/generation/GenerationCanvas'
import { ErrorState } from '@/components/generation/ErrorState'
import { DecisionPanel } from '@/components/decisions/DecisionPanel'
import { CompareView } from '@/components/decisions/CompareView'
import { Renderer } from '@/components/preview/Renderer'
import { Button } from '@/components/ui/Button'
import { StatusDot } from '@/components/ui/primitives'
import { useGeneration, type GenerationState } from '@/hooks/useGeneration'
import { useCompare } from '@/hooks/useCompare'
import { transition } from '@/lib/motion/tokens'
import type { BriefInput } from '@/schemas/brief'

/**
 * Idle is the landing page. Once a brief is submitted the surface becomes the
 * workbench — generation and result render inside the same shell, so the tool
 * never appears to navigate. The result is Jev's own page: the strategy Jev
 * ranked first, executed under its blueprint. In the inspector a person can
 * pick another candidate strategy and/or step Jev's execution decisions, then
 * compare that page against Jev's.
 *
 * The landing is a prop so landing experiments can share this flow. With
 * `holdRun`, the landing stays on screen while generation runs and gets the
 * live state, so it can show the decisions arriving; the workbench takes over
 * once the page is ready (or the run fails).
 */
export function App({
  Landing,
  holdRun = false,
}: {
  Landing: ComponentType<{ onSubmit: (input: BriefInput) => void; run: GenerationState }>
  holdRun?: boolean
}) {
  const { state, generate, reset } = useGeneration()
  const [lastInput, setLastInput] = useState<BriefInput | null>(null)
  const [inspectorOpen, setInspectorOpen] = useState(true)
  const [viewport, setViewport] = useState<'desktop' | 'mobile'>('desktop')
  const [showCompare, setShowCompare] = useState(false)
  const { strategyId, setStrategy, overrides, setOverride, clear, compare, run } = useCompare()
  const reduced = useReducedMotion()

  function start(input: BriefInput) {
    setLastInput(input)
    void generate(input)
  }

  if (state.phase === 'idle' || (holdRun && state.phase === 'running')) {
    return <Landing onSubmit={start} run={state} />
  }

  const ready = Boolean(
    state.phase === 'ready' && state.decisions && state.judgment && state.hypotheses && state.blueprint && state.spec,
  )
  const probabilityOf = (id: string) => state.judgment?.ranked.find((r) => r.id === id)?.probability ?? null

  function runCompare() {
    if (!state.brief || !state.hypotheses || !state.decisions || !state.judgment) return
    setShowCompare(true)
    void run(state.brief, state.hypotheses, state.decisions, state.judgment.selected)
  }

  function closeCompare() {
    setShowCompare(false)
  }

  function clearOverrides() {
    clear()
    setShowCompare(false)
  }

  return (
    <Workbench
      inspector={
        ready && state.decisions && state.judgment && state.hypotheses ? (
          <AnimatePresence initial={false}>
            {inspectorOpen && (
              <motion.aside
                initial={reduced ? false : { width: 0, opacity: 0 }}
                animate={{ width: 320, opacity: 1 }}
                exit={reduced ? undefined : { width: 0, opacity: 0 }}
                transition={transition.soft}
                className="hidden shrink-0 overflow-hidden border-l border-[var(--lab-border)] bg-[var(--lab-1)] xl:block"
              >
                <div className="h-full w-[320px]">
                  <DecisionPanel
                    decisions={state.decisions}
                    judgment={state.judgment}
                    hypotheses={state.hypotheses}
                    chosenStrategy={strategyId}
                    onChooseStrategy={setStrategy}
                    overrides={overrides}
                    onChoose={setOverride}
                    onClear={clearOverrides}
                    onCompare={runCompare}
                    comparing={compare.status === 'loading'}
                  />
                </div>
              </motion.aside>
            )}
          </AnimatePresence>
        ) : null
      }
      status={<StatusLine state={state} ready={ready} comparing={showCompare} />}
    >
      <Toolbar
        ready={ready}
        phase={state.phase}
        viewport={viewport}
        onViewport={setViewport}
        inspectorOpen={inspectorOpen}
        onToggleInspector={() => setInspectorOpen((o) => !o)}
        onRestart={reset}
        showCompare={showCompare}
        onExitCompare={closeCompare}
        canCompare={overrides.size > 0 || strategyId !== null}
        onCompare={runCompare}
      />

      <div className="min-h-0 flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          {state.phase === 'running' && (
            <motion.div key="running" {...phaseMotion(reduced)} className="px-6 py-8 sm:px-8">
              <div className="mx-auto max-w-[720px]">
                <GenerationCanvas state={state} />
              </div>
            </motion.div>
          )}

          {state.phase === 'error' && state.error && (
            <motion.div key="error" {...phaseMotion(reduced)} className="px-6 py-12 sm:px-8">
              <ErrorState
                code={state.error.code}
                message={state.error.message}
                jevSucceeded={Boolean(state.decisions)}
                onRetry={() => (lastInput ? start(lastInput) : reset())}
                onRestart={reset}
              />
            </motion.div>
          )}

          {ready && showCompare && (
            <motion.div key="compare" {...phaseMotion(reduced)} className="h-full">
              {compare.status === 'ready' && state.spec && state.blueprint ? (
                <CompareView
                  jev={{
                    spec: state.spec,
                    blueprint: state.blueprint,
                    critique: state.critique,
                    probability: probabilityOf(state.blueprint.strategyId),
                  }}
                  alternative={{
                    spec: compare.spec,
                    blueprint: compare.blueprint,
                    critique: compare.critique,
                    probability: probabilityOf(compare.blueprint.strategyId),
                  }}
                  departures={compare.departures}
                  onClose={closeCompare}
                />
              ) : compare.status === 'error' ? (
                <div className="flex h-full items-center justify-center p-8">
                  <ErrorState
                    code="LLM_FAILED"
                    message={compare.message}
                    jevSucceeded
                    onRetry={runCompare}
                    onRestart={closeCompare}
                  />
                </div>
              ) : (
                <div className="flex h-full items-center justify-center gap-2 text-[0.8125rem] text-[var(--lab-text-faint)]">
                  <StatusDot status="active" />
                  Building the alternative: blueprint, compose, critique…
                </div>
              )}
            </motion.div>
          )}

          {ready && !showCompare && (
            <motion.div key="ready" {...phaseMotion(reduced)} className={viewport === 'mobile' ? 'h-full' : undefined}>
              <div
                className={cn(
                  'mx-auto bg-white transition-[max-width] duration-300',
                  // Desktop: the page's real height, so THIS parent scroll
                  // container (not an inner clamp) is what scrolls — a spec
                  // with many sections was getting cut off at the viewport
                  // edge with min-h-full/h-full instead of growing past it.
                  viewport === 'mobile'
                    ? 'my-6 h-[calc(100%-3rem)] max-w-[420px] overflow-y-auto rounded-[var(--radius-xl)] border border-[var(--lab-border-strong)] shadow-[var(--shadow-lg)]'
                    : 'min-h-full',
                )}
              >
                {state.spec && <Renderer spec={state.spec} />}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Workbench>
  )
}

function phaseMotion(reduced: boolean | null) {
  return {
    initial: reduced ? { opacity: 0 } : { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    exit: reduced ? { opacity: 0 } : { opacity: 0, y: -6 },
    transition: transition.normal,
  }
}

function Toolbar({
  ready,
  phase,
  viewport,
  onViewport,
  inspectorOpen,
  onToggleInspector,
  onRestart,
  showCompare,
  onExitCompare,
  canCompare,
  onCompare,
}: {
  ready: boolean
  phase: string
  viewport: 'desktop' | 'mobile'
  onViewport: (v: 'desktop' | 'mobile') => void
  inspectorOpen: boolean
  onToggleInspector: () => void
  onRestart: () => void
  showCompare: boolean
  onExitCompare: () => void
  canCompare: boolean
  onCompare: () => void
}) {
  return (
    <div className="flex h-11 shrink-0 items-center gap-2 border-b border-[var(--lab-border)] bg-[var(--lab-0)] px-3">
      {ready ? (
        <>
          {showCompare ? (
            <Button variant="ghost" size="sm" onClick={onExitCompare}>
              Back to page
            </Button>
          ) : (
            <>
              <div className="flex overflow-hidden rounded-[var(--radius-sm)] border border-[var(--lab-border-strong)]">
                {(['desktop', 'mobile'] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => onViewport(v)}
                    className={cn(
                      'px-2.5 py-1 text-[var(--step--1)] capitalize transition-colors',
                      viewport === v
                        ? 'bg-[var(--lab-3)] text-[var(--lab-text)]'
                        : 'text-[var(--lab-text-muted)] hover:bg-[var(--lab-2)]',
                    )}
                  >
                    {v}
                  </button>
                ))}
              </div>
              {canCompare && (
                <Button variant="secondary" size="sm" onClick={onCompare}>
                  <SplitSquareHorizontal className="size-3.5" />
                  Compare
                </Button>
              )}
            </>
          )}
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleInspector}
              aria-label={inspectorOpen ? 'Hide inspector' : 'Show inspector'}
              className="hidden xl:inline-flex"
            >
              {inspectorOpen ? 'Hide decisions' : 'Show decisions'}
            </Button>
            <Button variant="secondary" size="sm" onClick={onRestart}>
              <RotateCcw className="size-3.5" />
              <span className="hidden sm:inline">New brief</span>
            </Button>
          </div>
        </>
      ) : (
        <>
          <span className="text-[0.75rem] text-[var(--lab-text-faint)]">
            {phase === 'running' ? 'Decision pass in progress' : 'Run failed'}
          </span>
          <Button variant="ghost" size="sm" onClick={onRestart} className="ml-auto">
            <RotateCcw className="size-3.5" />
            <span className="hidden sm:inline">New brief</span>
          </Button>
        </>
      )}
    </div>
  )
}

function StatusLine({
  state,
  ready,
  comparing,
}: {
  state: ReturnType<typeof useGeneration>['state']
  ready: boolean
  comparing: boolean
}) {
  const running = state.phase === 'running'
  const meta = state.decisions?.meta

  return (
    <>
      <span className="flex items-center gap-1.5">
        <StatusDot
          status={state.phase === 'error' ? 'error' : running ? 'active' : ready ? 'done' : 'idle'}
        />
        <span className="text-[var(--lab-text-muted)]">
          {state.phase === 'error' ? 'Failed' : running ? 'Running' : ready ? 'Ready' : 'Idle'}
        </span>
      </span>

      <StatusDivider />
      <StatusCell label="jev" value={meta?.model ?? '~typesafe/jev-latest'} />

      {meta && (
        <>
          <StatusDivider />
          <StatusCell label="latency" value={`${meta.latencyMs}ms`} tone="accent" />
        </>
      )}

      {meta?.cost != null && (
        <>
          <StatusDivider />
          <StatusCell label="cost" value={`$${meta.cost.toFixed(6)}`} />
        </>
      )}

      {state.blueprint && (
        <>
          <StatusDivider />
          <StatusCell label="strategy" value={state.blueprint.strategyName} />
        </>
      )}

      {state.critique && (
        <>
          <StatusDivider />
          <StatusCell
            label="critique"
            value={
              !state.critique.valid
                ? `${state.critique.remaining.length} unresolved`
                : state.critique.repaired.length
                  ? 'repaired'
                  : 'clean'
            }
            tone={state.critique.valid ? 'positive' : 'danger'}
          />
        </>
      )}

      {ready && comparing && (
        <>
          <StatusDivider />
          <StatusCell label="view" value="compare" tone="positive" />
        </>
      )}
    </>
  )
}
