'use client'

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { BareInput } from '@/components/landing/BareInput'
import { ThemeToggle } from '@/components/landing/ThemeToggle'
import { matches, words } from '@/components/landing/words'
import type { BriefInput } from '@/schemas/brief'

/**
 * Landing experiment: the ghost page.
 *
 * An empty screen and a caret. As the visitor describes their product, a faint
 * wireframe of *their* landing page draws itself behind the words — "flights"
 * sketches a search bar, "budget" a pricing table, "trust" a logo row. Each
 * piece is tagged with the word that summoned it. Pure keyword matching in the
 * browser; the only model call is still the one on Enter.
 */

const PIECES = {
  search: ['search', 'find', 'book', 'flight', 'hotel', 'travel', 'trip', 'rent', 'property', 'job', 'compare', 'airline'],
  signup: ['signup', 'sign', 'waitlist', 'join', 'newsletter', 'launch', 'early', 'beta', 'subscribe', 'trial', 'free'],
  product: ['app', 'tool', 'software', 'platform', 'dashboard', 'saas', 'ai', 'api', 'developer', 'code', 'analytics', 'workflow'],
  phone: ['mobile', 'phone', 'ios', 'android', 'download', 'app'],
  video: ['video', 'watch', 'demo', 'stream', 'music', 'podcast', 'film', 'course'],
  logos: ['trust', 'secure', 'security', 'bank', 'enterprise', 'compliance', 'partner', 'company', 'companies', 'team', 'b2b'],
  price: ['price', 'pricing', 'cheap', 'budget', 'afford', 'cost', 'fee', 'discount', 'deal', 'save', 'plan', 'subscription', 'tax'],
  metrics: ['fast', 'growth', 'data', 'revenue', 'percent', 'million', 'number', 'result', 'metric', 'performance', 'analytics'],
  testimonial: ['review', 'customer', 'community', 'love', 'rating', 'recommend', 'parent', 'patient', 'sceptic', 'skeptic', 'proof'],
  gallery: ['food', 'restaurant', 'fashion', 'photo', 'art', 'design', 'portfolio', 'shop', 'store', 'menu', 'recipe', 'clothing', 'furniture', 'wedding', 'skincare', 'serum', 'product'],
  map: ['local', 'city', 'near', 'nearby', 'delivery', 'location', 'map', 'ride', 'india', 'neighbourhood', 'neighborhood', 'region'],
  calendar: ['event', 'schedule', 'appointment', 'class', 'meeting', 'calendar', 'date', 'reserve', 'reservation', 'booking'],
  chat: ['chat', 'support', 'help', 'talk', 'message', 'assistant', 'coach', 'therapy', 'advice', 'concierge'],
} satisfies Record<string, string[]>

type Key = keyof typeof PIECES

