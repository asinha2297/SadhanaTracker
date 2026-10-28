import { motion, useMotionValue, useScroll, useSpring, useTransform } from 'motion/react'
import { useRef, type PointerEvent } from 'react'
import { EYEBROW } from '../../components/styles'
import { useT } from '../../i18n'
import { HERO_PORTRAIT_SRC } from '../../lib/landing'
import { rise, stagger, usePrefersReducedMotion } from '../../lib/motion'
import { Ways } from './Ways'

const BEAD_COUNT = 108
const RADIUS = 184
const BEADS = Array.from({ length: BEAD_COUNT }, (_, index) => {
  const angle = (index / BEAD_COUNT) * 2 * Math.PI
  return { x: 200 + RADIUS * Math.cos(angle), y: 200 + RADIUS * Math.sin(angle), big: index % 27 === 0 }
})

/** Warm sparks rising around the portrait, like the light of a ghee lamp. Positions are fixed so renders match. */
const SPARKS = Array.from({ length: 10 }, (_, index) => ({
  left: `${12 + ((index * 37) % 76)}%`,
  top: `${58 + ((index * 23) % 34)}%`,
  size: 3 + (index % 3),
  delay: index * 0.9,
  duration: 6 + (index % 4),
}))

/** The 108-bead mālā. A highlight steps bead by bead, as fingers move when chanting japa (see index.css). */
function MalaRing({ reduced }: { reduced: boolean }) {
  return (
    <motion.svg
      viewBox="0 0 400 400"
      aria-hidden
      className="absolute inset-0 h-full w-full"
      animate={reduced ? undefined : { rotate: 360 }}
      transition={{ duration: 360, repeat: Infinity, ease: 'linear' }}
    >
      <defs>
        <radialGradient id="mala-bead" cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#fde7b0" />
          <stop offset="55%" stopColor="#e87a00" />
          <stop offset="100%" stopColor="#8a3a00" />
        </radialGradient>
      </defs>
      <circle cx="200" cy="200" r={RADIUS} fill="none" stroke="#d35400" strokeOpacity="0.35" strokeWidth="0.8" />
      <g opacity="0.85">
        {BEADS.map((bead, index) => (
          <circle key={index} cx={bead.x} cy={bead.y} r={index === 0 ? 6.5 : bead.big ? 4.6 : 2.9} fill="url(#mala-bead)" />
        ))}
      </g>
      {!reduced && (
        <g className="mala-counter">
          <circle cx={200 + RADIUS} cy="200" r="5.5" fill="#fff4d6" />
        </g>
      )}
    </motion.svg>
  )
}

