'use client'

import { motion } from 'motion/react'
import { AlertTriangle, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/primitives'
import { transition } from '@/lib/motion/tokens'

/**
 * Polished failure states.
 *
 * The user always learns which stage broke and whether Jev was involved —
 * never a stack trace. When Jev succeeded and a later stage failed, we say so,
 * because that distinction is the whole point of this product.
 */
const COPY: Record<string, { title: string; body: string; retry: string }> = {
  INVALID_INPUT: {
    title: 'That brief needs a little more.',
    body: 'Add a sentence or two about what the product is and who it is for.',
    retry: 'Edit brief',
  },
  NO_API_KEY: {
    title: 'Add an OpenRouter key to run this.',
    body: 'This runs on your own OpenRouter key so it costs us nothing to host. It covers both Jev and the page-writing model.',
    retry: 'Add key',
  },
  JEV_UNAVAILABLE: {
    title: "We couldn't reach Jev.",
    body: 'Jev makes every design decision here, so there is nothing sensible to generate without it. No decisions were faked.',
    retry: 'Try again',
  },
  JEV_MALFORMED: {
    title: 'Jev responded in a shape we did not expect.',
    body: 'The Decisions API is still in alpha. Rather than guess at the missing answers, we stopped.',
    retry: 'Try again',
  },
  LLM_FAILED: {
    title: 'The generation step failed.',
    body: 'The model that writes the page copy did not respond.',
    retry: 'Try again',
  },
  LLM_MALFORMED: {
    title: "The model's output didn't fit the schema.",
    body: 'We asked it to correct itself once and it still came back malformed. Free models vary in quality — another attempt will likely route elsewhere.',
    retry: 'Try again',
  },
  RATE_LIMITED: {
    title: 'Rate limit reached.',
    body: 'OpenRouter allows 50 free-model requests per day, and 20 per minute. Wait a moment, or add credit to raise the daily cap.',
    retry: 'Try again',
  },
  TIMEOUT: {
    title: 'That took too long.',
    body: 'The model did not respond in time. Free models can queue under load.',
    retry: 'Try again',
  },
}

export function ErrorState({
  code,
  message,
  jevSucceeded,
  onRetry,
  onRestart,
}: {
  code: string
  message: string
  jevSucceeded: boolean
  onRetry: () => void
  onRestart: () => void
}) {
  const copy = COPY[code] ?? {
    title: 'Something went wrong.',
    body: message,
    retry: 'Try again',
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={transition.slow}
      className="mx-auto flex w-full max-w-md flex-col items-center gap-4 text-center"
    >
      <span className="grid size-10 place-items-center rounded-full border border-[var(--lab-danger)]/30 bg-[var(--lab-danger)]/10">
        <AlertTriangle className="size-4.5 text-[var(--lab-danger)]" />
      </span>

      <div className="flex flex-col gap-2">
        <h2 className="text-[1.25rem] font-semibold tracking-tight">{copy.title}</h2>
        <p className="text-pretty text-[0.9375rem] leading-relaxed text-[var(--lab-text-muted)]">
          {copy.body}
        </p>
      </div>

      {jevSucceeded && (
        <Badge tone="positive">Jev&rsquo;s decisions completed — they are still below</Badge>
      )}

      <div className="mt-1 flex items-center gap-2">
        <Button onClick={onRetry}>
          <RotateCcw className="size-3.5" />
          {copy.retry}
        </Button>
        <Button variant="ghost" onClick={onRestart}>
          Start over
        </Button>
      </div>

      <p className="font-mono text-[0.6875rem] text-[var(--lab-text-faint)]">{code}</p>
    </motion.div>
  )
}
