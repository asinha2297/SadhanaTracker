import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { issuePassword, resetRequestsQuery } from '../../api/admin'
import { Card } from '../../components/Card'
import { FormAlert } from '../../components/FormAlert'
import { instantLabel } from '../../lib/format'
import { PasswordHandover, SMALL_BUTTON, type Handover } from './PasswordHandover'

export function ResetRequests() {
  const queryClient = useQueryClient()
  const requests = useQuery(resetRequestsQuery)
  const [handover, setHandover] = useState<Handover>()
  const [failure, setFailure] = useState<string>()
  if (!requests.data?.length && !handover) return null

  const issue = async (devoteeId: string, name: string) => {
    setFailure(undefined)
    try {
      setHandover({ name, password: await issuePassword(devoteeId) })
      await queryClient.invalidateQueries({ queryKey: ['admin', 'reset-requests'] })
    } catch {
      setFailure("We couldn't issue a password. Check your connection and try again.")
    }
  }

  return (
    <Card aria-label="Password reset requests">
      <h2 className="font-serif text-xl text-ink">Password reset requests</h2>
      <ul className="mt-3 divide-y divide-line">
        {requests.data?.map((request) => (
          <li key={request.devoteeId} className="flex flex-wrap items-center justify-between gap-3 py-2.5 text-sm">
            <span>
              <span className="font-medium text-ink">{request.name}</span>
              <span className="text-ink-muted">
                {' '}
                · {request.devoteeId} · asked {instantLabel(request.requestedAt)}
              </span>
            </span>
            <button type="button" onClick={() => void issue(request.devoteeId, request.name)} className={SMALL_BUTTON}>
              Issue one-time password
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
