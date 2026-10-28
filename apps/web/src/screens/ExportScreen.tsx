import { weekRangeOf, type LocalDate } from '@sadhana/domain'
import { useState } from 'react'
import { ApiError } from '../api/client'
import { exportReport, type ExportFormat } from '../api/report'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { FormAlert } from '../components/FormAlert'
import { PageHeader } from '../components/PageHeader'
import { EYEBROW } from '../components/styles'
import { TextField } from '../components/TextField'
import { useT } from '../i18n'
import { todayLocalDate } from '../lib/clock'
import { downloadBlob } from '../lib/download'

type ExportState =
  | { kind: 'idle' }
  | { kind: 'working' }
  | { kind: 'done'; filename: string }
  | { kind: 'failed'; message: string }

const FORMATS: ExportFormat[] = ['csv', 'xlsx']

export function ExportScreen() {
  const t = useT()
  const week = weekRangeOf(todayLocalDate())
  const [from, setFrom] = useState<LocalDate>(week.start)
  const [to, setTo] = useState<LocalDate>(week.end)
  const [format, setFormat] = useState<ExportFormat>('csv')
  const [state, setState] = useState<ExportState>({ kind: 'idle' })

  const download = async () => {
    setState({ kind: 'working' })
    try {
      const { blob, filename } = await exportReport(from, to, format)
      downloadBlob(blob, filename)
      setState({ kind: 'done', filename })
    } catch (error) {
      setState({
        kind: 'failed',
        message: error instanceof ApiError && error.status === 501 ? t.exportScreen.notReady : t.exportScreen.failed,
      })
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5 py-6 md:py-10">
      <PageHeader title={t.exportScreen.title} subtitle={t.exportScreen.subtitle} />
      <Card className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField id="from" label={t.exportScreen.from} type="date" value={from} max={to} onChange={(event) => setFrom(event.target.value)} />
          <TextField id="to" label={t.exportScreen.to} type="date" value={to} min={from} onChange={(event) => setTo(event.target.value)} />
        </div>
        <fieldset className="space-y-2">
          <legend className={EYEBROW}>{t.exportScreen.format}</legend>
          {FORMATS.map((option) => (
            <label key={option} className="flex items-center gap-3 text-sm text-ink">
              <input
                type="radio"
                name="format"
                value={option}
                checked={format === option}
                onChange={() => setFormat(option)}
                className="accent-saffron"
              />
              {t.exportScreen[option]}
            </label>
          ))}
        </fieldset>
        <p className="text-xs text-ink-muted">{t.exportScreen.note}</p>
        <div className="flex flex-wrap items-center gap-4">
          <Button type="button" disabled={state.kind === 'working' || from > to} onClick={() => void download()}>
            {state.kind === 'working' ? t.exportScreen.preparing : t.exportScreen.download}
          </Button>
          {state.kind === 'done' && (
            <p role="status" className="text-sm font-medium text-tulasi">
              {t.exportScreen.downloaded(state.filename)}
            </p>
          )}
        </div>
        {state.kind === 'failed' && <FormAlert message={state.message} />}
      </Card>
    </div>
  )
}
