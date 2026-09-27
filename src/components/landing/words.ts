/**
 * Keyword matching for the reactive landings. Runs on every keystroke in the
 * browser — no model call — so it has to be cheap and forgiving.
 */

export function words(text: string) {
  return text.toLowerCase().match(/[a-z]+/g) ?? []
}

/**
 * Short triggers match exactly (or with a plural s) so "car" misses "career";
 * longer ones take up to three trailing letters, so "flight" catches "flights"
 * and "meditat" catches "meditation" without a stemmer.
 */
function hits(word: string, trigger: string) {
  if (trigger.length < 4) return word === trigger || word === `${trigger}s`
  return word.startsWith(trigger) && word.length - trigger.length <= 3
}

/** Every key of `dict` a single word triggers. */
export function keysFor<K extends string>(word: string, dict: Record<K, string[]>) {
  return (Object.keys(dict) as K[]).filter((key) => dict[key].some((t) => hits(word, t)))
}

/** Keys of `dict` the text mentions, in first-mention order, with the word that did it. */
export function matches<K extends string>(text: string, dict: Record<K, string[]>) {
  const found = new Map<K, string>()
  for (const w of words(text)) {
    for (const key of keysFor(w, dict)) if (!found.has(key)) found.set(key, w)
  }
  return [...found].map(([key, word]) => ({ key, word }))
}
