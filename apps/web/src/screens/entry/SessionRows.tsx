import type { DailyEntry } from '@sadhana/domain'
import { useQuery } from '@tanstack/react-query'
import { Plus, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useMemo, useState, type ReactNode } from 'react'
import { Controller, useFieldArray, useWatch, type UseFormReturn } from 'react-hook-form'
import type { Lecture } from '../../api/contract'
import { libraryQuery } from '../../api/library'
import { Card } from '../../components/Card'
import { Combobox } from '../../components/Combobox'
import { TextField } from '../../components/TextField'
import { useT } from '../../i18n'

/** A session not yet pointed at the library; the schema asks for a choice before saving. */
const NONE = Number.NaN
const chosen = (value: number) => (Number.isNaN(value) ? undefined : value)

function SessionCard({
  title,
  addLabel,
  onAdd,
  empty,
  children,
}: {
  title: string
  addLabel: string
  onAdd: () => void
  empty: boolean
  children: ReactNode
}) {
  const t = useT()
  return (
    <Card aria-label={title}>
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-xl text-ink">{title}</h2>
        <button
          type="button"
          aria-label={addLabel}
          onClick={onAdd}
          className="inline-flex items-center gap-1 text-sm font-semibold text-saffron-text"
        >
          <Plus className="size-4" aria-hidden />
          {t.entry.addSession}
        </button>
      </div>
      <div className="mt-3 space-y-3">
        <AnimatePresence initial={false}>{children}</AnimatePresence>
        {empty && <p className="text-sm text-ink-muted">{t.entry.nothingLogged}</p>}
      </div>
    </Card>
  )
}

function Row({
  columns,
  removeLabel,
  onRemove,
  children,
}: {
  columns: string
  removeLabel: string
  onRemove: () => void
  children: ReactNode
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0, marginTop: 0, overflow: 'hidden' }}
      className="grid grid-cols-[1fr_auto] gap-3 rounded-xl border border-line p-3"
    >
      <div className={`grid gap-3 ${columns}`}>{children}</div>
      <button type="button" aria-label={removeLabel} onClick={onRemove} className="self-start pt-1 text-ink-muted hover:text-peacock">
        <X className="size-4" aria-hidden />
      </button>
    </motion.div>
  )
}

export function ReadingRows({ form }: { form: UseFormReturn<DailyEntry> }) {
  const t = useT()
  const library = useQuery(libraryQuery)
  const books = useMemo(() => library.data?.books ?? [], [library.data])
  const options = useMemo(() => books.map((book) => ({ value: book.id, label: book.title })), [books])
  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'reading' })
  const errors = form.formState.errors.reading
  return (
    <SessionCard
      title={t.practices.reading}
      addLabel={t.entry.addReading}
      onAdd={() => append({ bookId: NONE, chapterOrSection: '', minutes: NONE })}
      empty={fields.length === 0}
    >
      {fields.map((field, index) => (
        <Row key={field.id} columns="sm:grid-cols-[2fr_1fr_6rem]" removeLabel={t.entry.removeReading} onRemove={() => remove(index)}>
          <Controller
            control={form.control}
            name={`reading.${index}.bookId`}
            render={({ field: { value, onChange }, fieldState }) => (
              <Combobox
                id={`reading-${index}-book`}
                label={t.entry.book}
                options={options}
                value={chosen(value)}
                onChange={(id) => onChange(id ?? NONE)}
                placeholder={t.entry.chooseBook}
                emptyHint={library.data && books.length === 0 ? t.entry.noBooks : undefined}
                error={fieldState.error?.message}
              />
            )}
          />
          <TextField
            id={`reading-${index}-chapter`}
            label={t.entry.chapter}
            error={errors?.[index]?.chapterOrSection?.message}
            {...form.register(`reading.${index}.chapterOrSection`)}
          />
          <TextField
            id={`reading-${index}-minutes`}
            label={t.entry.minutes}
            type="number"
            inputMode="numeric"
            min={1}
            error={errors?.[index]?.minutes?.message}
            {...form.register(`reading.${index}.minutes`, { valueAsNumber: true })}
          />
        </Row>
      ))}
    </SessionCard>
  )
}

