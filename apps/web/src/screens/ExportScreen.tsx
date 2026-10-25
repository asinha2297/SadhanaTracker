import { weekRangeOf, type LocalDate } from '@sadhana/domain'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { ApiError } from '../api/client'
import type { Group } from '../api/contract'
import { exportReport, groupsQuery, type ExportFormat } from '../api/groups'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { FormAlert } from '../components/FormAlert'
import { GroupSelect } from '../components/GroupSelect'
import { PageHeader } from '../components/PageHeader'
import { ScreenError, ScreenLoading } from '../components/ScreenState'
import { EYEBROW } from '../components/styles'
import { TextField } from '../components/TextField'
import { todayLocalDate } from '../lib/clock'
import { downloadBlob } from '../lib/download'

type ExportState =
  | { kind: 'idle' }
  | { kind: 'working' }
  | { kind: 'done'; filename: string }
  | { kind: 'failed'; message: string }

const FORMATS: { value: ExportFormat; label: string }[] = [
  { value: 'csv', label: 'CSV (.csv)' },
  { value: 'xlsx', label: 'Excel (.xlsx)' },
]

export function ExportScreen() {
  const groups = useQuery(groupsQuery)
  if (groups.isError) return <ScreenError onRetry={() => void groups.refetch()} />
  if (groups.isPending) return <ScreenLoading />
  const first = groups.data[0]
  if (!first) return <p className="py-20 text-center text-sm text-ink-muted">No groups are assigned to you yet.</p>
  return <ExportForm groups={groups.data} firstGroupId={first.id} />
}

function ExportForm({ groups, firstGroupId }: { groups: Group[]; firstGroupId: string }) {
  const week = weekRangeOf(todayLocalDate())
  const [groupId, setGroupId] = useState(firstGroupId)
  const [from, setFrom] = useState<LocalDate>(week.start)
  const [to, setTo] = useState<LocalDate>(week.end)
  const [format, setFormat] = useState<ExportFormat>('csv')
  const [state, setState] = useState<ExportState>({ kind: 'idle' })

  const download = async () => {
    setState({ kind: 'working' })
    try {
      const { blob, filename } = await exportReport(groupId, from, to, format)
      downloadBlob(blob, filename)
      setState({ kind: 'done', filename })
    } catch (error) {
      setState({
        kind: 'failed',
        message:
          error instanceof ApiError && error.status === 501
            ? 'Excel export will be available once the server is connected. CSV works today.'
            : "We couldn't prepare the export. Check your connection and try again.",
      })
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5 py-6 md:py-10">
      <PageHeader
        title="Export"
        subtitle="A file for the groups you are authorised to see, matching exactly the filters below."
      />
      <Card className="space-y-5">
        <GroupSelect groups={groups} value={groupId} onChange={setGroupId} />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField id="from" label="From" type="date" value={from} max={to} onChange={(event) => setFrom(event.target.value)} />
          <TextField id="to" label="To" type="date" value={to} min={from} onChange={(event) => setTo(event.target.value)} />
        </div>
        <fieldset className="space-y-2">
          <legend className={EYEBROW}>Format</legend>
          {FORMATS.map((option) => (
            <label key={option.value} className="flex items-center gap-3 text-sm text-ink">
              <input
                type="radio"
                name="format"
                value={option.value}
                checked={format === option.value}
                onChange={() => setFormat(option.value)}
                className="accent-saffron"
              />
              {option.label}
            </label>
          ))}
        </fieldset>
        <p className="text-xs text-ink-muted">
          Exports never include reflections. Individual rows appear only for groups with record review enabled; other
          groups export daily totals.
        </p>
        <div className="flex flex-wrap items-center gap-4">
          <Button type="button" disabled={state.kind === 'working' || from > to} onClick={() => void download()}>
            {state.kind === 'working' ? 'Preparing…' : 'Download'}
          </Button>
          {state.kind === 'done' && (
            <p role="status" className="text-sm font-medium text-peacock-text">
              Downloaded {state.filename}
            </p>
          )}
        </div>
        {state.kind === 'failed' && <FormAlert message={state.message} />}
      </Card>
    </div>
  )
}
