import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { setMockSession } from '../mocks/handlers'
import { renderAt } from '../test/render'

describe('LandingScreen', () => {
  it('welcomes a visitor with the surrender verse and the ways in', async () => {
    setMockSession(null)
    renderAt('/welcome')
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent(/sadhana/i)
    expect(screen.getByText(/sarva-dharmān parityajya/)).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: 'Create an account' })[0]).toHaveAttribute('href', '/signup')
    expect(screen.getAllByRole('link', { name: 'Sign in' })[0]).toHaveAttribute('href', '/login')
  })

  it('offers a signed-in devotee the way to today', async () => {
    renderAt('/welcome')
    expect((await screen.findAllByRole('link', { name: "Open today's sadhana" }))[0]).toHaveAttribute('href', '/')
    expect(screen.queryByRole('link', { name: 'Create an account' })).not.toBeInTheDocument()
  })

  it('moves through the ślokas by hand', async () => {
    setMockSession(null)
    renderAt('/welcome')
    const carousel = within(await screen.findByRole('region', { name: 'Ślokas' }))
    expect(carousel.getByText(/ananyāś cintayanto/)).toBeInTheDocument()
    await userEvent.setup().click(carousel.getByRole('button', { name: 'Verse 3' }))
    expect(await carousel.findByText(/karmaṇy evādhikāras/)).toBeInTheDocument()
  })

  it('credits the photographers', async () => {
    setMockSession(null)
    renderAt('/welcome')
    expect(await screen.findByRole('heading', { name: 'Photography' })).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /Wikimedia Commons/ }).length).toBeGreaterThan(0)
  })
})
