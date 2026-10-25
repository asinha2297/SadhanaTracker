import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { lastVerificationCode, PASSWORD, seedPendingAccount, setMockSession } from '../mocks/handlers'
import { renderAt } from '../test/render'

async function fillSignup(phone: string) {
  const user = userEvent.setup()
  await user.type(await screen.findByLabelText('Name'), 'Haridāsa Dāsa')
  await user.selectOptions(screen.getByLabelText('Group'), 'sharanagati')
  await user.type(screen.getByLabelText('Mobile number'), phone)
  await user.type(screen.getByLabelText('Password'), 'govinda-jaya')
  await user.type(screen.getByLabelText('Confirm password'), 'govinda-jaya')
  return user
}

describe('SignupScreen', () => {
  it('verifies the mobile number by SMS code, then shows the devotee ID to keep', async () => {
    setMockSession(null)
    renderAt('/login')
    await userEvent.setup().click(await screen.findByRole('link', { name: 'Create an account' }))
    const user = await fillSignup('98450 00200')
    await user.click(screen.getByRole('button', { name: 'Create account' }))
    expect(await screen.findByText('Enter the 6-digit code we sent')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Send code' }))
    expect(await screen.findByText(/Code sent to \+919845000200/)).toBeInTheDocument()
    const code = screen.getByLabelText('Verification code')
    await user.type(code, '000000')
    await user.click(screen.getByRole('button', { name: 'Create account' }))
    expect(await screen.findByText("That code isn't right. Check the SMS and try again.")).toBeInTheDocument()

    await user.clear(code)
    await user.type(code, lastVerificationCode() ?? '')
    await user.click(screen.getByRole('button', { name: 'Create account' }))
    expect(await screen.findByRole('heading', { name: 'Request received' })).toBeInTheDocument()
    expect(screen.getByText('SH-100200')).toBeInTheDocument()
    expect(screen.getByText(/sign in with your mobile number or email/i)).toBeInTheDocument()
  })

  it('asks for the essentials, including a mobile number and its code', async () => {
    setMockSession(null)
    renderAt('/signup')
    await userEvent.setup().click(await screen.findByRole('button', { name: 'Create account' }))
    expect(await screen.findByText('Enter your name')).toBeInTheDocument()
    expect(screen.getByText('Choose your group')).toBeInTheDocument()
    expect(screen.getByText('Enter your mobile number')).toBeInTheDocument()
    expect(screen.getByText('Enter the 6-digit code we sent')).toBeInTheDocument()
    expect(screen.getByText('Use at least 8 characters')).toBeInTheDocument()
  })

  it('sends no code to a mobile number that is already registered', async () => {
    setMockSession(null)
    renderAt('/signup')
    const user = await fillSignup('98765 43210')
    await user.click(screen.getByRole('button', { name: 'Send code' }))
    expect(await screen.findByText('An account with this mobile number already exists.')).toBeInTheDocument()
    expect(screen.queryByText(/Code sent to/)).not.toBeInTheDocument()
  })

  it('keeps a pending account out until a coordinator approves it', async () => {
    setMockSession(null)
    seedPendingAccount({ devoteeId: 'SH-0150', name: 'Haridāsa Dāsa', groupId: 'sharanagati', phone: '+919845000150' })
    renderAt('/login')
    const user = userEvent.setup()
    await user.type(await screen.findByLabelText('Email or mobile number'), '98450 00150')
    await user.type(screen.getByLabelText('Password'), PASSWORD)
    await user.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/awaiting approval/i)
  })
})
