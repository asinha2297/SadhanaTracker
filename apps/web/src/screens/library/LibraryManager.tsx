import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { ApiError, applyFieldIssues } from '../../api/client'
import { BookInputSchema, LectureInputSchema, type Book, type BookInput, type Lecture, type LectureInput } from '../../api/contract'
import { createBook, createLecture, deleteBook, deleteLecture, libraryQuery, updateBook, updateLecture } from '../../api/library'
import { Card } from '../../components/Card'
import { FormAlert } from '../../components/FormAlert'
import { TextField } from '../../components/TextField'
import { useT } from '../../i18n'
import { useFormat } from '../../i18n/format'
import { SMALL_BUTTON, SMALL_PRIMARY } from '../accounts/PasswordHandover'

/** Sends field-level refusals (a duplicate title) to the form; anything else is for the caller. */
async function submitting<T>(work: () => Promise<T>, setError: (field: string, message: string) => void): Promise<boolean> {
  try {
    await work()
    return true
  } catch (error) {
    if (!applyFieldIssues(error, setError)) throw error
    return false
  }
}

function BookForm({ initial, onSubmit, onCancel }: { initial?: Book; onSubmit: (input: BookInput) => Promise<void>; onCancel?: () => void }) {
  const t = useT()
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<BookInput>({ resolver: zodResolver(BookInputSchema), defaultValues: { title: initial?.title ?? '' } })
  const submit = handleSubmit(async (input) => {
    if (await submitting(() => onSubmit(input), (field, message) => setError(field as 'title', { message }))) reset({ title: '' })
  })
  const id = initial ? `book-${initial.id}-title` : 'new-book-title'
  return (
    <form onSubmit={submit} noValidate className="flex flex-wrap items-end gap-2">
      <div className="min-w-48 flex-1">
        <TextField id={id} label={t.library.bookTitle} autoComplete="off" error={errors.title?.message} {...register('title')} />
      </div>
      <button type="submit" disabled={isSubmitting} className={SMALL_PRIMARY}>
        {initial ? t.library.save : t.library.add}
      </button>
      {onCancel && (
        <button type="button" onClick={onCancel} className={SMALL_BUTTON}>
          {t.library.cancel}
        </button>
      )}
    </form>
  )
}

/** Offers the speakers already in the library through the shared datalist, so names keep one spelling. */
function LectureForm({
  initial,
  onSubmit,
  onCancel,
}: {
  initial?: Lecture
  onSubmit: (input: LectureInput) => Promise<void>
  onCancel?: () => void
}) {
  const t = useT()
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LectureInput>({
    resolver: zodResolver(LectureInputSchema),
    defaultValues: { title: initial?.title ?? '', speaker: initial?.speaker ?? '', source: initial?.source ?? '' },
  })
  const submit = handleSubmit(async (input) => {
    if (await submitting(() => onSubmit(input), (field, message) => setError(field as 'title', { message }))) {
      reset({ title: '', speaker: '', source: '' })
    }
  })
  const prefix = initial ? `lecture-${initial.id}` : 'new-lecture'
  return (
    <form onSubmit={submit} noValidate className="grid gap-2 sm:grid-cols-[2fr_1fr_1fr_auto] sm:items-end">
      <TextField id={`${prefix}-title`} label={t.library.lectureTitle} autoComplete="off" error={errors.title?.message} {...register('title')} />
      <TextField id={`${prefix}-speaker`} label={t.library.speaker} list="library-speakers" autoComplete="off" error={errors.speaker?.message} {...register('speaker')} />
      <TextField id={`${prefix}-source`} label={t.library.source} autoComplete="off" error={errors.source?.message} {...register('source')} />
      <div className="flex gap-2 sm:mb-px">
        <button type="submit" disabled={isSubmitting} className={SMALL_PRIMARY}>
          {initial ? t.library.save : t.library.add}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className={SMALL_BUTTON}>
            {t.library.cancel}
          </button>
        )}
      </div>
    </form>
  )
}

function Uses({ count }: { count: number }) {
  const t = useT()
  const fmt = useFormat()
  return <span className="block text-xs text-ink-muted">{count ? t.library.uses(fmt.number(count)) : t.library.unused}</span>
}