export function GhostLanding({ onSubmit }: { onSubmit: (input: BriefInput) => void }) {
  const [text, setText] = useState('')
  const found = matches(text, PIECES)
  const tag = Object.fromEntries(found.map((f) => [f.key, f.word])) as Partial<Record<Key, string>>
  const count = words(text).length
  const fresh = useFresh(found.map((f) => f.key))

  const piece = (key: Key) => ({ on: key in tag, word: tag[key], fresh: fresh === key })

  return (
    <div
      data-landing
      className="relative grid h-dvh place-items-center overflow-hidden bg-[var(--ink)] px-4 text-[var(--paper)]"
    >
      {/* The ghost page. Decorative — the brief itself is the content. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 grid grid-cols-12 grid-rows-[2.25rem_minmax(0,1.7fr)_2.5rem_minmax(0,1fr)_minmax(0,1fr)] gap-x-[2vw] gap-y-[3.5vh] px-[5vw] py-[4vh] text-[var(--dim)]"
      >
        <Piece on={count > 0} className="col-span-12 flex items-center gap-[2vw]">
          <Bar w="4.5rem" h="0.8rem" />
          <span className="ml-auto hidden gap-[1.6vw] sm:flex">
            {[3.5, 4, 3, 4.5].map((w, i) => (
              <Bar key={i} w={`${w}rem`} h="0.4rem" />
            ))}
          </span>
          <Box className="h-7 w-20 rounded-md" />
        </Piece>

        {/* Hero, left: headline grows with the brief, then search / signup. */}
        <div className="col-span-12 flex flex-col justify-center gap-[2.2vh] sm:col-span-6">
          <Piece on={count > 0} className="flex flex-col gap-[1.4vh]">
            <Bar w="92%" h="clamp(1rem,2.4vw,2rem)" />
            <Bar w={count > 3 ? '64%' : '0%'} h="clamp(1rem,2.4vw,2rem)" />
            {Array.from({ length: Math.min(4, Math.ceil(count / 7)) }, (_, i) => (
              <Bar key={i} w={`${[78, 70, 74, 52][i]}%`} h="0.45rem" className="first:mt-2" />
            ))}
          </Piece>
          <Piece {...piece('search')}>
            <Box className="flex h-[clamp(2.75rem,6vh,3.75rem)] items-center gap-[1.2vw] rounded-xl px-4">
              {[26, 26, 18].map((w, i) => (
                <span key={i} className="flex h-full items-center border-r border-current pr-[1.2vw]" style={{ width: `${w}%` }}>
                  <Bar w="70%" h="0.4rem" />
                </span>
              ))}
              <Fill className="ml-auto h-[62%] w-[18%] rounded-lg" />
            </Box>
          </Piece>
          <Piece {...piece('signup')} className="flex gap-2">
            <Box className="flex h-11 w-[58%] items-center rounded-lg px-3">
              <Bar w="45%" h="0.4rem" />
            </Box>
            <Fill className="h-11 w-[24%] rounded-lg" />
          </Piece>
        </div>

        {/* Hero, right: product window with phone and play button over it. */}
        <div className="relative col-span-6 hidden sm:block">
          <Piece {...piece('product')} className="absolute inset-0">
            <Box className="flex h-full flex-col rounded-xl">
              <span className="flex gap-1.5 border-b border-current p-2.5">
                {[0, 1, 2].map((i) => (
                  <Box key={i} className="size-2 rounded-full" />
                ))}
              </span>
              <span className="flex flex-1 gap-3 p-3">
                <span className="flex w-[22%] flex-col gap-2 border-r border-current pr-3">
                  {[80, 60, 70, 50, 65].map((w, i) => (
                    <Bar key={i} w={`${w}%`} h="0.4rem" />
                  ))}
                </span>
                <span className="grid flex-1 grid-cols-3 grid-rows-2 gap-2">
                  <Box className="col-span-2 rounded-md" />
                  <Box className="rounded-md" />
                  <Box className="rounded-md" />
                  <Box className="col-span-2 rounded-md" />
                </span>
              </span>
            </Box>
          </Piece>
          <Piece {...piece('video')} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <Box className="grid size-[clamp(3rem,6vw,5rem)] place-items-center rounded-full">
              <span className="ml-1 border-y-[0.7rem] border-l-[1.1rem] border-y-transparent border-l-current" />
            </Box>
          </Piece>
          <Piece {...piece('phone')} className="absolute right-[-3%] bottom-[-10%] w-[22%]">
            <Box className="flex aspect-[9/19] flex-col gap-2 rounded-[1.1vw] bg-[var(--ink)] p-[0.8vw]">
              <Bar w="40%" h="0.3rem" className="mx-auto" />
              <Box className="h-[35%] rounded-md" />
              <Bar w="80%" h="0.35rem" />
              <Bar w="60%" h="0.35rem" />
              <Fill className="mt-auto h-[10%] rounded-md" />
            </Box>
          </Piece>
        </div>

        <Piece {...piece('logos')} className="col-span-12 flex items-center justify-around">
          {[7, 5, 8, 6, 7, 5].map((w, i) => (
            <Bar key={i} w={`${w}%`} h="0.7rem" />
          ))}
        </Piece>

        <Piece {...piece('price')} className="col-span-4 grid grid-cols-3 gap-[0.8vw]">
          {[0, 1, 2].map((i) => (
            <Box key={i} className={cn('flex flex-col gap-2 rounded-lg p-[0.8vw]', i === 1 && 'border-2')}>
              <Bar w="50%" h="0.35rem" />
              <Bar w="70%" h="clamp(0.8rem,1.6vw,1.4rem)" />
              <Bar w="85%" h="0.3rem" />
              <Bar w="65%" h="0.3rem" />
              <Fill className="mt-auto h-[18%] rounded-md" />
            </Box>
          ))}
        </Piece>

        <Piece {...piece('metrics')} className="col-span-4 flex flex-col gap-3">
          <span className="flex justify-between">
            {[0, 1, 2].map((i) => (
              <span key={i} className="flex w-[28%] flex-col gap-1.5">
                <Bar w="80%" h="clamp(0.9rem,1.8vw,1.5rem)" />
                <Bar w="55%" h="0.3rem" />
              </span>
            ))}
          </span>
          <span className="flex flex-1 items-end gap-[0.5vw] border-b border-current">
            {[30, 45, 38, 60, 52, 74, 68, 90].map((h, i) => (
              <Fill key={i} className="flex-1 rounded-t-sm" style={{ height: `${h}%` }} />
            ))}
          </span>
        </Piece>

        <Piece {...piece('testimonial')} className="col-span-4">
          <Box className="flex h-full flex-col gap-2.5 rounded-lg p-[1.2vw]">
            <span className="flex gap-1">
              {[0, 1, 2, 3, 4].map((i) => (
                <Fill key={i} className="size-2.5 rotate-45 rounded-[2px]" />
              ))}
            </span>
            <Bar w="92%" h="0.4rem" />
            <Bar w="84%" h="0.4rem" />
            <Bar w="60%" h="0.4rem" />
            <span className="mt-auto flex items-center gap-2">
              <Box className="size-7 rounded-full" />
              <Bar w="30%" h="0.35rem" />
            </span>
          </Box>
        </Piece>

        <Piece {...piece('gallery')} className="col-span-4 grid grid-cols-3 grid-rows-2 gap-[0.6vw]">
          {Array.from({ length: 6 }, (_, i) => (
            <Box key={i} className={cn('rounded-md', i === 0 && 'row-span-2')} />
          ))}
        </Piece>

        <Piece {...piece('map')} className="col-span-4">
          <Box className="relative h-full overflow-hidden rounded-lg">
            <svg viewBox="0 0 200 100" preserveAspectRatio="none" className="absolute inset-0 size-full" fill="none" stroke="currentColor" strokeWidth="0.8">
              <path d="M0 70 C40 60 60 20 110 30 S170 80 200 55" />
              <path d="M30 0 C35 40 70 60 60 100" />
              <path d="M140 0 C130 30 150 60 190 100" />
              <path d="M0 30 L200 45" strokeDasharray="3 3" />
            </svg>
            <span className="absolute top-[34%] left-[54%] flex flex-col items-center">
              <Fill className="size-3.5 rounded-full" />
              <span className="h-2 w-px bg-current" />
            </span>
          </Box>
        </Piece>

        <Piece {...piece('calendar')} className="col-span-4">
          <Box className="grid h-full grid-cols-7 gap-[0.3vw] rounded-lg p-[0.8vw]">
            {Array.from({ length: 28 }, (_, i) =>
              i === 17 ? <Fill key={i} className="rounded-sm" /> : <Box key={i} className="rounded-sm" />,
            )}
          </Box>
        </Piece>
      </div>

      <Piece {...piece('chat')} className="pointer-events-none absolute right-[4vw] bottom-[4vh] flex items-end gap-2">
        <Box className="mb-8 flex w-44 flex-col gap-1.5 rounded-xl rounded-br-none p-3 text-[var(--dim)]">
          <Bar w="85%" h="0.35rem" />
          <Bar w="55%" h="0.35rem" />
        </Box>
        <Fill className="size-11 rounded-full text-[var(--dim)]" />
      </Piece>

      {/* Keeps the brief legible over whatever the ghost has drawn. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(ellipse 34rem 11rem at 50% 50%, var(--ink) 35%, transparent 100%)' }}
      />

      <BareInput value={text} onChange={setText} onSubmit={(brief) => onSubmit({ brief })} style={{ position: 'relative' }} />

      <footer className="absolute bottom-[4vh] left-[5vw] flex items-center gap-4 font-mono text-[0.6875rem] text-[var(--dim)]">
        <span className="text-[var(--paper)]">jev</span>
        <ThemeToggle />
      </footer>
    </div>
  )
}

/** The piece that most recently appeared, for ~1.6s — so it can flash its tag. */
function useFresh(keys: Key[]) {
  const [fresh, setFresh] = useState<Key | null>(null)
  const prev = useRef<Key[]>([])
  const sig = keys.join()

  useEffect(() => {
    const added = keys.find((k) => !prev.current.includes(k))
    prev.current = keys
    if (!added) return
    setFresh(added)
    const t = setTimeout(() => setFresh(null), 1600)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on the joined signature
  }, [sig])

  return fresh
}

/**
 * One wireframe piece. Wipes in left to right; the tag above it names the word
 * that summoned it, and glows amber while fresh.
 */
function Piece({
  on,
  word,
  fresh,
  className,
  children,
}: {
  on: boolean
  word?: string
  fresh?: boolean
  className?: string
  children: ReactNode
}) {
  return (
    <div
      aria-hidden
      // cn only joins, so never pair `relative` with a caller's `absolute`.
      className={cn(!className?.includes('absolute') && 'relative', 'transition-[opacity,clip-path,color] duration-[900ms] ease-[cubic-bezier(0.16,1,0.3,1)]', className)}
      style={{
        opacity: on ? (fresh ? 0.95 : 0.42) : 0,
        clipPath: on ? 'inset(-1.5rem -1rem -1rem -1rem)' : 'inset(-1.5rem 100% -1rem -1rem)',
        color: fresh ? 'var(--sodium)' : undefined,
      }}
    >
      {children}
      {word && (
        <span className="absolute -top-[1.15rem] left-0 font-mono text-[0.625rem] tracking-wide">
          {word}
        </span>
      )}
    </div>
  )
}

function Bar({ w, h, className }: { w: string; h: string; className?: string }) {
  return (
    <i
      className={cn('block shrink-0 rounded-[3px] bg-current opacity-70 transition-[width] duration-700', className)}
      style={{ width: w, height: h }}
    />
  )
}

function Box({ className, children }: { className?: string; children?: ReactNode }) {
  return <span className={cn('block border border-current', className)}>{children}</span>
}

function Fill({ className, style }: { className?: string; style?: CSSProperties }) {
  return <span className={cn('block bg-current opacity-60', className)} style={style} />
}
