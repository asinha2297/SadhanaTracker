import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { devotee, seedEntry } from '../mocks/handlers'
import { freezeTime, SATURDAY_EVENING } from '../test/clock'
import { expectLocation, renderAt } from '../test/render'

freezeTime(SATURDAY_EVENING)

const full = (localDate: string) => ({ localDate, rounds: 16, reading: [], hearing: [] })

describe('WeekScreen', () => {
  it('shows the days of the current week with their status', async () => {
    seedEntry(devotee.devoteeId, full('2026-10-19'))
    seedEntry(devotee.devoteeId, { localDate: '2026-10-20', rounds: 0, reading: [], hearing: [] })
    renderAt('/week')
    expect(await screen.findByRole('heading', { name: '19 – 25 October 2026' })).toBeInTheDocument()
    expect(within(screen.getByRole('link', { name: /Monday,? 19 October/ })).getByText('Recorded')).toBeInTheDocument()
    expect(within(screen.getByRole('link', { name: /Tuesday,? 20 October/ })).getByText('Zero day')).toBeInTheDocument()
    expect(within(screen.getByRole('link', { name: /Sunday,? 25 October/ })).getByText('Upcoming')).toBeInTheDocument()
  })

  it('measures the week against the targets of the days elapsed so far', async () => {
    for (const day of ['19', '20', '21', '22', '23', '24']) seedEntry(devotee.devoteeId, full(`2026-10-${day}`))
    renderAt('/week')
    expect(await screen.findByText('96 of 96 rounds')).toBeInTheDocument()
    expect(screen.getAllByText('0 of 180 min')).toHaveLength(2)
    expect(screen.getByText('6 of 6 days recorded')).toBeInTheDocument()
  })

  it('navigates to the previous week and opens a day from the calendar', async () => {
    renderAt('/week')
    await userEvent.setup().click(await screen.findByRole('link', { name: 'Previous week' }))
    await expectLocation('/week/2026-10-12')
    await userEvent.setup().click(await screen.findByRole('link', { name: /Monday,? 12 October/ }))
    await expectLocation('/entry/2026-10-12')
  })
})
