import { Link } from 'react-router'
import { useT } from '../i18n'

export function NotFoundScreen() {
  const t = useT()
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-ink-muted">{t.notFound.brand}</p>
      <h1 className="mt-3 font-serif text-3xl text-ink">{t.notFound.title}</h1>
      <p className="mt-2 max-w-sm text-sm text-ink-muted">{t.notFound.body}</p>
      <Link to="/" className="mt-8 rounded-full bg-saffron px-5 py-2.5 text-sm font-semibold text-white">
        {t.notFound.back}
      </Link>
    </main>
  )
}
