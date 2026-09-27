'use client'

import { useState } from 'react'
import { motion } from 'motion/react'
import { getApiKey, setApiKey } from '@/lib/apiKey'
import { transition } from '@/lib/motion/tokens'

/**
 * BYOK gate: shown only when a visitor tries to run something and no key is
 * stored yet. The key never leaves the browser except as a header on our own
 * two API routes — see `apiKeyHeaders()`. Session-only by design: closing the
 * tab forgets it.
 */
export function ApiKeyGate({ onReady, onCancel }: { onReady: () => void; onCancel: () => void }) {
  const [value, setValue] = useState('')

  function submit() {
    const key = value.trim()
    if (!key) return
    setApiKey(key)
    onReady()
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={transition.normal}
      className="absolute inset-0 z-10 grid place-items-center bg-black/55 px-4 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <div className="w-full max-w-[30rem] rounded-lg border border-white/15 bg-[#0d0e11] p-6 text-[#f3f1ec] shadow-2xl">
        <h2 className="lab-display text-[1.5rem]">Bring your own key</h2>
        <p className="mt-2 font-mono text-[0.8125rem] leading-relaxed opacity-70">
          This runs on your own OpenRouter key, so it costs nothing to host and nothing to try. One
          key covers both Jev&rsquo;s decisions and the model that writes the page.
        </p>

        <input
          autoFocus
          type="password"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="sk-or-v1-…"
          aria-label="OpenRouter API key"
          className="mt-5 w-full rounded-md border border-white/15 bg-white/5 px-3 py-2.5 font-mono text-[0.875rem] outline-none placeholder:opacity-40 focus-visible:border-white/40"
        />

        <div className="mt-4 flex items-center justify-between gap-3">
          <a
            href="https://openrouter.ai/keys"
            target="_blank"
            rel="noreferrer"
            className="font-mono text-[0.75rem] underline opacity-70 hover:opacity-100"
          >
            Get a key at openrouter.ai ↗
          </a>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-md px-3 py-1.5 font-mono text-[0.75rem] opacity-60 hover:opacity-100"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={!value.trim()}
              className="rounded-md bg-[#f3f1ec] px-3.5 py-1.5 font-mono text-[0.75rem] text-[#0d0e11] disabled:opacity-30"
            >
              Continue
            </button>
          </div>
        </div>

        <p className="mt-4 font-mono text-[0.6875rem] opacity-40">
          Stored only in this browser tab. Sent to our server only as a header on this request —
          never logged, never saved.
        </p>
      </div>
    </motion.div>
  )
}

export { getApiKey }
