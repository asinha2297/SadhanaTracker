import { Link } from 'react-router'
import { useAuth } from '../auth/AuthContext'
import { LanguageToggle } from '../components/LanguageToggle'
import { Wordmark } from '../components/Wordmark'
import { useT } from '../i18n'
import { Hero } from './landing/Hero'
import { HowItWorks, MantraBanner, PrabhupadaQuotes, Practices, SlokaCarousel } from './landing/Sections'
import { Ways } from './landing/Ways'

export function LandingScreen() {
  const { state } = useAuth()
  const t = useT()
  const signedIn = state.status === 'signed-in'

  return (
    <div className="bg-canvas text-ink">
      <header className="sticky top-0 z-30 border-b border-line/70 bg-canvas/75 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3">
          <Wordmark />
          <nav className="flex items-center gap-3">
            <LanguageToggle />
            {/* The hero repeats this call to action, so phones keep the header to the mark and the languages. */}
            <Link
              to={signedIn ? '/' : '/login'}
              className="hidden rounded-full bg-saffron px-5 py-2 text-sm font-semibold text-white sm:inline-block"
            >
              {signedIn ? t.landing.openToday : t.landing.signIn}
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <Hero signedIn={signedIn} />
        <SlokaCarousel />
        <Practices />
        <HowItWorks />
        <PrabhupadaQuotes />
        <MantraBanner signedIn={signedIn} />
      </main>

      <footer className="border-t border-line bg-card/40 py-14">
        <div className="mx-auto max-w-6xl px-5">
          <Wordmark />
          <p className="mt-5 max-w-md text-sm leading-relaxed text-ink-muted">{t.landing.footerAbout}</p>
          <div className="mt-6">
            <Ways signedIn={signedIn} />
          </div>
          <p className="mt-8 font-serif text-lg italic text-ink-muted">{t.landing.hareKrishna}</p>
          <p className="mt-6 text-xs text-ink-muted">
            <Link to="/credits" className="underline decoration-line underline-offset-2 hover:text-peacock">
              {t.landing.creditsLink}
            </Link>
          </p>
        </div>
      </footer>
    </div>
  )
}
