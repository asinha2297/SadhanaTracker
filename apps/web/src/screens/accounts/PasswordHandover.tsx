import { renderRich, useT } from '../../i18n'

export interface Handover {
  name: string
  password: string
  phone?: string
}

export const SMALL_BUTTON =
  'rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-peacock/8'

export const SMALL_PRIMARY = 'rounded-full bg-saffron px-3 py-1.5 text-xs font-semibold text-white'

export function PasswordHandover({ handover, onDone }: { handover: Handover; onDone: () => void }) {
  const t = useT()
  return (
    <div role="status" className="rounded-xl border border-saffron/40 bg-saffron/8 p-4 text-sm">
      <p className="text-ink">
        {renderRich(t.masterAdmin.share, { name: <span className="font-medium">{handover.name}</span> })}{' '}
        {handover.phone
          ? renderRich(t.masterAdmin.withPhone, { phone: <span className="font-medium">{handover.phone}</span> })
          : t.masterAdmin.withoutPhone}
      </p>
      <p className="mt-2 font-mono text-2xl text-ink">{handover.password}</p>
      <button type="button" onClick={onDone} className="mt-2 text-xs font-semibold text-saffron-text">
        {t.masterAdmin.done}
      </button>
    </div>
  )
}
