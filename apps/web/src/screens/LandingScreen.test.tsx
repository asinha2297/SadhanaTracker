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

  it('greets visitors with Śrīla Prabhupāda inside the japa-mālā', async () => {
    setMockSession(null)
    renderAt('/welcome')
    const portrait = await screen.findByRole('figure', { name: 'Śrīla Prabhupāda' })
    expect(within(portrait).getByAltText(/Mūrti of Śrīla Prabhupāda/)).toHaveAttribute('src', '/landing/prabhupada-portrait.jpg')
    expect(within(portrait).getByText('Founder-ācārya of ISKCON')).toBeInTheDocument()
    expect(screen.queryByAltText(/lotus/i)).not.toBeInTheDocument()
    expect(screen.getByText(/Dedda71/)).toBeInTheDocument()
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

  it('credits the artists, photographers and the carousel design', async () => {
    setMockSession(null)
    renderAt('/welcome')
    expect(await screen.findByRole('heading', { name: 'Images' })).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /Wikimedia Commons/ }).length).toBeGreaterThan(0)
    expect(screen.getByText(/Mukunda Goswami/)).toBeInTheDocument()
    expect(screen.getByText(/Raja Ravi Varma/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Skiper UI' })).toBeInTheDocument()
  })
})
