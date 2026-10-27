import { useId, type CSSProperties } from 'react'

const BEAD_COUNT = 24
const RADIUS = 19
const CENTRE = 24

/** Bead positions around the ring, the sumeru (the larger bead a chanter turns back at) at the top. */
const BEADS = Array.from({ length: BEAD_COUNT }, (_, index) => {
  const angle = -Math.PI / 2 + (index / BEAD_COUNT) * 2 * Math.PI
  return { x: CENTRE + RADIUS * Math.cos(angle), y: CENTRE + RADIUS * Math.sin(angle) }
})

/** One lotus petal rising from the flower's base; the others are rotations of it. */
const PETAL = 'M0 0C3.6-4.6 3.6-10.6 0-14.6-3.6-10.6-3.6-4.6 0 0Z'

/**
 * A japa-mālā around a lotus: the beads of the vow, the lotus of surrender. Motion lives in index.css
 * (the beads thread in, the lotus opens, the ring turns) and stops for devotees who prefer reduced motion.
 */
export function LogoMark({ className = 'size-10' }: { className?: string }) {
  // Gradient ids must be unique per copy: a page shows the mark twice (sidebar and phone header, one of them
  // hidden), and a fill that points into a hidden copy renders nothing.
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const beadFill = `logo-${uid}-bead`
  const petalFill = `logo-${uid}-petal`
  const frontFill = `logo-${uid}-front`
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" className={`logo-mark shrink-0 ${className}`}>
      <defs>
        <radialGradient id={beadFill} cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#fde7b0" />
          <stop offset="55%" stopColor="#e87a00" />
          <stop offset="100%" stopColor="#8a3a00" />
        </radialGradient>
        <linearGradient id={petalFill} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#b34700" />
          <stop offset="55%" stopColor="#d35400" />
          <stop offset="100%" stopColor="#f2b04a" />
        </linearGradient>
        <linearGradient id={frontFill} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#d35400" />
          <stop offset="60%" stopColor="#f2b04a" />
          <stop offset="100%" stopColor="#fde7b0" />
        </linearGradient>
      </defs>
      <g className="logo-ring">
        <g className="logo-turn">
          <circle cx={CENTRE} cy={CENTRE} r={RADIUS} fill="none" stroke="#d35400" strokeOpacity="0.28" strokeWidth="0.6" />
          {BEADS.map((bead, index) => (
            <circle
              key={index}
              className={index === 0 ? 'logo-bead logo-sumeru' : 'logo-bead'}
              style={{ '--i': index } as CSSProperties}
              cx={bead.x}
              cy={bead.y}
              r={index === 0 ? 2.9 : 1.75}
              fill={`url(#${beadFill})`}
            />
          ))}
        </g>
      </g>
      {/* The position stays on this outer group: a CSS transform on the animated group would replace it. */}
      <g transform="translate(24 31.5)">
        <g className="logo-lotus">
          {[-52, 52].map((angle) => (
            <path key={angle} d={PETAL} fill={`url(#${petalFill})`} opacity="0.85" transform={`rotate(${angle}) scale(0.78)`} />
          ))}
          {[-26, 26].map((angle) => (
            <path key={angle} d={PETAL} fill={`url(#${petalFill})`} transform={`rotate(${angle}) scale(0.92)`} />
          ))}
          <path d={PETAL} fill={`url(#${frontFill})`} />
          <circle cx="0" cy="-3.2" r="1.5" fill="#1b4f72" />
        </g>
      </g>
    </svg>
  )
}
