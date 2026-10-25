import { Link } from 'react-router'

export function Wordmark() {
  return (
    <Link to="/welcome" aria-label="Sharanagati Sadhana Tracker, home" className="block">
      <span className="block font-serif text-2xl leading-none text-ink">Sharanagati</span>
      <span className="mt-1.5 block text-[10px] font-semibold uppercase tracking-[0.25em] text-ink-muted">Sadhana Tracker</span>
    </Link>
  )
}
