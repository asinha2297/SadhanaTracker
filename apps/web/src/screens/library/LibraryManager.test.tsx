import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { coordinator, devotee, seedEntry, setMockSession } from '../../mocks/handlers'
import { renderAt } from '../../test/render'

const open = async () => {
  setMockSession(coordinator)
  renderAt('/master-admin/library')
  const library = await screen.findByRole('region', { name: 'Library' })
  return {
    user: userEvent.setup(),
    books: within(within(library).getByRole('region', { name: 'Books' })),
    lectures: within(within(library).getByRole('region', { name: 'Lectures' })),
  }
}

describe('LibraryManager', () => {
  it('adds a book, refuses a duplicate, renames it and removes it while unused', async () => {
    const { user, books } = await open()
    await user.type(books.getByLabelText('Title'), 'Light of the Bhāgavata')
    await user.click(books.getByRole('button', { name: 'Add' }))
    // The list item outlives its switch into edit mode; the text inside it does not.
    const item = (await books.findByText('Light of the Bhāgavata')).closest('li') as HTMLElement
    expect(within(item).getByText('Not used yet')).toBeInTheDocument()
    expect(books.getByLabelText('Title')).toHaveValue('')

    await user.type(books.getByLabelText('Title'), 'light of the bhāgavata')
    await user.click(books.getByRole('button', { name: 'Add' }))
    expect(await books.findByText('This book is already in the library.')).toBeInTheDocument()

    await user.click(within(item).getByRole('button', { name: 'Edit' }))
    const field = within(item).getByLabelText('Title')
    await user.clear(field)
    await user.type(field, 'Light of the Bhāgavata (2nd ed.)')
    await user.click(within(item).getByRole('button', { name: 'Save' }))
    const renamed = await books.findByText('Light of the Bhāgavata (2nd ed.)')
    await user.click(within(renamed.closest('li') as HTMLElement).getByRole('button', { name: 'Remove' }))
    expect(await books.findByText('Bhagavad-gītā As It Is')).toBeInTheDocument()
    expect(books.queryByText('Light of the Bhāgavata (2nd ed.)')).not.toBeInTheDocument()
  })

  it('keeps a book that records point at and says how many', async () => {
    seedEntry(devotee.devoteeId, { localDate: '2026-10-24', rounds: 16, reading: [{ bookId: 1, minutes: 20 }], hearing: [] })
    const { user, books } = await open()
    const row = (await books.findByText('Bhagavad-gītā As It Is')).closest('li') as HTMLElement
    expect(within(row).getByText('Used in 1 records')).toBeInTheDocument()
    await user.click(within(row).getByRole('button', { name: 'Remove' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Used in 1 records, so it can be renamed but not removed.')
    expect(books.getByText('Bhagavad-gītā As It Is')).toBeInTheDocument()
  })

  it('adds a lecture with its speaker and source, offering the speakers already known', async () => {
    const { user, lectures } = await open()
    await lectures.findByText('Japa workshop')
    expect(lectures.getByLabelText('Speaker (optional)')).toHaveAttribute('list', 'library-speakers')
    expect(document.querySelectorAll('#library-speakers option').length).toBeGreaterThan(0)
    await user.type(lectures.getByLabelText('Title'), 'Nectar of Devotion seminar')
    await user.type(lectures.getByLabelText('Speaker (optional)'), 'Govinda Dāsa')
    await user.type(lectures.getByLabelText('Source (optional)'), 'Temple')
    await user.click(lectures.getByRole('button', { name: 'Add' }))
    const row = (await lectures.findByText('Nectar of Devotion seminar')).closest('li') as HTMLElement
    expect(within(row).getByText('Govinda Dāsa · Temple')).toBeInTheDocument()
    await user.type(lectures.getByLabelText('Title'), 'nectar of devotion seminar')
    await user.type(lectures.getByLabelText('Speaker (optional)'), 'govinda dāsa')
    await user.click(lectures.getByRole('button', { name: 'Add' }))
    expect(await lectures.findByText('This lecture by this speaker is already in the library.')).toBeInTheDocument()
  })
})
