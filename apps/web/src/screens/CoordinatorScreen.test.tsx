import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { admin, coordinator, setMockSession } from '../mocks/handlers'
import { freezeTime, SATURDAY_EVENING } from '../test/clock'
import { expectLocation, renderAt } from '../test/render'

freezeTime(SATURDAY_EVENING)

describe('CoordinatorScreen', () => {
  it('shows the group summary and member table for a review-enabled group', async () => {
    setMockSession(coordinator)
    renderAt('/coordinator')
    expect(await screen.findByRole('heading', { name: '19 – 25 October 2026' })).toBeInTheDocument()
    expect(screen.getByLabelText('Group')).toHaveValue('sharanagati')
    expect(within(await screen.findByRole('region', { name: 'Members' })).getByText('7')).toBeInTheDocument()
    expect(screen.getByRole('row', { name: /Rādhikā Devī Dāsī/ })).toBeInTheDocument()
  })

  it('keeps individual records hidden for a group without review permission', async () => {
    setMockSession(admin)
    renderAt('/coordinator')
    await userEvent.setup().selectOptions(await screen.findByLabelText('Group'), 'east')
    expect(await screen.findByText(/individual records aren't enabled for this group/i)).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('moves to the previous week', async () => {
    setMockSession(coordinator)
    renderAt('/coordinator')
    await userEvent.setup().click(await screen.findByRole('button', { name: 'Previous week' }))
    expect(await screen.findByRole('heading', { name: '12 – 18 October 2026' })).toBeInTheDocument()
  })

  it('sends a devotee back to today', async () => {
    renderAt('/coordinator')
    await expectLocation('/')
  })
})
