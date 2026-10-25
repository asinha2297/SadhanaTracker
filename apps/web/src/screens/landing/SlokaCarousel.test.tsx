import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SlokaCarousel } from './Sections'

describe('SlokaCarousel', () => {
  it('advances to the next śloka on its own', async () => {
    render(<SlokaCarousel intervalMs={700} />)
    expect(screen.getByText(/ananyāś cintayanto/)).toBeInTheDocument()
    expect(await screen.findByText(/maharṣīṇāṁ bhṛgur/, {}, { timeout: 3000 })).toBeInTheDocument()
  })
})
