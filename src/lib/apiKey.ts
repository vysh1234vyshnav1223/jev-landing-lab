'use client'

/**
 * The visitor's own OpenRouter key. Session-only, never persisted past the
 * tab closing, never sent anywhere but our own API routes as a header — the
 * server never writes it to a variable that outlives the request.
 */
const KEY = 'jev-openrouter-key'

const listeners = new Set<() => void>()

/**
 * For components that need to react to the key appearing (e.g. a hint that
 * flips from "needs a key" to "using your saved key") without an effect that
 * calls setState on mount — see ThemeToggle for the same pattern.
 */
export function subscribeApiKey(fn: () => void) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function getApiKey(): string | null {
  try {
    return sessionStorage.getItem(KEY)
  } catch {
    return null
  }
}

/** Cheap presence check for UI hints, so callers don't all repeat !!getApiKey(). */
export function hasApiKey(): boolean {
  return Boolean(getApiKey())
}

export function setApiKey(key: string) {
  try {
    sessionStorage.setItem(KEY, key)
  } catch {
    // Private browsing / blocked storage: the key just won't persist across
    // reloads. Not worth failing the run over.
  }
  listeners.forEach((fn) => fn())
}

export function clearApiKey() {
  try {
    sessionStorage.removeItem(KEY)
  } catch {
    // See above.
  }
  listeners.forEach((fn) => fn())
}

/** The header both /api/generate and /api/compare read the key from. */
export function apiKeyHeaders(): Record<string, string> {
  const key = getApiKey()
  return key ? { 'X-OpenRouter-Key': key } : {}
}
