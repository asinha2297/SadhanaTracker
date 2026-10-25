import { describe, expect, it } from 'vitest'
import { returnPath } from './returnPath'

describe('returnPath', () => {
  it('returns the in-app path the devotee was sent to sign in from', () => {
    expect(returnPath({ from: '/week' })).toBe('/week')
  })

  it('falls back to today when there is nothing to return to', () => {
    expect(returnPath(null)).toBe('/')
    expect(returnPath({})).toBe('/')
  })

  it('never leaves the app', () => {
    expect(returnPath({ from: 'https://evil.example/' })).toBe('/')
    expect(returnPath({ from: '//evil.example' })).toBe('/')
  })
})
