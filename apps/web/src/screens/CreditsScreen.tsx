import { Link } from 'react-router'
import { LanguageToggle } from '../components/LanguageToggle'
import { Wordmark } from '../components/Wordmark'
import { renderRich, useT } from '../i18n'
import { CREDITS } from '../lib/landing'

const LINK = 'underline decoration-line underline-offset-2 hover:text-peacock'

/** Attribution the image and carousel licences require, kept off the welcome page itself. */
export function CreditsScreen() {
  const t = useT()
  return (
    <div className="min-h-screen bg-canvas text-ink">
      <header className="border-b border-line/70">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-4 px-5 py-3">
          <Wordmark />
          <div className="flex items-center gap-4">
            <LanguageToggle />
            <Link to="/welcome" className="text-sm font-medium text-saffron-text">
              {t.credits.back}
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-5 py-10 md:py-14">
        <h1 className="font-serif text-3xl md:text-4xl">{t.credits.title}</h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-muted">{t.credits.intro}</p>
        <h2 className="mt-10 font-serif text-xl">{t.credits.images}</h2>
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
              {t.credits.via}
              <a href={credit.page} className={LINK}>
                Wikimedia Commons
              </a>
            </li>
          ))}
        </ul>
        <h2 className="mt-10 font-serif text-xl">{t.credits.design}</h2>
        <p className="mt-3 text-sm leading-relaxed text-ink-muted">
          {renderRich(t.credits.designText, {
            skiper: (
              <a href="https://skiper-ui.com" className={LINK}>
                Skiper UI
              </a>
            ),
            swiper: (
              <a href="https://swiperjs.com" className={LINK}>
                Swiper
              </a>
            ),
          })}
        </p>
        <h2 className="mt-10 font-serif text-xl">{t.credits.verses}</h2>
        <p className="mt-3 text-sm leading-relaxed text-ink-muted">{t.credits.versesText}</p>
      </main>
    </div>
  )
}
