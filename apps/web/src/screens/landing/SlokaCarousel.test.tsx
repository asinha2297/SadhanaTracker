import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { en } from '../../i18n/en'
import { SlokaCarousel } from './Sections'

const stubbedMatchMedia = window.matchMedia

function allowMotion() {
  window.matchMedia = (query: string) =>
    ({ matches: false, media: query, addEventListener() {}, removeEventListener() {} }) as unknown as MediaQueryList
}

afterEach(() => {
  window.matchMedia = stubbedMatchMedia
})

describe('SlokaCarousel', () => {
  it('pairs every śloka with a picture and opens on the first', () => {
    render(<SlokaCarousel />)
    const region = within(screen.getByRole('region', { name: 'Ślokas' }))
    expect(region.getByText(/ananyāś cintayanto/)).toBeInTheDocument()
    for (const sloka of en.landing.slokas) expect(region.getByAltText(sloka.alt)).toBeInTheDocument()
    expect(region.getByAltText(/Śrīla Prabhupāda/)).toBeInTheDocument()
    expect(region.getAllByAltText(/Kṛṣṇa and Arjuna/)).toHaveLength(2)
  })

  it('turns to the verse a devotee picks', async () => {
    render(<SlokaCarousel />)
    await userEvent.setup().click(await screen.findByRole('button', { name: 'Verse 3' }))
    expect(await screen.findByText(/karmaṇy evādhikāras/)).toBeInTheDocument()
  })

  it('advances on its own when motion is welcome', async () => {
    allowMotion()
    render(<SlokaCarousel intervalMs={700} />)
    expect(await screen.findByText(/maharṣīṇāṁ bhṛgur/, {}, { timeout: 3000 })).toBeInTheDocument()
  })

  it('holds still for devotees who prefer reduced motion', async () => {
    render(<SlokaCarousel intervalMs={300} />)
    await new Promise((resolve) => setTimeout(resolve, 1200))
    expect(screen.getByText(/ananyāś cintayanto/)).toBeInTheDocument()
  })
})
