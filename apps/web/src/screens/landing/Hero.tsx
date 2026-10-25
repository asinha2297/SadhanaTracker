import { motion, useScroll, useTransform } from 'motion/react'
import { useRef } from 'react'
import { EYEBROW } from '../../components/styles'
import { HERO_SLOKA } from '../../lib/landing'
import { rise, stagger } from '../../lib/motion'
import { Ways } from './Ways'

const BEADS = Array.from({ length: 108 }, (_, index) => {
  const angle = (index / 108) * 2 * Math.PI
  return { x: 200 + 184 * Math.cos(angle), y: 200 + 184 * Math.sin(angle), big: index % 27 === 0 }
})

function MalaRing() {
  return (
    <motion.svg
      viewBox="0 0 400 400"
      aria-hidden
      className="absolute -inset-12 text-saffron/45"
      animate={{ rotate: 360 }}
      transition={{ duration: 240, repeat: Infinity, ease: 'linear' }}
    >
      <circle cx="200" cy="200" r="184" fill="none" stroke="currentColor" strokeWidth="0.8" strokeDasharray="2 7" />
      {BEADS.map((bead, index) => (
        <circle key={index} cx={bead.x} cy={bead.y} r={bead.big ? 5 : 2.6} fill="currentColor" />
      ))}
    </motion.svg>
  )
}

export function Hero({ signedIn }: { signedIn: boolean }) {
  const ref = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  const imageY = useTransform(scrollYProgress, [0, 1], [0, 90])
  const glowY = useTransform(scrollYProgress, [0, 1], [0, -60])

  return (
    <section ref={ref} className="relative overflow-hidden">
      <motion.div
        aria-hidden
        style={{ y: glowY }}
        className="pointer-events-none absolute -top-40 right-[-10%] h-[36rem] w-[36rem] rounded-full bg-[radial-gradient(circle,rgb(217_119_6/0.22),transparent_65%)]"
      />
      <div className="mx-auto grid max-w-6xl items-center gap-14 px-5 pb-24 pt-14 md:grid-cols-[1.1fr_1fr] md:pb-32 md:pt-24">
        <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6">
          <motion.p variants={rise} className={EYEBROW}>
            Sharanagati ISKCON Congregation
          </motion.p>
          <motion.h1 variants={rise} className="font-serif text-5xl leading-[1.04] text-ink md:text-6xl lg:text-7xl">
            Keep your daily sadhana, <em className="text-saffron-text">with devotion.</em>
          </motion.h1>
          <motion.p variants={rise} className="max-w-xl text-lg leading-relaxed text-ink-muted">
            Japa, reading and hearing, recorded in under two minutes a day, measured against the vow you set, and shared
            only as far as you choose.
          </motion.p>
          <motion.div variants={rise}>
            <Ways signedIn={signedIn} />
          </motion.div>
          <motion.p variants={rise} className="text-sm text-ink-muted">
            Free for the congregation · Works offline · Reflections stay private
          </motion.p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.25, ease: 'easeOut' }}
          className="relative mx-auto w-full max-w-md"
        >
          <MalaRing />
          <motion.img
            style={{ y: imageY }}
            src="/landing/lotus.jpg"
            alt="A pink lotus in full bloom"
            className="relative aspect-[4/5] w-full rounded-[2rem] object-cover shadow-[0_40px_90px_-40px_rgb(28_25_23/0.6)]"
          />
          <motion.figure
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1, duration: 0.6, ease: 'easeOut' }}
            className="absolute -bottom-10 -left-4 max-w-xs rounded-2xl border border-line bg-card/90 p-5 shadow-xl backdrop-blur-xl md:-left-12"
          >
            <blockquote className="font-serif text-lg italic leading-snug text-ink">
              {HERO_SLOKA.sanskrit.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </blockquote>
            <p className="mt-2 text-sm text-ink-muted">“{HERO_SLOKA.translation}”</p>
            <figcaption className="mt-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-saffron-text">
              {HERO_SLOKA.source}
            </figcaption>
          </motion.figure>
        </motion.div>
      </div>
    </section>
  )
}
