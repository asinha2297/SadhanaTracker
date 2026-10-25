import { Link } from 'react-router'

export function NotFoundScreen() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-ink-muted">Sharanagati</p>
      <h1 className="mt-3 font-serif text-3xl text-ink">This path leads nowhere.</h1>
      <p className="mt-2 max-w-sm text-sm text-ink-muted">
        The page you were looking for isn't here. Your sadhana for today still is.
      </p>
      <Link to="/" className="mt-8 rounded-full bg-saffron px-5 py-2.5 text-sm font-semibold text-white">
        Return to today
      </Link>
    </main>
  )
}
