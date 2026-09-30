'use client'

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { useReducedMotion } from 'motion/react'
import { ApiKeyGate } from '@/components/landing/ApiKeyGate'
import { BareInput } from '@/components/landing/BareInput'
import { getApiKey, hasApiKey, subscribeApiKey } from '@/lib/apiKey'
import { keysFor, matches, words } from '@/components/landing/words'
import { IDLE, MOODS, REGISTERS, RIPPLE, TRIGGERS, type MoodKey, type Palette, type RGB } from '@/components/landing/moods'
import { STAGES, type GenerationState } from '@/hooks/useGeneration'
import type { BriefInput } from '@/schemas/brief'

/**
 * Landing experiment: ink.
 *
 * The background is slow-moving colour, like ink in water. Every finished word
 * that carries a mood pours a drop of it from the caret and stirs the field —
 * "luxury" bleeds gold into black, "kids" floods it bright — while the whole
 * field drifts toward the blend of everything said so far. Words with no mood
 * still leave a faint grey ripple, so the screen never ignores you. All local;
 * the only model call is still the one on Enter.
 *
 * After Enter the words stop steering. The ink keeps stirring while Jev works,
 * then settles into Jev's own answer to "which visual register fits?" — each
 * register poured in proportion to its probability — until the page is ready.
 */

type Weighted = { palette: Palette; weight: number }

const AMBIENT = 6

/**
 * Target field for a weighted set of palettes: background and pace are the
 * weighted average, and the six ambient blobs are shared out by weight — so a
 * 0.6 answer owns most of the field and a 0.06 one gets a sliver, if that.
 */
function blend(entries: Weighted[]) {
  if (entries.length === 0) entries = [{ palette: IDLE, weight: 1 }]
  const total = entries.reduce((s, e) => s + e.weight, 0)
  const avg = (pick: (m: Palette) => number) =>
    entries.reduce((s, e) => s + pick(e.palette) * e.weight, 0) / total
  const bg = [0, 1, 2].map((c) => avg((m) => m.bg[c])) as RGB
  const moods = Array.from({ length: AMBIENT }, (_, i) => {
    let at = ((i + 0.5) / AMBIENT) * total
    return (entries.find((e) => (at -= e.weight) < 0) ?? entries[entries.length - 1]).palette
  })
  return { bg, speed: avg((m) => m.speed), moods }
}

/** While typing: moods present, the most recent counting double. */
const fromWords = (keys: MoodKey[]) =>
  blend(keys.map((k, i) => ({ palette: MOODS[k], weight: i === keys.length - 1 ? 2 : 1 })))

type Ranked = { option: string; probability: number }[]

/** After Jev answers: its registers, weighted by probability. */
const fromJev = (ranked: Ranked) =>
  blend(ranked.filter((r) => REGISTERS[r.option]).map((r) => ({ palette: REGISTERS[r.option], weight: r.probability })))

const pretty = (option: string) => option.replace(/_/g, ' ')

const luminance = ([r, g, b]: RGB) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255

type Drop = { x: number; y: number; vx: number; vy: number; r: number; max: number; rgb: RGB; alpha: number; decay: number }

/** Paste can finish dozens of words at once; pour for the last few only. */
const MAX_POURS_PER_CHANGE = 6

