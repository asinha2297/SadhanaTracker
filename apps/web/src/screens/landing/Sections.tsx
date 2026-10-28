import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import 'swiper/css'
import 'swiper/css/a11y'
import 'swiper/css/effect-coverflow'
import 'swiper/css/pagination'
import { A11y, Autoplay, EffectCoverflow, Keyboard, Pagination } from 'swiper/modules'
import { Swiper, SwiperSlide } from 'swiper/react'
import { EYEBROW } from '../../components/styles'
import { useLanguage } from '../../i18n'
import { PRACTICE_IMAGES, SLOKA_IMAGES } from '../../lib/landing'
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

/**
 * Coverflow of pictures, each opening its śloka below. Adapted from Skiper UI's "Skiper 49" carousel
 * (credited on /credits); its styles live in index.css because the CSP forbids inline <style>.
 */
export function SlokaCarousel({ intervalMs = 8000 }: { intervalMs?: number }) {
  const { language, t } = useLanguage()
  const reduced = usePrefersReducedMotion()
  const [index, setIndex] = useState(0)
  const slides = t.landing.slokas
  const sloka = slides[index] as (typeof slides)[number]

  return (
    <section aria-label={t.landing.slokasLabel} className="overflow-hidden border-y border-line bg-card/60 py-16 md:py-24">
      <div className="mx-auto max-w-4xl px-5 text-center">
        <p className={EYEBROW}>{t.landing.slokaEyebrow}</p>
        <motion.div variants={rise} initial="hidden" whileInView="show" viewport={inView} className="-mx-5 mt-8 sm:mx-0">
          {/* Remounted per language: Swiper reads its spoken labels once, when it starts. */}
          <Swiper
            key={language}
            modules={[EffectCoverflow, Pagination, Autoplay, Keyboard, A11y]}
            effect="coverflow"
            coverflowEffect={{ rotate: 40, stretch: 0, depth: 100, modifier: 1, slideShadows: true }}
            slidesPerView="auto"
            centeredSlides
            grabCursor
            loop
            slideToClickedSlide
            initialSlide={index}
            speed={reduced ? 0 : 600}
            autoplay={reduced ? false : { delay: intervalMs, disableOnInteraction: true, pauseOnMouseEnter: true }}
            keyboard={{ enabled: true, onlyInViewport: true }}
            pagination={{ clickable: true }}
            a11y={{ paginationBulletMessage: t.landing.verseBullet, slideLabelMessage: t.landing.slideLabel }}
            onRealIndexChange={(swiper) => setIndex(swiper.realIndex)}
            className="sloka-swiper"
          >
            {slides.map((slide, position) => (
              <SwiperSlide key={SLOKA_IMAGES[position]}>
                <img src={SLOKA_IMAGES[position]} alt={slide.alt} loading="lazy" className="h-full w-full object-cover" />
              </SwiperSlide>
            ))}
          </Swiper>
        </motion.div>
        <div className="relative mt-6 min-h-[18rem]">
          <AnimatePresence mode="wait">
            <motion.figure
              key={`${language}-${index}`}
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
      </div>
    </section>
  )
}

