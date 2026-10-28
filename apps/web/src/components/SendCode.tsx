import { normalizePhone } from '@sadhana/domain'
import { useState } from 'react'
import { ApiError, applyFieldIssues } from '../api/client'
import { requestCode } from '../auth/session'
import { useT } from '../i18n'

type SendState = { status: 'idle' } | { status: 'sending' } | { status: 'sent'; to: string } | { status: 'wait' }

/** Texts a verification code to the mobile number as typed; the form shows the field for it. */
export function SendCode({ phone, onPhoneError }: { phone: string; onPhoneError: (message: string) => void }) {
  const t = useT()
  const [state, setState] = useState<SendState>({ status: 'idle' })

  const send = async () => {
    const to = normalizePhone(phone)
    if (!to) return onPhoneError(phone.trim() ? t.messages.phoneInvalid : t.messages.phoneRequired)
    setState({ status: 'sending' })
    try {
      await requestCode(to)
      setState({ status: 'sent', to })
    } catch (error) {
      if (error instanceof ApiError && error.status === 429) return setState({ status: 'wait' })
      setState({ status: 'idle' })
      if (!applyFieldIssues(error, (_field, message) => onPhoneError(message))) {
        onPhoneError(t.sendCode.failed)
      }
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted">
      <button
        type="button"
        onClick={() => void send()}
        disabled={state.status === 'sending'}
        className="font-semibold text-saffron-text disabled:opacity-60"
      >
        {state.status === 'sent' ? t.sendCode.resend : state.status === 'sending' ? t.sendCode.sending : t.sendCode.send}
      </button>
      {state.status === 'sent' && <span>{t.sendCode.sent(state.to)}</span>}
      {state.status === 'wait' && <span>{t.sendCode.wait}</span>}
    </div>
  )
}
