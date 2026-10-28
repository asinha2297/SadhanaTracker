import { useT } from '../i18n'

export function ScreenLoading() {
  const t = useT()
  return (
    <div role="status" aria-label={t.screen.loading} className="animate-pulse py-20 text-center text-sm text-ink-muted">
      {t.screen.loading}
    </div>
  )
}

export function ScreenError({ onRetry }: { onRetry: () => void }) {
  const t = useT()
  return (
    <div role="alert" className="py-20 text-center">
      <p className="text-sm text-ink-muted">{t.screen.failed}</p>
      <button type="button" onClick={onRetry} className="mt-4 text-sm font-semibold text-saffron-text">
        {t.screen.tryAgain}
      </button>
    </div>
  )
}
