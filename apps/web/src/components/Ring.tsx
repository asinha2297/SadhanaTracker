import { motion } from 'motion/react'

const RADIUS = 34
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

export function Ring({ percent, label, caption }: { percent: number; label: string; caption: string }) {
  const offset = CIRCUMFERENCE * (1 - Math.min(100, percent) / 100)
  return (
    <figure className="flex flex-col items-center text-center">
      <svg viewBox="0 0 80 80" className="size-24" role="img" aria-label={`${label}: ${percent}%`}>
        <circle cx="40" cy="40" r={RADIUS} className="fill-none stroke-line" strokeWidth="8" />
        <motion.circle
          cx="40"
          cy="40"
          r={RADIUS}
          className={`fill-none ${percent >= 100 ? 'stroke-tulasi' : 'stroke-saffron'}`}
          strokeWidth="8"
          strokeLinecap="round"
          transform="rotate(-90 40 40)"
          strokeDasharray={CIRCUMFERENCE}
          initial={{ strokeDashoffset: CIRCUMFERENCE }}
          animate={{ strokeDashoffset: offset }}
          transition={{ type: 'spring', stiffness: 60, damping: 18 }}
        />
        <text x="40" y="45" textAnchor="middle" className="fill-ink text-[15px] font-semibold">
          {percent}%
        </text>
      </svg>
      <figcaption className="mt-1 text-sm font-medium text-ink">
        {label}
        <span className="block text-xs font-normal text-ink-muted">{caption}</span>
      </figcaption>
    </figure>
  )
}
