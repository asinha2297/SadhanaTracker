import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { admin, coordinator, coordinatorWithoutReview, setMockSession } from '../mocks/handlers'
import { freezeTime, SATURDAY_EVENING } from '../test/clock'
import { expectLocation, renderAt } from '../test/render'

freezeTime(SATURDAY_EVENING)

describe('ReportScreen', () => {
  it('shows the congregation summary and, for a reviewer, every devotee', async () => {
    setMockSession(coordinator)
    renderAt('/report')
    expect(await screen.findByRole('heading', { name: '19 – 25 October 2026' })).toBeInTheDocument()
    expect(within(await screen.findByRole('region', { name: 'Devotees' })).getByText('13')).toBeInTheDocument()
    expect(screen.getByRole('row', { name: /Rādhikā Devī Dāsī/ })).toBeInTheDocument()
    expect(screen.queryByLabelText('Group')).not.toBeInTheDocument()
  })

  it('keeps individual records hidden from a coordinator without record review', async () => {
    setMockSession(coordinatorWithoutReview)
    renderAt('/report')
    expect(await screen.findByText(/individual records aren't enabled for you/i)).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('shows an administrator every devotee', async () => {
    setMockSession(admin)
    renderAt('/report')
    expect(await screen.findByRole('row', { name: /Rādhikā Devī Dāsī/ })).toBeInTheDocument()
  })

  it('moves to the previous week', async () => {
    setMockSession(coordinator)
    renderAt('/report')
    await userEvent.setup().click(await screen.findByRole('button', { name: 'Previous week' }))
    expect(await screen.findByRole('heading', { name: '12 – 18 October 2026' })).toBeInTheDocument()
  })

  it('sends a devotee back to today', async () => {
    renderAt('/report')
    await expectLocation('/')
  })
})
