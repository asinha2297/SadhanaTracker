import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { devotee, seedEntry } from '../mocks/handlers'
import { freezeTime, SATURDAY_EVENING } from '../test/clock'
import { renderAt } from '../test/render'

freezeTime(SATURDAY_EVENING)

const seedRecent = () => {
  seedEntry(devotee.devoteeId, {
    localDate: '2026-10-24',
    rounds: 16,
    reading: [],
    hearing: [],
    reflection: 'Peaceful rounds at dawn.',
  })
  seedEntry(devotee.devoteeId, { localDate: '2026-10-23', rounds: 0, reading: [], hearing: [] })
}

const rows = async () => within(await screen.findByRole('list', { name: 'Timeline' })).getAllByRole('listitem')

describe('HistoryScreen', () => {
  it('lists the month newest first with each day’s status', async () => {
    seedRecent()
    renderAt('/history')
    expect(await screen.findByRole('heading', { name: 'October 2026' })).toBeInTheDocument()
    const days = await rows()
    expect(days).toHaveLength(24)
    expect(days[0]).toHaveTextContent('24 Oct')
    expect(days[0]).toHaveTextContent('Recorded')
    expect(days[0]).toHaveTextContent('Peaceful rounds at dawn.')
    expect(days[1]).toHaveTextContent('Zero day')
  })

  it('filters the timeline by status', async () => {
    seedRecent()
    renderAt('/history')
    await userEvent.setup().click(await screen.findByRole('button', { name: 'Zero days' }))
    const days = await rows()
    expect(days.every((day) => day.textContent?.includes('Zero day'))).toBe(true)
    expect(days.some((day) => day.textContent?.includes('24 Oct'))).toBe(false)
  })

  it('moves to the previous month', async () => {
    renderAt('/history')
    await userEvent.setup().click(await screen.findByRole('button', { name: 'Previous month' }))
    expect(await screen.findByRole('heading', { name: 'September 2026' })).toBeInTheDocument()
    expect(await rows()).toHaveLength(30)
  })
})
