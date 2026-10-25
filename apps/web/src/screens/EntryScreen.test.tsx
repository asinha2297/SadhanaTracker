import { act, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { devotee, savedEntry, seedEntry } from '../mocks/handlers'
import { server } from '../mocks/server'
import { expectLocation, renderAt } from '../test/render'

let online = true

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 9, 24, 20, 0))
  online = true
  Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => online })
})
afterEach(() => {
  vi.useRealTimers()
  Reflect.deleteProperty(navigator, 'onLine')
})

const today = '2026-10-24'
const user = () => userEvent.setup()

async function setRounds(rounds: number) {
  const input = await screen.findByLabelText('Rounds')
  await user().clear(input)
  await user().type(input, String(rounds))
}

const section = (name: string) => within(screen.getByRole('region', { name }))

describe('EntryScreen', () => {
  it('records a day in a few taps', async () => {
    renderAt('/entry')
    await setRounds(16)
    await user().click(screen.getByRole('button', { name: 'Add reading session' }))
    await user().type(section('Reading').getByLabelText('Book'), 'Bhagavad-gītā As It Is')
    await user().type(section('Reading').getByLabelText('Minutes'), '30')
    expect(screen.getByText(/16 rounds · 30 min reading/)).toBeInTheDocument()
    await user().click(screen.getByRole('button', { name: 'Save' }))
    await expectLocation('/')
    expect(savedEntry(devotee.devoteeId, today)).toMatchObject({
      rounds: 16,
      reading: [{ bookTitle: 'Bhagavad-gītā As It Is', minutes: 30 }],
    })
  })

  it('asks for a title and minutes before saving a session', async () => {
    renderAt('/entry')
    await user().click(await screen.findByRole('button', { name: 'Add hearing session' }))
    await user().click(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findByText('Enter the lecture title')).toBeInTheDocument()
    expect(screen.getByText('Enter minutes')).toBeInTheDocument()
    expect(savedEntry(devotee.devoteeId, today)).toBeUndefined()
  })

  it('saves an explicit zero day', async () => {
    renderAt('/entry')
    expect(await screen.findByText(/saved as a zero day/i)).toBeInTheDocument()
    await user().click(screen.getByRole('button', { name: 'Save' }))
    await expectLocation('/')
    expect(savedEntry(devotee.devoteeId, today)).toMatchObject({ rounds: 0, reading: [], hearing: [] })
    expect(await screen.findByText('Zero day')).toBeInTheDocument()
  })

  it('loads an existing record for editing', async () => {
    seedEntry(devotee.devoteeId, {
      localDate: today,
      rounds: 12,
      reading: [{ bookTitle: 'Śrīmad-Bhāgavatam', chapterOrSection: 'Canto 1', minutes: 20 }],
      hearing: [],
      reflection: 'Steady rounds.',
    })
    renderAt('/entry')
    expect(await screen.findByDisplayValue('Śrīmad-Bhāgavatam')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Steady rounds.')).toBeInTheDocument()
    await setRounds(16)
    await user().click(screen.getByRole('button', { name: 'Save' }))
    await expectLocation('/')
    expect(savedEntry(devotee.devoteeId, today)).toMatchObject({ rounds: 16, reflection: 'Steady rounds.' })
  })

  it('keeps the entry on this device when offline and syncs once back online', async () => {
    online = false
    server.use(http.put('/api/me/entries/:localDate', () => HttpResponse.error()))
    renderAt('/entry')
    expect((await screen.findAllByText('Offline')).length).toBeGreaterThan(0)
    await setRounds(16)
    await user().click(screen.getByRole('button', { name: 'Save' }))
    await expectLocation('/')
    expect((await screen.findAllByText('Offline · 1 pending')).length).toBeGreaterThan(0)
    expect(screen.getByText('Recorded')).toBeInTheDocument()
    expect(screen.getByText('Pending sync')).toBeInTheDocument()
    expect(savedEntry(devotee.devoteeId, today)).toBeUndefined()

    server.resetHandlers()
    online = true
    act(() => window.dispatchEvent(new Event('online')))
    expect((await screen.findAllByText('Synced')).length).toBeGreaterThan(0)
    expect(savedEntry(devotee.devoteeId, today)?.rounds).toBe(16)
  })

  it('surfaces a conflict when the record changed elsewhere and lets the devotee keep theirs', async () => {
    seedEntry(devotee.devoteeId, { localDate: today, rounds: 12, reading: [], hearing: [] }, '2026-10-24T10:00:00.000Z')
    renderAt('/entry')
    await screen.findByDisplayValue('12')
    seedEntry(devotee.devoteeId, { localDate: today, rounds: 14, reading: [], hearing: [] }, '2026-10-24T11:00:00.000Z')
    await setRounds(16)
    await user().click(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/updated elsewhere/i)
    expect(screen.getByText(/14 rounds/)).toBeInTheDocument()
    await user().click(screen.getByRole('button', { name: 'Keep mine' }))
    await expectLocation('/')
    expect(savedEntry(devotee.devoteeId, today)?.rounds).toBe(16)
  })

  it('shows locked days read-only', async () => {
    renderAt('/entry/2026-10-10')
    expect(await screen.findByText(/can't be changed/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument()
  })

  it('moves between days', async () => {
    renderAt('/entry')
    await user().click(await screen.findByRole('link', { name: 'Previous day' }))
    await expectLocation('/entry/2026-10-23')
  })
})