/** Speaker narrows the lectures; choosing a lecture fills in its speaker and source. */
function HearingRow({
  form,
  index,
  lectures,
  loaded,
  onRemove,
}: {
  form: UseFormReturn<DailyEntry>
  index: number
  lectures: Lecture[]
  loaded: boolean
  onRemove: () => void
}) {
  const t = useT()
  const lectureId = useWatch({ control: form.control, name: `hearing.${index}.lectureId` })
  const selected = lectures.find((lecture) => lecture.id === lectureId)
  const [speaker, setSpeaker] = useState<string | undefined>(selected?.speaker)
  const speakers = useMemo(
    () =>
      [...new Set(lectures.map((lecture) => lecture.speaker).filter((name): name is string => name !== undefined))]
        .sort((a, b) => a.localeCompare(b))
        .map((name) => ({ value: name, label: name })),
    [lectures],
  )
  const visible = (speaker ? lectures.filter((lecture) => lecture.speaker === speaker) : lectures).map((lecture) => ({
    value: lecture.id,
    label: lecture.title,
    hint: [lecture.speaker, lecture.source].filter(Boolean).join(' · ') || undefined,
  }))

  return (
    <Row columns="sm:grid-cols-[1fr_1fr_6rem]" removeLabel={t.entry.removeHearing} onRemove={onRemove}>
      <Combobox
        id={`hearing-${index}-speaker`}
        label={t.entry.speaker}
        options={speakers}
        value={speaker}
        onChange={(next) => {
          setSpeaker(next)
          if (next && selected && selected.speaker !== next) form.setValue(`hearing.${index}.lectureId`, NONE, { shouldDirty: true })
        }}
        placeholder={t.entry.anySpeaker}
      />
      <Controller
        control={form.control}
        name={`hearing.${index}.lectureId`}
        render={({ field: { value, onChange }, fieldState }) => (
          <Combobox
            id={`hearing-${index}-lecture`}
            label={t.entry.lecture}
            options={visible}
            value={chosen(value)}
            onChange={(id) => {
              onChange(id ?? NONE)
              const lecture = lectures.find((candidate) => candidate.id === id)
              if (lecture?.speaker) setSpeaker(lecture.speaker)
            }}
            placeholder={t.entry.chooseLecture}
            emptyHint={loaded && lectures.length === 0 ? t.entry.noLectures : undefined}
            error={fieldState.error?.message}
          />
        )}
      />
      <TextField
        id={`hearing-${index}-minutes`}
        label={t.entry.minutes}
        type="number"
        inputMode="numeric"
        min={1}
        error={form.formState.errors.hearing?.[index]?.minutes?.message}
        {...form.register(`hearing.${index}.minutes`, { valueAsNumber: true })}
      />
      {selected?.source && (
        <p className="text-xs text-ink-muted sm:col-span-3">
          {t.entry.source}: {selected.source}
        </p>
      )}
    </Row>
  )
}

export function HearingRows({ form }: { form: UseFormReturn<DailyEntry> }) {
  const t = useT()
  const library = useQuery(libraryQuery)
  const lectures = useMemo(() => library.data?.lectures ?? [], [library.data])
  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'hearing' })
  return (
    <SessionCard
      title={t.practices.hearing}
      addLabel={t.entry.addHearing}
      onAdd={() => append({ lectureId: NONE, minutes: NONE })}
      empty={fields.length === 0}
    >
      {fields.map((field, index) => (
        <HearingRow key={field.id} form={form} index={index} lectures={lectures} loaded={library.data !== undefined} onRemove={() => remove(index)} />
      ))}
    </SessionCard>
  )
}
