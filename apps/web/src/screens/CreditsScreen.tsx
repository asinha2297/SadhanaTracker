import { Link } from 'react-router'
import { Wordmark } from '../components/Wordmark'
import { CREDITS } from '../lib/landing'

const LINK = 'underline decoration-line underline-offset-2 hover:text-peacock'

/** Attribution the image and carousel licences require, kept off the welcome page itself. */
export function CreditsScreen() {
  return (
    <div className="min-h-screen bg-canvas text-ink">
      <header className="border-b border-line/70">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-5 py-3">
          <Wordmark />
          <Link to="/welcome" className="text-sm font-medium text-saffron-text">
            Back to the welcome page
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-5 py-10 md:py-14">
        <h1 className="font-serif text-3xl md:text-4xl">Credits</h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-muted">
          The pictures on the welcome page come from Wikimedia Commons, resized for the web, under the licences named below.
        </p>
        <h2 className="mt-10 font-serif text-xl">Images</h2>
        <ul className="mt-3 space-y-2 text-sm leading-relaxed text-ink-muted">
          {CREDITS.map((credit) => (
            <li key={credit.subject}>
              {credit.subject}: {credit.artist},{' '}
              {credit.licenseUrl ? (
                <a href={credit.licenseUrl} className={LINK}>
                  {credit.license}
                </a>
              ) : (
                credit.license
              )}
              , via{' '}
              <a href={credit.page} className={LINK}>
                Wikimedia Commons
              </a>
            </li>
          ))}
        </ul>
        <h2 className="mt-10 font-serif text-xl">Design</h2>
        <p className="mt-3 text-sm leading-relaxed text-ink-muted">
          The śloka carousel is adapted from{' '}
          <a href="https://skiper-ui.com" className={LINK}>
            Skiper UI
          </a>
          , built with{' '}
          <a href="https://swiperjs.com" className={LINK}>
            Swiper
          </a>
          .
        </p>
        <h2 className="mt-10 font-serif text-xl">Verses</h2>
        <p className="mt-3 text-sm leading-relaxed text-ink-muted">
          Verses from Bhagavad-gītā As It Is and Śrīmad-Bhāgavatam, translations by His Divine Grace A. C. Bhaktivedanta
          Swami Prabhupāda.
        </p>
      </main>
    </div>
  )
}
