import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { EYEBROW } from '../../components/styles'
import { PRACTICES, QUOTES, SLOKAS, STEPS, type Sloka } from '../../lib/landing'
import { rise, stagger, usePrefersReducedMotion } from '../../lib/motion'
import { Ways } from './Ways'

const inView = { once: true, margin: '-80px' } as const

function SectionHeading({ eyebrow, title, lead }: { eyebrow: string; title: string; lead: string }) {
  return (
    <motion.div variants={rise} initial="hidden" whileInView="show" viewport={inView} className="max-w-2xl">
      <p className={EYEBROW}>{eyebrow}</p>
      <h2 className="mt-3 font-serif text-4xl leading-tight text-ink md:text-5xl">{title}</h2>
      <p className="mt-4 text-lg leading-relaxed text-ink-muted">{lead}</p>
    </motion.div>
  )
}

export function SlokaCarousel({ intervalMs = 8000 }: { intervalMs?: number }) {
  const [index, setIndex] = useState(0)
  useEffect(() => {
    const timer = setInterval(() => setIndex((current) => (current + 1) % SLOKAS.length), intervalMs)
    return () => clearInterval(timer)
  }, [index, intervalMs])
  const sloka = SLOKAS[index] as Sloka

  return (
    <section aria-label="Ślokas" className="border-y border-line bg-card/60 py-16 md:py-24">
      <div className="mx-auto max-w-4xl px-5 text-center">
        <p className={EYEBROW}>Śloka</p>
        <div className="relative mt-8 min-h-[18rem]">
          <AnimatePresence mode="wait">
            <motion.figure
              key={index}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              transition={{ duration: 0.45, ease: 'easeOut' }}
            >
              <blockquote className="font-serif text-2xl italic leading-relaxed text-ink md:text-[2rem]">
                {sloka.sanskrit.map((line) => (
                  <span key={line} className="block">
                    {line}
                  </span>
                ))}
              </blockquote>
              <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-ink-muted">“{sloka.translation}”</p>
              <figcaption className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-saffron-text">
                {sloka.source}
              </figcaption>
            </motion.figure>
          </AnimatePresence>
        </div>
        <div className="mt-8 flex justify-center gap-2">
          {SLOKAS.map((_, dot) => (
            <button
              key={dot}
              type="button"
              aria-label={`Verse ${dot + 1}`}
              aria-pressed={dot === index}
              onClick={() => setIndex(dot)}
              className={`h-2 rounded-full transition-all ${dot === index ? 'w-8 bg-saffron' : 'w-2 bg-ink/15 hover:bg-ink/30'}`}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

export function Practices() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-16 md:py-24">
      <SectionHeading
        eyebrow="The daily practice"
        title="Three limbs, one vow."
        lead="Śrīla Prabhupāda asked his followers for sixteen rounds, daily reading and daily hearing. The tracker keeps all three in view without turning devotion into a chore."
      />
      <motion.ul variants={stagger} initial="hidden" whileInView="show" viewport={inView} className="mt-12 grid gap-6 md:grid-cols-3">
        {PRACTICES.map((practice) => (
          <motion.li key={practice.title} variants={rise} className="group overflow-hidden rounded-3xl border border-line bg-card shadow-sm">
            <div className="overflow-hidden">
              <img
                src={practice.image}
                alt={practice.alt}
                loading="lazy"
                className="aspect-[4/3] w-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
            </div>
            <div className="p-6">
              <p className={EYEBROW}>{practice.sanskrit}</p>
              <h3 className="mt-2 font-serif text-2xl text-ink">{practice.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-ink-muted">{practice.body}</p>
              <blockquote className="mt-4 border-l-2 border-saffron/50 pl-3 font-serif text-sm italic leading-relaxed text-ink">
                “{practice.teaching}” <span className="text-xs not-italic text-ink-muted">— {practice.source}</span>
              </blockquote>
            </div>
          </motion.li>
        ))}
      </motion.ul>
    </section>
  )
}

export function HowItWorks() {
  return (
    <section className="border-y border-line bg-card/40">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-16 md:grid-cols-[1fr_1fr] md:py-24">
        <div>
          <SectionHeading
            eyebrow="How it works"
            title="Two minutes a day. Honest for a lifetime."
            lead="Built around the way a congregation actually keeps its vows: quickly, truthfully, and with nobody looking over your shoulder."
          />
          <motion.ol variants={stagger} initial="hidden" whileInView="show" viewport={inView} className="mt-10 space-y-6">
            {STEPS.map((step, index) => (
              <motion.li key={step.title} variants={rise} className="flex gap-5">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-saffron/12 font-serif text-lg text-saffron-text">
                  {index + 1}
                </span>
                <div>
                  <h3 className="font-serif text-xl text-ink">{step.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{step.body}</p>
                </div>
              </motion.li>
            ))}
          </motion.ol>
        </div>
        <motion.img
          initial={{ opacity: 0, x: 24 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={inView}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          src="/landing/mayapur.jpg"
          alt="The temple at Śrī Māyāpur among palm trees"
          loading="lazy"
          className="aspect-[4/5] w-full rounded-[2rem] object-cover shadow-xl md:aspect-[3/4]"
        />
      </div>
    </section>
  )
}

function QuoteCard({ text, source }: { text: string; source: string }) {
  return (
    <figure className="w-[22rem] shrink-0 rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
      <blockquote className="font-serif text-xl italic leading-snug text-[#f3efe8]">“{text}”</blockquote>
      <figcaption className="mt-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#f2b04a]">{source}</figcaption>
    </figure>
  )
}

export function PrabhupadaQuotes() {
  const reduced = usePrefersReducedMotion()
  return (
    <section className="overflow-hidden bg-[#0f1115] py-16 text-[#f3efe8] md:py-24">
      <div className="mx-auto max-w-6xl px-5">
        <div className="grid items-end gap-8 md:grid-cols-[1fr_auto]">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#f2b04a]">Śrīla Prabhupāda's words</p>
            <h2 className="mt-3 font-serif text-4xl leading-tight md:text-5xl">The standard was set with love.</h2>
            <p className="mt-4 text-lg leading-relaxed text-[#a8a29e]">
              A few lines from the founder-ācārya of ISKCON, whose instructions this tracker exists to serve.
            </p>
          </div>
          <img
            src="/landing/peacock.jpg"
            alt="A peacock feather holding a drop of water"
            loading="lazy"
            className="hidden size-40 rounded-full object-cover ring-4 ring-white/10 md:block"
          />
        </div>
      </div>
      {reduced ? (
        <div className="mx-auto mt-12 grid max-w-6xl gap-5 px-5 md:grid-cols-2">
          {QUOTES.map((quote) => (
            <QuoteCard key={quote.text} {...quote} />
          ))}
        </div>
      ) : (
        <motion.div
          className="mt-12 flex w-max gap-5 px-5"
          animate={{ x: ['0%', '-50%'] }}
          transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
        >
          {[...QUOTES, ...QUOTES].map((quote, index) => (
            <QuoteCard key={`${quote.text}-${index}`} {...quote} />
          ))}
        </motion.div>
      )}
    </section>
  )
}

export function MantraBanner({ signedIn }: { signedIn: boolean }) {
  const reduced = usePrefersReducedMotion()
  return (
    <section className="relative overflow-hidden">
      <img src="/landing/sunrise.jpg" alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-[#1c1917]/65" />
      <div className="relative mx-auto max-w-4xl px-5 py-24 text-center md:py-36">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#f2b04a]">The mahā-mantra</p>
        <motion.p
          animate={reduced ? undefined : { opacity: [0.82, 1, 0.82] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
          className="mt-6 font-serif text-3xl leading-snug text-white md:text-5xl"
        >
          Hare Kṛṣṇa Hare Kṛṣṇa
          <br />
          Kṛṣṇa Kṛṣṇa Hare Hare
          <br />
          Hare Rāma Hare Rāma
          <br />
          Rāma Rāma Hare Hare
        </motion.p>
        <p className="mt-8 text-lg text-white/80">“Chant Hare Kṛṣṇa and be happy.” — Śrīla Prabhupāda</p>
        <div className="mt-10 flex justify-center">
          <Ways signedIn={signedIn} light />
        </div>
      </div>
    </section>
  )
}