export function InkLanding({
  onSubmit,
  run,
}: {
  onSubmit: (input: BriefInput) => void
  run?: GenerationState
}) {
  const [text, setText] = useState('')
  const [gateOpen, setGateOpen] = useState(false)
  // Server snapshot is `false` (sessionStorage doesn't exist during SSR);
  // the real value takes over on hydration, same pattern as ThemeToggle.
  const keySaved = useSyncExternalStore(subscribeApiKey, hasApiKey, () => false)
  const canvas = useRef<HTMLCanvasElement>(null)
  const reduced = useReducedMotion()

  function submit(brief: string) {
    if (!getApiKey()) {
      setGateOpen(true)
      return
    }
    onSubmit({ brief })
  }

  const running = run?.phase === 'running'
  const visual = run?.decisions?.decisions.visualDirection
  const ranked = visual?.type === 'choice' ? visual.ranked : null

  const found = matches(text, TRIGGERS)
  const target = ranked ? fromJev(ranked) : fromWords(found.map((f) => f.key))
  const light = luminance(target.bg) > 0.55

  // The animation loop reads the latest target and pour requests from refs, so
  // typing never restarts it.
  const targetRef = useRef(target)
  const pours = useRef<{ inks: readonly RGB[]; big: boolean }[]>([])
  const finished = useRef(0)
  const busy = useRef(false)
  const answered = useRef(false)

  useEffect(() => {
    targetRef.current = target
    busy.current = running && !ranked
    // Jev's answer lands once: pour every register, as many drops as its share.
    if (ranked && !answered.current) {
      answered.current = true
      for (const r of ranked) {
        const palette = REGISTERS[r.option]
        for (let n = Math.round(r.probability * 8); palette && n > 0; n--) {
          pours.current.push({ inks: palette.ink, big: true })
        }
      }
    }
    const done = words(text.replace(/[a-z]+$/i, '')) // completed words only
    for (const w of done.slice(finished.current).slice(-MAX_POURS_PER_CHANGE)) {
      const hit = keysFor(w, TRIGGERS)
      if (hit.length === 0) pours.current.push({ inks: [RIPPLE], big: false })
      for (const k of hit) pours.current.push({ inks: MOODS[k].ink, big: true })
    }
    finished.current = done.length
  })

  useEffect(() => {
    const el = canvas.current
    const ctx = el?.getContext('2d')
    if (!el || !ctx) return

    // Drawn at 1/6 resolution and scaled up: the browser's upscale does the
    // blur for free and the loop stays cheap.
    const SCALE = 6
    let w = 0
    let h = 0
    const resize = () => {
      w = el.width = Math.ceil(innerWidth / SCALE)
      h = el.height = Math.ceil(innerHeight / SCALE)
    }
    resize()
    addEventListener('resize', resize)

    const bg: RGB = [...IDLE.bg]
    let speed = IDLE.speed
    // Each pour stirs the field; the stir decays back to the mood's own pace.
    let stir = 0
    const ambient = Array.from({ length: 6 }, (_, i) => ({
      x: Math.random() * w,
      y: Math.random() * h,
      a: Math.random() * Math.PI * 2,
      r: 0.35 + (i % 3) * 0.12,
      rgb: [...IDLE.ink[i % 3]] as RGB,
    }))
    const drops: Drop[] = []
    const motion = reduced ? 0 : 1

    let raf = 0
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t

    const blob = (x: number, y: number, r: number, [cr, cg, cb]: RGB, alpha: number) => {
      const g = ctx.createRadialGradient(x, y, 0, x, y, r)
      g.addColorStop(0, `rgba(${cr | 0},${cg | 0},${cb | 0},${alpha})`)
      g.addColorStop(1, `rgba(${cr | 0},${cg | 0},${cb | 0},0)`)
      ctx.fillStyle = g
      ctx.fillRect(x - r, y - r, r * 2, r * 2)
    }

    const frame = () => {
      const t = targetRef.current
      for (let c = 0; c < 3; c++) bg[c] = lerp(bg[c], t.bg[c], 0.02)
      speed = lerp(speed, t.speed, 0.02)

      for (const p of pours.current.splice(0)) {
        const a = Math.random() * Math.PI * 2
        drops.push({
          // Pour from around the caret, not one exact point, so a run of
          // words fans out instead of stacking.
          x: w / 2 + (Math.random() - 0.5) * w * 0.25,
          y: h / 2 + (Math.random() - 0.5) * h * 0.1,
          vx: Math.cos(a) * 0.35, vy: Math.sin(a) * 0.35,
          r: 0, max: Math.min(w, h) * (p.big ? 0.5 + Math.random() * 0.2 : 0.18),
          rgb: p.inks[Math.floor(Math.random() * p.inks.length)], alpha: p.big ? 0.95 : 0.35, decay: p.big ? 0.0015 : 0.006,
        })
        stir = Math.min(stir + (p.big ? 1.2 : 0.3), 4)
      }
      drops.splice(0, Math.max(0, drops.length - 20))
      stir *= 0.97
      // Keep the water moving while Jev thinks, so the wait reads as work.
      if (busy.current) stir = Math.max(stir, 0.9)
      const pace = speed * (1 + stir) * motion

      ctx.fillStyle = `rgb(${bg.join()})`
      ctx.fillRect(0, 0, w, h)

      ambient.forEach((b, i) => {
        const want = t.moods[i % t.moods.length].ink[i % 3]
        for (let c = 0; c < 3; c++) b.rgb[c] = lerp(b.rgb[c], want[c], 0.015)
        b.a += (Math.random() - 0.5) * 0.06
        b.x += Math.cos(b.a) * pace * 0.25
        b.y += Math.sin(b.a) * pace * 0.25
        if (b.x < 0 || b.x > w) b.a = Math.PI - b.a
        if (b.y < 0 || b.y > h) b.a = -b.a
        b.x = Math.min(Math.max(b.x, 0), w)
        b.y = Math.min(Math.max(b.y, 0), h)
        blob(b.x, b.y, Math.max(w, h) * b.r, b.rgb, 0.75)
      })

      for (let i = drops.length - 1; i >= 0; i--) {
        const d = drops[i]
        d.r = motion ? lerp(d.r, d.max, 0.03) : d.max
        d.x += d.vx * pace
        d.y += d.vy * pace
        d.alpha -= d.decay
        if (d.alpha <= 0) drops.splice(i, 1)
        else blob(d.x, d.y, d.r, d.rgb, d.alpha)
      }

      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(raf)
      removeEventListener('resize', resize)
    }
  }, [reduced])

  const typing = text.length > 0

  return (
    <div
      data-landing
      className="relative flex h-dvh flex-col overflow-hidden px-4 transition-colors duration-[1500ms] sm:px-[5vw]"
      style={{ color: light ? '#15171b' : '#f3f1ec', background: `rgb(${IDLE.bg.join()})` }}
    >
      <canvas ref={canvas} aria-hidden className="absolute inset-0 size-full" />

      {gateOpen && (
        <ApiKeyGate
          onReady={() => {
            setGateOpen(false)
            onSubmit({ brief: text.trim() })
          }}
          onCancel={() => setGateOpen(false)}
        />
      )}
      {/* Film grain, so the gradients read as pigment rather than a CSS demo. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.09] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />

      <header className="relative flex items-center justify-between pt-[4vh] font-mono text-[0.75rem] opacity-70">
        <span>jev</span>
        <a
          href="/examples"
          // Leaving mid-run drops the request and loses the page being built.
          aria-disabled={running}
          tabIndex={running ? -1 : undefined}
          className={`rounded-full border border-current px-3 py-1.5 transition-opacity ${running ? 'pointer-events-none opacity-30' : 'opacity-90 hover:opacity-100'}`}
        >
          See 6 real examples →
        </a>
      </header>

      <main className="relative grid flex-1 place-items-center">
        <div className="flex w-full flex-col items-center">
          {/* The thesis, until the visitor starts proving it; it returns as the
              verdict once Jev answers. Space is kept so the caret never jumps. */}
          <h1
            className="lab-display mb-[7vh] text-center text-[clamp(2.25rem,5.5vw,4.25rem)] leading-[0.98] transition-opacity duration-700"
            style={{ opacity: typing && !ranked ? 0 : 1 }}
          >
            {ranked ? (
              <em>Decided.</em>
            ) : (
              <>
                Nobody designs this page.
                <br />
                <em>It gets decided.</em>
              </>
            )}
          </h1>
          <BareInput
            value={text}
            onChange={setText}
            onSubmit={submit}
            locked={running}
          />
          {running && run ? (
            <RunStatus run={run} ranked={ranked} />
          ) : typing ? (
            <p aria-live="polite" className="mt-3 h-4 font-mono text-[0.6875rem] tracking-wide opacity-60">
              {found.map((f) => f.key).join('  ·  ')}
            </p>
          ) : (
            // Said upfront, not just after a failed submit: this is the one
            // thing a visitor needs to know before they type anything.
            <p className="mt-3 h-4 font-mono text-[0.6875rem] tracking-wide opacity-60">
              {keySaved ? 'Using your saved OpenRouter key' : 'Needs your OpenRouter key — asked for on enter'}
            </p>
          )}
        </div>
      </main>

      <footer className="relative mx-auto max-w-[60ch] pb-[4vh] text-center font-mono text-[0.6875rem] leading-[1.75] opacity-70">
        Describe what you&rsquo;re building. A model proposes a few page strategies, Jev judges them
        and answers the execution questions, and plain TypeScript locks the winner into a blueprint
        the page is written inside. Runs on your own OpenRouter key.
      </footer>
    </div>
  )
}

/**
 * Under the brief once it's submitted: the live stage, then Jev's answer to the
 * visual question as a readout — the top register in full, the rest dimmer.
 */
function RunStatus({ run, ranked }: { run: GenerationState; ranked: Ranked | null }) {
  const stage = STAGES.find((s) => run.stages[s.key] === 'active')

  return (
    <div aria-live="polite" className="-mt-2 flex flex-col items-center gap-3 font-mono text-[0.6875rem] tracking-wide">
      {ranked && (
        <div className="w-full max-w-[50ch] space-y-1.5">
          {ranked.map((r, i) => (
            <div key={r.option} className="flex items-center gap-2" style={{ opacity: i === 0 ? 1 : 0.55 }}>
              <span className="flex-shrink-0 w-12 tabular-nums text-right">{r.probability.toFixed(2)}</span>
              <span className="flex-shrink-0">▸</span>
              <span className="flex-1 truncate">{pretty(r.option)}</span>
            </div>
          ))}
        </div>
      )}
      <p className="opacity-60">{stage ? `${stage.label}…` : 'Starting…'}</p>
    </div>
  )
}
