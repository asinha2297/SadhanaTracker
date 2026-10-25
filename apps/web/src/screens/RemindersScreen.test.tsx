import { fireEvent, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { devotee, savedReminders } from '../mocks/handlers'
import { renderAt } from '../test/render'

describe('RemindersScreen', () => {
  it('loads the current settings and saves a new time', async () => {
    renderAt('/reminders')
    expect(await screen.findByRole('checkbox', { name: /remind me/i })).toBeChecked()
    const time = screen.getByLabelText('Reminder time')
    expect(time).toHaveValue('21:00')
    fireEvent.change(time, { target: { value: '20:30' } })
    await userEvent.setup().click(screen.getByRole('button', { name: 'Save reminders' }))
    expect(await screen.findByText('Reminders saved.')).toBeInTheDocument()
    expect(savedReminders(devotee.devoteeId)?.time).toBe('20:30')
  })

  it('explains that web push is not available yet', async () => {
    renderAt('/reminders')
    const push = await screen.findByRole('radio', { name: /web push/i })
    expect(push).toBeDisabled()
    expect(screen.getByRole('radio', { name: /in-app/i })).toBeChecked()
  })
})
