import { fireEvent, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { freezeTime, SATURDAY_EVENING } from '../test/clock'
import { lastVerificationCode } from '../mocks/handlers'
import { renderAt } from '../test/render'

freezeTime(SATURDAY_EVENING)

describe('ProfileScreen', () => {
  it('shows the profile, with the name in the congregation’s keeping, and saves contact details', async () => {
    renderAt('/profile')
    const main = within(await screen.findByRole('main'))
    expect(await main.findByText('Rādhikā Devī Dāsī')).toBeInTheDocument()
    expect(main.getByText('ID SH-0042')).toBeInTheDocument()
    expect(screen.queryByLabelText('Name')).not.toBeInTheDocument()
    expect(main.getByText(/administrator can correct your name/i)).toBeInTheDocument()
    const user = userEvent.setup()
    expect(screen.getByLabelText('Mobile number')).toHaveValue('+919876543210')
    const email = screen.getByLabelText('Email')
    await user.clear(email)
    await user.type(email, 'radhika.dd@example.org')
    await user.click(screen.getByRole('button', { name: 'Save profile' }))
    expect(await screen.findByText('Profile saved.')).toBeInTheDocument()
    expect(screen.queryByLabelText('Verification code')).not.toBeInTheDocument()
  })

  it('verifies a new mobile number by SMS code before saving it', async () => {
    renderAt('/profile')
    const user = userEvent.setup()
    const phone = await screen.findByLabelText('Mobile number')
    await user.clear(phone)
    await user.click(screen.getByRole('button', { name: 'Save profile' }))
    expect(await screen.findByText('Enter your mobile number')).toBeInTheDocument()
    await user.type(phone, '90000 00000')
    await user.click(screen.getByRole('button', { name: 'Save profile' }))
    expect(await screen.findByText('Verify your new mobile number with the code we sent')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Send code' }))
    expect(await screen.findByText(/Code sent to \+919000000000/)).toBeInTheDocument()
    await user.type(screen.getByLabelText('Verification code'), lastVerificationCode() ?? '')
    await user.click(screen.getByRole('button', { name: 'Save profile' }))
    expect(await screen.findByText('Profile saved.')).toBeInTheDocument()
    expect(phone).toHaveValue('+919000000000')
    expect(screen.queryByLabelText('Verification code')).not.toBeInTheDocument()
  })

  it('sets a personal target from today', async () => {
    renderAt('/profile')
    const user = userEvent.setup()
    await user.click(await screen.findByLabelText('Set a personal target'))
    for (const [label, value] of [
      ['Rounds per day', '8'],
      ['Reading minutes per day', '15'],
      ['Hearing minutes per day', '15'],
    ] as const) {
      const input = screen.getByLabelText(label)
      await user.clear(input)
      await user.type(input, value)
    }
    await user.click(screen.getByRole('button', { name: 'Save target' }))
    expect(await screen.findByText(/Personal · from 24 Oct/)).toBeInTheDocument()
    expect(screen.getAllByText('8 rounds · 15 min reading · 15 min hearing').length).toBeGreaterThan(0)
  })

  it('rejects an effective date in the past', async () => {
    renderAt('/profile')
    const user = userEvent.setup()
    await user.click(await screen.findByLabelText('Set a personal target'))
    fireEvent.change(screen.getByLabelText('Effective from'), { target: { value: '2026-10-20' } })
    await user.click(screen.getByRole('button', { name: 'Save target' }))
    expect(await screen.findByText('Choose today or a later date')).toBeInTheDocument()
  })
})
