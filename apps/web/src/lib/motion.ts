import type { Variants } from 'motion/react'
import { useSyncExternalStore } from 'react'

const QUERY = '(prefers-reduced-motion: reduce)'

const subscribe = (onChange: () => void) => {
  const list = window.matchMedia(QUERY)
  list.addEventListener('change', onChange)
  return () => list.removeEventListener('change', onChange)
}

export const usePrefersReducedMotion = () => useSyncExternalStore(subscribe, () => window.matchMedia(QUERY).matches)

export const stagger: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } }

export const rise: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
}
