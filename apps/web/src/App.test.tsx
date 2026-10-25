import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { afterEach, describe, expect, it } from 'vitest'
import { enqueue, pending } from './lib/syncQueue'
import { admin, newcomer, PASSWORD, setMockSession, TEMPORARY_PASSWORD } from './mocks/handlers'
import { server } from './mocks/server'
import { expectLocation, renderAt } from './test/render'

const mainNav = async () => within(await screen.findByRole('navigation', { name: 'Main navigation' }))
const main = async () => within(await screen.findByRole('main'))

async function signIn(identifier: string, password: string) {
  const user = userEvent.setup()
  await user.type(await screen.findByLabelText('Email or mobile number'), identifier)
  await user.type(screen.getByLabelText('Password'), password)
  await user.click(screen.getByRole('button', { name: 'Sign in' }))
}

describe('session guard', () => {
  it('sends a signed-out visitor to the login screen', async () => {
    setMockSession(null)
    renderAt('/help')
    await expectLocation('/login')
    expect(screen.getByRole('heading', { name: 'Haribol.' })).toBeInTheDocument()
  })

  it('keeps a signed-in devotee away from the login screen', async () => {
    renderAt('/login')
    await expectLocation('/')
  })

  it('sends a signed-out visitor at the root to the welcome page', async () => {
    setMockSession(null)
    renderAt('/')
    await expectLocation('/welcome')
  })

  it('leads from the wordmark to the welcome page', async () => {
    renderAt('/help')
    const [wordmark] = await screen.findAllByRole('link', { name: /Sharanagati Sadhana Tracker/ })
    await userEvent.setup().click(wordmark as HTMLElement)
    await expectLocation('/welcome')
  })
})

describe('signing in', () => {
  it('returns the devotee to the screen they asked for, by email', async () => {
    setMockSession(null)
    renderAt('/help')
    await expectLocation('/login')
    await signIn('Radhika@Example.org', PASSWORD)
    await expectLocation('/help')
    expect(await screen.findByText('Rādhikā Devī Dāsī')).toBeInTheDocument()
  })

  it('signs in by mobile number written any usual way', async () => {
    setMockSession(null)
    renderAt('/login')
    await signIn('98765 43210', PASSWORD)
    await expectLocation('/')
    expect(await screen.findByText('Rādhikā Devī Dāsī')).toBeInTheDocument()
  })

  it('asks for both fields before trying', async () => {
    setMockSession(null)
    renderAt('/login')
    await userEvent.setup().click(await screen.findByRole('button', { name: 'Sign in' }))
    expect(await screen.findByText('Enter your email or mobile number')).toBeInTheDocument()
    expect(screen.getByText('Enter your password')).toBeInTheDocument()
  })

  it('keeps the identifier and explains a wrong password', async () => {
    setMockSession(null)
    renderAt('/login')
    await signIn('radhika@example.org', 'wrong')
    expect(await screen.findByRole('alert')).toHaveTextContent("That email or mobile number and password don't match")
    expect(screen.getByLabelText('Email or mobile number')).toHaveValue('radhika@example.org')
    await expectLocation('/login')
  })

  it('asks the devotee to wait when attempts are rate-limited', async () => {
    setMockSession(null)
    server.use(http.post('/api/auth/login', () => new HttpResponse(null, { status: 429 })))
    renderAt('/login')
    await signIn('radhika@example.org', PASSWORD)
    expect(await screen.findByRole('alert')).toHaveTextContent('Too many attempts')
  })
})

describe('first sign-in', () => {
  it('requires a new password before anything else, then continues to today', async () => {
    setMockSession(null)
    renderAt('/help')
    await signIn('+91 98450 00108', TEMPORARY_PASSWORD)
    await expectLocation('/password')
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('One-time password'), 'wrong-guess')
    await user.type(screen.getByLabelText('New password'), 'govinda-jaya')
    await user.type(screen.getByLabelText('Confirm password'), 'govinda-jaya')
    await user.click(screen.getByRole('button', { name: 'Save password' }))
    expect(await screen.findByText("That isn't your current password.")).toBeInTheDocument()
    await user.clear(screen.getByLabelText('One-time password'))
    await user.type(screen.getByLabelText('One-time password'), TEMPORARY_PASSWORD)
    await user.click(screen.getByRole('button', { name: 'Save password' }))
    await expectLocation('/')
  })

  it('sends a flagged devotee to the password screen from any route', async () => {
    setMockSession(newcomer)
    renderAt('/help')
    await expectLocation('/password')
  })

  it('rejects a short password and a mismatched confirmation', async () => {
    setMockSession(newcomer)
    renderAt('/password')
    const user = userEvent.setup()
    await user.type(await screen.findByLabelText('One-time password'), TEMPORARY_PASSWORD)
    await user.type(screen.getByLabelText('New password'), 'short')
    await user.type(screen.getByLabelText('Confirm password'), 'short')
    await user.click(screen.getByRole('button', { name: 'Save password' }))
    expect(await screen.findByText('Use at least 8 characters')).toBeInTheDocument()
    await user.clear(screen.getByLabelText('New password'))
    await user.type(screen.getByLabelText('New password'), 'govinda-jaya')
    await user.click(screen.getByRole('button', { name: 'Save password' }))
    expect(await screen.findByText("Passwords don't match")).toBeInTheDocument()
    await expectLocation('/password')
  })
})

