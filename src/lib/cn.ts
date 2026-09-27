/** Minimal class joiner. clsx would be a dependency for nine lines. */
export function cn(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ')
}
