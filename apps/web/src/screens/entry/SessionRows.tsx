import type { DailyEntry } from '@sadhana/domain'
import { Plus, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import type { ReactNode } from 'react'
import { useFieldArray, type UseFormReturn } from 'react-hook-form'
import { Card } from '../../components/Card'
import { TextField } from '../../components/TextField'
import { BOOKS } from '@sadhana/contract'

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
          Add session
        </button>
      </div>
      <div className="mt-3 space-y-3">
        <AnimatePresence initial={false}>{children}</AnimatePresence>
        {empty && <p className="text-sm text-ink-muted">Nothing logged yet.</p>}
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
      <button type="button" aria-label={removeLabel} onClick={onRemove} className="self-start pt-1 text-ink-muted hover:text-ink">
        <X className="size-4" aria-hidden />
      </button>
    </motion.div>
  )
}

export function ReadingRows({ form }: { form: UseFormReturn<DailyEntry> }) {
  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'reading' })
  const errors = form.formState.errors.reading
  return (
    <SessionCard
      title="Reading"
      addLabel="Add reading session"
      onAdd={() => append({ bookTitle: '', chapterOrSection: '', minutes: Number.NaN })}
      empty={fields.length === 0}
    >
      {fields.map((field, index) => (
        <Row key={field.id} columns="sm:grid-cols-[2fr_1fr_6rem]" removeLabel="Remove reading session" onRemove={() => remove(index)}>
          <TextField
            id={`reading-${index}-book`}
            label="Book"
            list="books"
            autoComplete="off"
            error={errors?.[index]?.bookTitle?.message}
            {...form.register(`reading.${index}.bookTitle`)}
          />
          <TextField
            id={`reading-${index}-chapter`}
            label="Chapter or section"
            error={errors?.[index]?.chapterOrSection?.message}
            {...form.register(`reading.${index}.chapterOrSection`)}
          />
          <TextField
            id={`reading-${index}-minutes`}
            label="Minutes"
            type="number"
            inputMode="numeric"
            min={1}
            error={errors?.[index]?.minutes?.message}
            {...form.register(`reading.${index}.minutes`, { valueAsNumber: true })}
          />
        </Row>
      ))}
      <datalist id="books">
        {BOOKS.map((book) => (
          <option key={book} value={book} />
        ))}
      </datalist>
    </SessionCard>
  )
}

export function HearingRows({ form }: { form: UseFormReturn<DailyEntry> }) {
  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'hearing' })
  const errors = form.formState.errors.hearing
  return (
    <SessionCard
      title="Hearing"
      addLabel="Add hearing session"
      onAdd={() => append({ lectureTitle: '', speaker: '', source: '', minutes: Number.NaN })}
      empty={fields.length === 0}
    >
      {fields.map((field, index) => (
        <Row
          key={field.id}
          columns="sm:grid-cols-[1fr_1fr_6rem]"
          removeLabel="Remove hearing session"
          onRemove={() => remove(index)}
        >
          {/* Lecture titles run long, so they get a line of their own above speaker, source and minutes. */}
          <div className="sm:col-span-3">
            <TextField
              id={`hearing-${index}-lecture`}
              label="Lecture"
              error={errors?.[index]?.lectureTitle?.message}
              {...form.register(`hearing.${index}.lectureTitle`)}
            />
          </div>
          <TextField
            id={`hearing-${index}-speaker`}
            label="Speaker"
            error={errors?.[index]?.speaker?.message}
            {...form.register(`hearing.${index}.speaker`)}
          />
          <TextField
            id={`hearing-${index}-source`}
            label="Source"
            error={errors?.[index]?.source?.message}
            {...form.register(`hearing.${index}.source`)}
          />
          <TextField
            id={`hearing-${index}-minutes`}
            label="Minutes"
            type="number"
            inputMode="numeric"
            min={1}
            error={errors?.[index]?.minutes?.message}
            {...form.register(`hearing.${index}.minutes`, { valueAsNumber: true })}
          />
        </Row>
      ))}
    </SessionCard>
  )
}
