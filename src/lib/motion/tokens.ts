import type { Transition, Variants } from 'motion/react'

/**
 * Centralized motion. Durations and springs are chosen once here so the whole
 * app shares a physical feel; components never invent their own numbers.
 *
 * Reduced motion is honoured two ways: globally in CSS, and per-component via
 * `useReducedMotion()` for transforms CSS can't neutralise.
 */

export const ease = {
  /** Default for entrances — decelerating, no overshoot. */
  out: [0.16, 1, 0.3, 1],
  /** Symmetric, for things that move both ways. */
  inOut: [0.65, 0, 0.35, 1],
} as const

export const duration = {
  fast: 0.14,
  normal: 0.24,
  slow: 0.4,
  deliberate: 0.7,
} as const

export const transition = {
  fast: { duration: duration.fast, ease: ease.out },
  normal: { duration: duration.normal, ease: ease.out },
  slow: { duration: duration.slow, ease: ease.out },

  /** Interactive controls — press and release. */
  spring: { type: 'spring', stiffness: 420, damping: 32, mass: 0.7 },
  /** Layout shifts and shared-element moves. */
  gentle: { type: 'spring', stiffness: 260, damping: 30, mass: 0.9 },
  /** Panels and large surfaces. */
  soft: { type: 'spring', stiffness: 180, damping: 26 },
} satisfies Record<string, Transition>

/** Standard staggered entrance for lists. */
export const listContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.045, delayChildren: 0.04 } },
}

export const listItem: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: transition.normal },
}

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: transition.slow },
  exit: { opacity: 0, y: -8, transition: transition.fast },
}

export const fade: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: transition.normal },
  exit: { opacity: 0, transition: transition.fast },
}

/** Press feedback shared by every control. Subtle — no bouncing. */
export const press = { scale: 0.975 } as const
export const lift = { y: -2 } as const
