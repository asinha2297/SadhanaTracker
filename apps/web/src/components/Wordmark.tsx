import { Link } from 'react-router'
import { LogoMark } from './LogoMark'

/** The mark and the name on one line, centred on each other; the tagline joins them where there is room. */
export function Wordmark({ tagline = true }: { tagline?: boolean }) {
  return (
    <Link to="/welcome" aria-label="Sharanagati Sadhana Tracker, home" className="logo-link inline-flex items-center gap-2.5">
      <LogoMark className="size-9" />
      <span className="logo-word font-brand text-[1.6rem] leading-none">Sharanagati</span>
      {tagline && (
        <span className="ml-1 hidden border-l border-line pl-3 text-[10px] font-semibold uppercase leading-none tracking-[0.22em] text-ink-muted sm:inline-block">
          Sadhana Tracker
        </span>
      )}
    </Link>
  )
}
