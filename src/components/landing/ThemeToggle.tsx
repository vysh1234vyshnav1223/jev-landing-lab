'use client'

import { useSyncExternalStore } from 'react'

/**
 * Theme control.
 *
 * Three states, not two: `system` follows the OS and is the default, so someone
 * who has never touched this gets what their machine already asked for. Picking
 * light or dark pins it and persists.
 */

export type Theme = 'system' | 'light' | 'dark'

const KEY = 'jev-theme'

/**
 * Runs before first paint, so the page never flashes the wrong palette.
 * Inlined in <head> — it must execute before the body renders.
 */
export const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem('${KEY}');if(t==='light'||t==='dark'){document.documentElement.setAttribute('data-theme',t)}}catch(e){}})()`

const listeners = new Set<() => void>()

function subscribe(fn: () => void) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

function emit() {
  listeners.forEach((fn) => fn())
}

function getSnapshot(): Theme {
  const t = document.documentElement.getAttribute('data-theme')
  return t === 'light' || t === 'dark' ? t : 'system'
}

function apply(theme: Theme) {
  const root = document.documentElement
  if (theme === 'system') root.removeAttribute('data-theme')
  else root.setAttribute('data-theme', theme)
}

export function ThemeToggle() {
  // The DOM is the source of truth: the inline head script has already applied
  // the stored choice, so read it back rather than re-deriving it in an effect.
  const theme = useSyncExternalStore(subscribe, getSnapshot, () => 'system' as Theme)

  function choose(next: Theme) {
    apply(next)
    try {
      if (next === 'system') localStorage.removeItem(KEY)
      else localStorage.setItem(KEY, next)
    } catch {
      // Not persisting is survivable; the page still switches.
    }
    emit()
  }

  const options: { value: Theme; label: string }[] = [
    { value: 'light', label: 'light' },
    { value: 'dark', label: 'dark' },
    { value: 'system', label: 'auto' },
  ]

  return (
    <div
      role="radiogroup"
      aria-label="Colour theme"
      className="inline-flex items-center border border-[var(--hair)]"
    >
      {options.map((o) => {
        const active = theme === o.value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => choose(o.value)}
            className={
              'px-2 py-1 font-mono text-[0.6875rem] transition-colors ' +
              (active
                ? 'bg-[var(--sodium)] text-[var(--ink)]'
                : 'text-[var(--dim)] hover:text-[var(--paper)]')
            }
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
