import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AnimatedNumber } from './AnimatedNumber'

const prefersReducedMotion = (matches: boolean) =>
  vi.spyOn(window, 'matchMedia').mockImplementation(
    (query: string) =>
      ({ matches, media: query, addEventListener() {}, removeEventListener() {} }) as unknown as MediaQueryList,
  )

describe('AnimatedNumber', () => {
  it('shows the final value immediately when motion is reduced', () => {
    prefersReducedMotion(true)
    render(<AnimatedNumber value={12} />)
    expect(screen.getByText('12')).toBeInTheDocument()
  })

  it('counts up to the value otherwise', async () => {
    prefersReducedMotion(false)
    render(<AnimatedNumber value={12} />)
    expect(screen.getByText('0')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText('12')).toBeInTheDocument(), { timeout: 4000 })
  })
})
