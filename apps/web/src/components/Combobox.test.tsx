import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { Combobox } from './Combobox'

const BOOKS = [
  { value: 1, label: 'Bhagavad-gītā As It Is' },
  { value: 2, label: 'Śrīmad-Bhāgavatam', hint: 'Canto 1' },
  { value: 3, label: 'The Nectar of Devotion' },
]

function Harness({ options = BOOKS, emptyHint }: { options?: typeof BOOKS; emptyHint?: string }) {
  const [value, setValue] = useState<number>()
  return (
    <>
      <Combobox id="book" label="Book" options={options} value={value} onChange={setValue} placeholder="Choose a book" emptyHint={emptyHint} />
      <output data-testid="value">{value ?? 'none'}</output>
    </>
  )
}

describe('Combobox', () => {
  it('filters regardless of case and diacritics, and chooses with the keyboard or a tap', async () => {
    render(<Harness />)
    const user = userEvent.setup()
    const field = screen.getByRole('combobox', { name: 'Book' })
    await user.type(field, 'srimad')
    expect(screen.getAllByRole('option')).toHaveLength(1)
    await user.keyboard('{Enter}')
    expect(screen.getByTestId('value')).toHaveTextContent('2')
    expect(field).toHaveValue('Śrīmad-Bhāgavatam')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()

    await user.clear(field)
    expect(screen.getByTestId('value')).toHaveTextContent('none')
    await user.type(field, 'nectar')
    await user.click(screen.getByRole('option', { name: /Nectar of Devotion/ }))
    expect(screen.getByTestId('value')).toHaveTextContent('3')
    expect(field).toHaveValue('The Nectar of Devotion')
  })

  it('shows every option on focus and says when nothing matches', async () => {
    render(<Harness />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('combobox', { name: 'Book' }))
    expect(screen.getAllByRole('option')).toHaveLength(3)
    await user.keyboard('zzz')
    expect(screen.queryByRole('option')).not.toBeInTheDocument()
    expect(screen.getByText('No matches')).toBeInTheDocument()
  })

  it('explains an empty list instead of offering a field', () => {
    render(<Harness options={[]} emptyHint="No books yet." />)
    expect(screen.getByText('No books yet.')).toBeInTheDocument()
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
  })
})