/** The books and lectures devotees pick from, kept by coordinators and administrators. */
export function LibraryManager() {
  const t = useT()
  const fmt = useFormat()
  const queryClient = useQueryClient()
  const library = useQuery(libraryQuery)
  const [editing, setEditing] = useState<string>()
  const [failure, setFailure] = useState<string>()
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['library'] })

  const act = async (work: () => Promise<unknown>) => {
    setFailure(undefined)
    try {
      await work()
      await refresh()
      setEditing(undefined)
    } catch (error) {
      const body = error instanceof ApiError && error.status === 409 ? (error.body as { reason?: string; uses?: number }) : undefined
      if (body?.reason === 'IN_USE') setFailure(t.library.inUse(fmt.number(body.uses ?? 0)))
      else if (applyFieldIssues(error, () => {})) throw error
      else setFailure(t.masterAdmin.changeFailed)
    }
  }

  const books = library.data?.books ?? []
  const lectures = library.data?.lectures ?? []
  const speakers = [...new Set(lectures.map((lecture) => lecture.speaker).filter((name): name is string => name !== undefined))].sort((a, b) =>
    a.localeCompare(b),
  )

  return (
    <Card aria-label={t.library.title}>
      <FormAlert message={failure} />
      <div className="grid gap-8 lg:grid-cols-[2fr_3fr]">
        <section aria-label={t.library.books}>
          <h2 className="font-serif text-xl text-ink">{t.library.books}</h2>
          <div className="mt-2">
            <BookForm onSubmit={(input) => act(() => createBook(input))} />
          </div>
          <ul className="mt-3 divide-y divide-line">
            {books.map((book) => (
              <li key={book.id} className="py-2.5 text-sm">
                {editing === `book-${book.id}` ? (
                  <BookForm initial={book} onSubmit={(input) => act(() => updateBook(book.id, input))} onCancel={() => setEditing(undefined)} />
                ) : (
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span>
                      <span className="font-medium text-ink">{book.title}</span>
                      <Uses count={book.uses} />
                    </span>
                    <span className="flex gap-2">
                      <button type="button" onClick={() => setEditing(`book-${book.id}`)} className={SMALL_BUTTON}>
                        {t.library.edit}
                      </button>
                      <button type="button" onClick={() => void act(() => deleteBook(book.id))} className={SMALL_BUTTON}>
                        {t.library.remove}
                      </button>
                    </span>
                  </div>
                )}
              </li>
            ))}
            {library.data && books.length === 0 && <li className="py-2 text-sm text-ink-muted">{t.library.noBooks}</li>}
          </ul>
        </section>

        <section aria-label={t.library.lectures}>
          <h2 className="font-serif text-xl text-ink">{t.library.lectures}</h2>
          <datalist id="library-speakers">
            {speakers.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
          <div className="mt-2">
            <LectureForm onSubmit={(input) => act(() => createLecture(input))} />
          </div>
          <ul className="mt-3 divide-y divide-line">
            {lectures.map((lecture) => (
              <li key={lecture.id} className="py-2.5 text-sm">
                {editing === `lecture-${lecture.id}` ? (
                  <LectureForm initial={lecture} onSubmit={(input) => act(() => updateLecture(lecture.id, input))} onCancel={() => setEditing(undefined)} />
                ) : (
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span>
                      <span className="font-medium text-ink">{lecture.title}</span>
                      {(lecture.speaker || lecture.source) && (
                        <span className="block text-xs text-ink-muted">{[lecture.speaker, lecture.source].filter(Boolean).join(' · ')}</span>
                      )}
                      <Uses count={lecture.uses} />
                    </span>
                    <span className="flex gap-2">
                      <button type="button" onClick={() => setEditing(`lecture-${lecture.id}`)} className={SMALL_BUTTON}>
                        {t.library.edit}
                      </button>
                      <button type="button" onClick={() => void act(() => deleteLecture(lecture.id))} className={SMALL_BUTTON}>
                        {t.library.remove}
                      </button>
                    </span>
                  </div>
                )}
              </li>
            ))}
            {library.data && lectures.length === 0 && <li className="py-2 text-sm text-ink-muted">{t.library.noLectures}</li>}
          </ul>
        </section>
      </div>
    </Card>
  )
}
