export function ScreenLoading() {
  return (
    <div role="status" aria-label="Loading" className="animate-pulse py-20 text-center text-sm text-ink-muted">
      Loading…
    </div>
  )
}

export function ScreenError({ onRetry }: { onRetry: () => void }) {
  return (
    <div role="alert" className="py-20 text-center">
      <p className="text-sm text-ink-muted">We couldn't load this right now.</p>
      <button type="button" onClick={onRetry} className="mt-4 text-sm font-semibold text-saffron-text">
        Try again
      </button>
    </div>
  )
}
