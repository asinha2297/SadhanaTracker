export interface Handover {
  name: string
  password: string
  phone?: string
}

export const SMALL_BUTTON =
  'rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-peacock/8'

export const SMALL_PRIMARY = 'rounded-full bg-saffron px-3 py-1.5 text-xs font-semibold text-white'

export function PasswordHandover({ handover, onDone }: { handover: Handover; onDone: () => void }) {
  return (
    <div role="status" className="rounded-xl border border-saffron/40 bg-saffron/8 p-4 text-sm">
      <p className="text-ink">
        Share this one-time password in person with <span className="font-medium">{handover.name}</span>.{' '}
        {handover.phone ? (
          <>
            They sign in with <span className="font-medium">{handover.phone}</span> and will choose their own password.
          </>
        ) : (
          'They will choose their own password when they sign in.'
        )}
      </p>
      <p className="mt-2 font-mono text-2xl text-ink">{handover.password}</p>
      <button type="button" onClick={onDone} className="mt-2 text-xs font-semibold text-saffron-text">
        Done
      </button>
    </div>
  )
}
