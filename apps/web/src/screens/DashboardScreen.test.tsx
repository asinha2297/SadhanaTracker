import { screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { devotee, seedEntry } from '../mocks/handlers'
import { renderAt } from '../test/render'

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 9, 24, 20, 0))
})
afterEach(() => vi.useRealTimers())

describe('DashboardScreen', () => {
  it("greets the devotee and asks for today's record", async () => {
    renderAt('/')
    expect(await screen.findByRole('heading', { name: 'Haribol, Rādhikā.' })).toBeInTheDocument()
    expect(screen.getByText('Not yet recorded')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: "Record today's sadhana" })).toHaveAttribute('href', '/entry')
  })

  it('measures today against the active target and counts the streak', async () => {
    seedEntry(devotee.devoteeId, { localDate: '2026-10-21', rounds: 0, reading: [], hearing: [] })
    seedEntry(devotee.devoteeId, { localDate: '2026-10-22', rounds: 16, reading: [], hearing: [] })
    seedEntry(devotee.devoteeId, { localDate: '2026-10-23', rounds: 16, reading: [], hearing: [] })
    seedEntry(devotee.devoteeId, {
      localDate: '2026-10-24',
      rounds: 12,
      reading: [{ bookTitle: 'Śrīmad-Bhāgavatam', minutes: 20 }],
      hearing: [],
    })
    renderAt('/')
    expect(await screen.findByText('Recorded')).toBeInTheDocument()
    expect(screen.getByText('12 of 16 rounds')).toBeInTheDocument()
    expect(screen.getByText('20 of 30 min')).toBeInTheDocument()
    expect(screen.getByText('0 of 30 min')).toBeInTheDocument()
    expect(screen.getByText('75%')).toBeInTheDocument()
    expect(screen.getByLabelText('Current streak')).toHaveTextContent('3')
  })

  it('shows a gentle reminder after the chosen time while today is missing', async () => {
    vi.setSystemTime(new Date(2026, 9, 24, 21, 30))
    renderAt('/')
    expect(await screen.findByText(/today's sadhana isn't recorded yet/i)).toBeInTheDocument()
  })

  it('keeps quiet before the reminder time', async () => {
    renderAt('/')
    await screen.findByRole('heading', { name: 'Haribol, Rādhikā.' })
    expect(screen.queryByText(/isn't recorded yet/i)).not.toBeInTheDocument()
  })

  it('links the week strip to the weekly report', async () => {
    renderAt('/')
    expect(await screen.findByRole('link', { name: /this week/i })).toHaveAttribute('href', '/week')
  })
})
