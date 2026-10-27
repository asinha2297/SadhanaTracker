import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { Wordmark } from './Wordmark'

const renderMark = (props: { tagline?: boolean } = {}) =>
  render(
    <MemoryRouter>
      <Wordmark {...props} />
    </MemoryRouter>,
  )

describe('Wordmark', () => {
  it('sets the mālā-and-lotus mark and the name on one line, in the Devanagari-styled face', () => {
    renderMark()
    const link = screen.getByRole('link', { name: 'Sharanagati Sadhana Tracker, home' })
    expect(link).toHaveAttribute('href', '/welcome')
    expect(link.className).toMatch(/inline-flex/)
    expect(link.className).toMatch(/items-center/)
    const mark = link.querySelector('svg')
    expect(mark).toHaveAttribute('aria-hidden', 'true')
    const word = link.querySelector('.logo-word')
    expect(word).toHaveTextContent('Sharanagati')
    expect(word?.className).toMatch(/font-brand/)
    expect(mark?.nextElementSibling).toBe(word)
    expect(link).toHaveTextContent('Sadhana Tracker')
    expect(link.querySelectorAll('.logo-bead')).toHaveLength(24)
    expect(link.querySelector('.logo-sumeru')).not.toBeNull()
    expect(link.querySelector('.logo-lotus')).not.toBeNull()
  })

  it('gives every copy of the mark its own gradients, so a hidden copy cannot blank a visible one', () => {
    render(
      <MemoryRouter>
        <Wordmark />
        <Wordmark tagline={false} />
      </MemoryRouter>,
    )
    const ids = [...document.querySelectorAll('radialGradient, linearGradient')].map((node) => node.id)
    expect(ids).toHaveLength(6)
    expect(new Set(ids).size).toBe(6)
    const [first, second] = screen.getAllByRole('link')
    const fillOf = (link: HTMLElement | undefined) => link?.querySelector('.logo-bead')?.getAttribute('fill')
    expect(fillOf(first)).toMatch(/^url\(#.+\)$/)
    expect(fillOf(first)).not.toBe(fillOf(second))
  })

  it('drops the tagline where there is no room, keeping the full name for screen readers', () => {
    renderMark({ tagline: false })
    const link = screen.getByRole('link', { name: 'Sharanagati Sadhana Tracker, home' })
    expect(link).toHaveTextContent('Sharanagati')
    expect(link).not.toHaveTextContent('Sadhana Tracker')
  })
})