function Portrait() {
  const t = useT()
  const reduced = usePrefersReducedMotion()
  const pointerX = useMotionValue(0)
  const pointerY = useMotionValue(0)
  const springX = useSpring(pointerX, { stiffness: 70, damping: 18 })
  const springY = useSpring(pointerY, { stiffness: 70, damping: 18 })
  const rotateY = useTransform(springX, [-0.5, 0.5], [-9, 9])
  const rotateX = useTransform(springY, [-0.5, 0.5], [7, -7])
  const ringShiftX = useTransform(springX, [-0.5, 0.5], [-10, 10])
  const ringShiftY = useTransform(springY, [-0.5, 0.5], [-10, 10])

  const follow = (event: PointerEvent<HTMLDivElement>) => {
    if (reduced || event.pointerType !== 'mouse') return
    const box = event.currentTarget.getBoundingClientRect()
    pointerX.set((event.clientX - box.left) / box.width - 0.5)
    pointerY.set((event.clientY - box.top) / box.height - 0.5)
  }
  const settle = () => {
    pointerX.set(0)
    pointerY.set(0)
  }

  return (
    <div className="relative mx-auto w-full max-w-[26rem] pb-40">
      <motion.div
        onPointerMove={follow}
        onPointerLeave={settle}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.1, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
        className="relative aspect-square w-full [perspective:1200px]"
      >
        <motion.div
          aria-hidden
          className="absolute -inset-[14%] rounded-full bg-[radial-gradient(circle,rgb(232_122_0/0.3),rgb(232_122_0/0.1)_42%,transparent_68%)] blur-2xl"
          animate={reduced ? undefined : { scale: [1, 1.07, 1], opacity: [0.75, 1, 0.75] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div style={reduced ? undefined : { rotateX, rotateY }} className="relative h-full w-full [transform-style:preserve-3d]">
          <motion.div style={reduced ? undefined : { x: ringShiftX, y: ringShiftY }} className="absolute inset-0">
            <MalaRing reduced={reduced} />
          </motion.div>

          <motion.figure
            aria-label={t.landing.prabhupadaName}
            initial={{ opacity: 0, scale: 0.86, filter: 'blur(10px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            transition={{ duration: 1.2, delay: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-[13%] m-0"
          >
            {!reduced && <div aria-hidden className="portrait-sweep absolute -inset-[5px] rounded-full" />}
            {/* A marigold ring with a white keyline inside it, so the portrait sits cleanly on the sandalwood page. */}
            <div className="relative h-full w-full rounded-full bg-gradient-to-br from-[#e87a00] via-[#f2b04a] to-[#d35400] p-[3px] shadow-[0_40px_90px_-35px_rgb(138_58_0/0.55)]">
              <div className="h-full w-full overflow-hidden rounded-full border-[3px] border-card bg-card">
                <img
                  src={HERO_PORTRAIT_SRC}
                  alt={t.landing.portraitAlt}
                  className={`h-full w-full object-cover ${reduced ? '' : 'portrait-drift'}`}
                />
              </div>
            </div>
            {/* Straddles the top of the frame, above his head at every size. */}
            <div className="absolute inset-x-0 -top-5 flex justify-center">
              <motion.figcaption
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.3, duration: 0.6, ease: 'easeOut' }}
                className="rounded-full border border-line bg-card px-4 py-1.5 text-center shadow-card"
              >
                <span className="block font-serif text-[15px] leading-tight text-ink">{t.landing.prabhupadaName}</span>
                <span className="block text-[9px] font-semibold uppercase tracking-[0.16em] text-saffron-text">
                  {t.landing.prabhupadaTitle}
                </span>
              </motion.figcaption>
            </div>
          </motion.figure>
        </motion.div>

        {!reduced &&
          SPARKS.map((spark, index) => (
            <motion.span
              key={index}
              aria-hidden
              className="pointer-events-none absolute rounded-full bg-[#f6c66a] shadow-[0_0_10px_2px_rgb(246_198_106/0.75)]"
              style={{ left: spark.left, top: spark.top, width: spark.size, height: spark.size }}
              animate={{ y: [0, -90], opacity: [0, 0.9, 0] }}
              transition={{ duration: spark.duration, delay: spark.delay, repeat: Infinity, ease: 'easeOut' }}
            />
          ))}
      </motion.div>

      <motion.figure
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.1, duration: 0.7, ease: 'easeOut' }}
        className="absolute -left-4 bottom-0 max-w-xs rounded-2xl border border-line bg-card p-5 shadow-float md:-left-16"
      >
        <blockquote className="font-serif text-lg italic leading-snug text-ink">
          {t.landing.heroSloka.sanskrit.map((line) => (
            <span key={line} className="block">
              {line}
            </span>
          ))}
        </blockquote>
        <p className="mt-2 text-sm text-ink-muted">“{t.landing.heroSloka.translation}”</p>
        <figcaption className="mt-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-saffron-text">
          {t.landing.heroSloka.source}
        </figcaption>
      </motion.figure>
    </div>
  )
}

export function Hero({ signedIn }: { signedIn: boolean }) {
  const t = useT()
  const ref = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  const portraitY = useTransform(scrollYProgress, [0, 1], [0, 70])
  const glowY = useTransform(scrollYProgress, [0, 1], [0, -60])

  return (
    <section ref={ref} className="relative overflow-hidden">
      <motion.div
        aria-hidden
        style={{ y: glowY }}
        className="pointer-events-none absolute -top-40 right-[-10%] h-[36rem] w-[36rem] rounded-full bg-[radial-gradient(circle,rgb(232_122_0/0.2),transparent_65%)]"
      />
      <div className="mx-auto grid max-w-6xl items-center gap-14 px-5 pb-20 pt-14 md:grid-cols-[1.1fr_1fr] md:pb-28 md:pt-24">
        <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6">
          <motion.p variants={rise} className={EYEBROW}>
            {t.landing.eyebrow}
          </motion.p>
          <motion.h1 variants={rise} className="font-serif text-5xl leading-[1.04] text-ink md:text-6xl lg:text-7xl">
            {t.landing.heading1}
            <em className="text-saffron-text">{t.landing.heading2}</em>
          </motion.h1>
          <motion.p variants={rise} className="max-w-xl text-lg leading-relaxed text-ink-muted">
            {t.landing.description}
          </motion.p>
          <motion.div variants={rise}>
            <Ways signedIn={signedIn} />
          </motion.div>
          <motion.p variants={rise} className="text-sm text-ink-muted">
            {t.landing.features}
          </motion.p>
        </motion.div>

        <motion.div style={{ y: portraitY }}>
          <Portrait />
        </motion.div>
      </div>
    </section>
  )
}
