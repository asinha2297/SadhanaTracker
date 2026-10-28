import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { issuePassword, resetRequestsQuery } from '../../api/accounts'
import { Card } from '../../components/Card'
import { FormAlert } from '../../components/FormAlert'
import { useT } from '../../i18n'
import { useFormat } from '../../i18n/format'
import { PasswordHandover, SMALL_BUTTON, type Handover } from './PasswordHandover'

export function ResetRequests() {
  const t = useT()
  const fmt = useFormat()
  const queryClient = useQueryClient()
  const requests = useQuery(resetRequestsQuery)
  const [handover, setHandover] = useState<Handover>()
  const [failure, setFailure] = useState<string>()
  if (!requests.data?.length && !handover) return null

  const issue = async (devoteeId: string, name: string) => {
    setFailure(undefined)
    try {
      setHandover({ name, password: await issuePassword(devoteeId) })
      await queryClient.invalidateQueries({ queryKey: ['accounts', 'reset-requests'] })
    } catch {
      setFailure(t.masterAdmin.issueFailed)
    }
  }

  return (
    <Card aria-label={t.masterAdmin.resetRequests}>
      <h2 className="font-serif text-xl text-ink">{t.masterAdmin.resetRequests}</h2>
      <ul className="mt-3 divide-y divide-line">
        {requests.data?.map((request) => (
          <li key={request.devoteeId} className="flex flex-wrap items-center justify-between gap-3 py-2.5 text-sm">
            <span>
              <span className="font-medium text-ink">{request.name}</span>
              <span className="text-ink-muted"> {t.masterAdmin.asked(request.devoteeId, fmt.instant(request.requestedAt))}</span>
            </span>
            <button type="button" onClick={() => void issue(request.devoteeId, request.name)} className={SMALL_BUTTON}>
              {t.masterAdmin.issuePassword}
            </button>
          </li>
        ))}
      </ul>
      <FormAlert message={failure} />
      {handover && (
        <div className="mt-3">
          <PasswordHandover handover={handover} onDone={() => setHandover(undefined)} />
        </div>
      )}
    </Card>
  )
}
