import { describe, expect, it } from 'vitest'
import { normalizePhone, parseIdentifier } from './identity'

describe('normalizePhone', () => {
  it('accepts Indian mobiles with or without the country code', () => {
    expect(normalizePhone('98765 43210')).toBe('+919876543210')
    expect(normalizePhone('098765-43210')).toBe('+919876543210')
    expect(normalizePhone('+91 98765 43210')).toBe('+919876543210')
    expect(normalizePhone('91 98765 43210')).toBe('+919876543210')
  })

  it('keeps international numbers and rejects nonsense', () => {
    expect(normalizePhone('+44 7700 900123')).toBe('+447700900123')
    expect(normalizePhone('12345')).toBeUndefined()
    expect(normalizePhone('+1')).toBeUndefined()
    expect(normalizePhone('')).toBeUndefined()
  })
})

describe('parseIdentifier', () => {
  it('tells emails from mobiles and normalizes both', () => {
    expect(parseIdentifier(' Radhika@Example.org ')).toEqual({ kind: 'email', value: 'radhika@example.org' })
    expect(parseIdentifier('98765 43210')).toEqual({ kind: 'phone', value: '+919876543210' })
    expect(parseIdentifier('not an id')).toBeUndefined()
    expect(parseIdentifier('nope@')).toBeUndefined()
  })
})