export function Practices() {
  const { t } = useLanguage()
  return (
    <section className="mx-auto max-w-6xl px-5 py-16 md:py-24">
      <SectionHeading eyebrow={t.landing.practicesEyebrow} title={t.landing.practicesTitle} lead={t.landing.practicesLead} />
      <motion.ul variants={stagger} initial="hidden" whileInView="show" viewport={inView} className="mt-12 grid gap-6 md:grid-cols-3">
        {t.landing.practiceCards.map((practice, position) => (
          <motion.li key={practice.title} variants={rise} className="group overflow-hidden rounded-3xl border border-line bg-card shadow-card">
            <div className="overflow-hidden">
              <img
                src={PRACTICE_IMAGES[position]}
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
  const { t } = useLanguage()
  return (
    <section className="border-y border-line bg-card/40">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-16 md:grid-cols-[1fr_1fr] md:py-24">
        <div>
          <SectionHeading eyebrow={t.landing.howEyebrow} title={t.landing.howTitle} lead={t.landing.howLead} />
          <motion.ol variants={stagger} initial="hidden" whileInView="show" viewport={inView} className="mt-10 space-y-6">
            {t.landing.steps.map((step, position) => (
              <motion.li key={step.title} variants={rise} className="flex gap-5">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-saffron/12 font-serif text-lg text-saffron-text">
                  {position + 1}
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
          alt={t.landing.mayapurAlt}
          loading="lazy"
          className="aspect-[4/5] w-full rounded-[2rem] object-cover shadow-xl md:aspect-[3/4]"
        />
      </div>
    </section>
  )
}

function QuoteCard({ text, source }: { text: string; source: string }) {
  return (
    <figure className="w-[22rem] shrink-0 rounded-3xl border border-line bg-card p-6 shadow-card">
      <blockquote className="font-serif text-xl italic leading-snug text-ink">“{text}”</blockquote>
      <figcaption className="mt-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-saffron-text">{source}</figcaption>
    </figure>
  )
}

export function PrabhupadaQuotes() {
  const { t } = useLanguage()
  const reduced = usePrefersReducedMotion()
  return (
    <section className="overflow-hidden py-16 md:py-24">
      <div className="mx-auto max-w-6xl px-5">
        <div className="grid items-end gap-8 md:grid-cols-[1fr_auto]">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-peacock">{t.landing.quotesEyebrow}</p>
            <h2 className="mt-3 font-serif text-4xl leading-tight text-ink md:text-5xl">{t.landing.quotesTitle}</h2>
            <p className="mt-4 text-lg leading-relaxed text-ink-muted">{t.landing.quotesLead}</p>
          </div>
          <img
            src="/landing/peacock.jpg"
            alt={t.landing.peacockAlt}
            loading="lazy"
            className="hidden size-40 rounded-full object-cover shadow-float ring-4 ring-card md:block"
          />
        </div>
      </div>
      {reduced ? (
        <div className="mx-auto mt-12 grid max-w-6xl gap-5 px-5 md:grid-cols-2">
          {t.landing.quotes.map((quote) => (
            <QuoteCard key={quote.text} {...quote} />
          ))}
        </div>
      ) : (
        <motion.div
          className="mt-12 flex w-max gap-5 px-5"
          animate={{ x: ['0%', '-50%'] }}
          transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
        >
          {[...t.landing.quotes, ...t.landing.quotes].map((quote, position) => (
            <QuoteCard key={`${quote.text}-${position}`} {...quote} />
          ))}
        </motion.div>
      )}
    </section>
  )
}

export function MantraBanner({ signedIn }: { signedIn: boolean }) {
  const { t } = useLanguage()
  const reduced = usePrefersReducedMotion()
  return (
    <section className="relative overflow-hidden">
      <img src="/landing/sunrise.jpg" alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
      {/* The sunrise shows through a sandalwood wash, so the mantra reads in ink like the rest of the page. */}
      <div className="absolute inset-0 bg-[#fdfbf7]/85" />
      <div className="relative mx-auto max-w-4xl px-5 py-24 text-center md:py-36">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-saffron-text">{t.landing.mantraEyebrow}</p>
        <motion.p
          animate={reduced ? undefined : { opacity: [0.82, 1, 0.82] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
          className="mt-6 font-serif text-3xl leading-snug text-ink md:text-5xl"
        >
          {t.landing.mantra.map((line) => (
            <span key={line} className="block">
              {line}
            </span>
          ))}
        </motion.p>
        <p className="mt-8 text-lg text-ink-muted">{t.landing.mantraQuote}</p>
        <div className="mt-10 flex justify-center">
          <Ways signedIn={signedIn} />
        </div>
      </div>
    </section>
  )
}