describe('password reset request', () => {
  it('confirms without revealing whether the account exists', async () => {
    setMockSession(null)
    renderAt('/login')
    const user = userEvent.setup()
    await user.click(await screen.findByRole('link', { name: 'Forgotten your password?' }))
    await user.type(await screen.findByLabelText('Email or mobile number'), 'nobody@example.org')
    await user.click(screen.getByRole('button', { name: 'Request one-time password' }))
    expect(await screen.findByRole('heading', { name: 'Request received' })).toBeInTheDocument()
    expect(screen.getByText(/if that account exists/i)).toBeInTheDocument()
  })
})

describe('signing out', () => {
  afterEach(() => {
    delete (navigator as { onLine?: boolean }).onLine
    server.events.removeAllListeners()
  })

  it('can end the session on every device', async () => {
    const calls: string[] = []
    server.events.on('request:start', ({ request }) => calls.push(`${request.method} ${new URL(request.url).pathname}`))
    renderAt('/more')
    await userEvent.setup().click((await main()).getByRole('button', { name: 'Sign out everywhere' }))
    await expectLocation('/login')
    expect(calls).toContain('POST /api/auth/logout-all')
  })

  it('returns to the login screen', async () => {
    renderAt('/more')
    await userEvent.setup().click((await main()).getByRole('button', { name: 'Sign out' }))
    await expectLocation('/login')
  })

  it('leaves nothing of the previous devotee on the device', async () => {
    renderAt('/profile')
    expect(await screen.findByDisplayValue('radhika@example.org')).toBeInTheDocument()
    const user = userEvent.setup()
    await user.click(screen.getByRole('complementary').querySelector('footer button') as HTMLElement)
    await signIn('98450 00007', PASSWORD)
    await expectLocation('/profile')
    expect(await screen.findByDisplayValue('+919845000007')).toBeInTheDocument()
    expect(screen.queryByDisplayValue('radhika@example.org')).not.toBeInTheDocument()
  })

  it('warns before discarding entries that have not synced, then clears them', async () => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => false })
    await enqueue({
      devoteeId: 'SH-0042',
      entry: { localDate: '2026-10-24', rounds: 16, reading: [], hearing: [], reflection: 'Private' },
      clientUpdatedAt: '2026-10-24T15:00:00.000Z',
      idempotencyKey: 'k1',
    })
    renderAt('/more')
    await screen.findAllByText(/1 pending/)
    const user = userEvent.setup()
    await user.click((await main()).getByRole('button', { name: 'Sign out' }))
    expect(await screen.findByText(/1 entry hasn't synced yet/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Sign out anyway' }))
    await expectLocation('/login')
    expect(await pending('SH-0042')).toEqual([])
  })
})

describe('shell', () => {
  it('shows a signed-in devotee their name and only their own screens', async () => {
    renderAt('/help')
    const nav = await mainNav()
    expect(screen.getByText('Rādhikā Devī Dāsī')).toBeInTheDocument()
    expect(nav.getByRole('link', { name: 'Today' })).toBeInTheDocument()
    expect(nav.queryByRole('link', { name: 'Group report' })).not.toBeInTheDocument()
    expect(nav.queryByRole('link', { name: 'Administration' })).not.toBeInTheDocument()
  })

  it('shows an administrator the congregation and administration screens', async () => {
    setMockSession(admin)
    renderAt('/help')
    const nav = await mainNav()
    expect(nav.getByRole('link', { name: 'Group report' })).toBeInTheDocument()
    expect(nav.getByRole('link', { name: 'Administration' })).toBeInTheDocument()
  })

  it('lists only the secondary screens a devotee may open on the More screen', async () => {
    renderAt('/more')
    const content = await main()
    expect(content.getByRole('link', { name: 'Profile & targets' })).toBeInTheDocument()
    expect(content.queryByRole('link', { name: 'Today' })).not.toBeInTheDocument()
    expect(content.queryByRole('link', { name: 'Administration' })).not.toBeInTheDocument()
  })

  it('explains who can see a devotee’s record on the help screen', async () => {
    renderAt('/help')
    expect(await screen.findByRole('heading', { name: 'Help, support & privacy' })).toBeInTheDocument()
    expect(screen.getByText(/your reflections are never shown to anyone else/i)).toBeInTheDocument()
  })

  it('tells a visitor when a path leads nowhere', async () => {
    renderAt('/nowhere')
    expect(await screen.findByText('This path leads nowhere.')).toBeInTheDocument()
  })
})
