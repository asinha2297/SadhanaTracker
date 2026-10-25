import { describe, expect, it } from 'vitest'
import { idempotencyKey } from './idempotency'

describe('idempotencyKey', () => {
  it('is deterministic for the same user, date and client timestamp', () => {
    expect(idempotencyKey('dev-042', '2026-10-24', '2026-10-24T15:30:00.000Z')).toBe(
      'dev-042_2026-10-24_2026-10-24T15:30:00.000Z',
    )
  })

  it('changes whenever the client timestamp changes', () => {
    expect(idempotencyKey('dev-042', '2026-10-24', '2026-10-24T15:30:00.000Z')).not.toBe(
      idempotencyKey('dev-042', '2026-10-24', '2026-10-24T15:31:00.000Z'),
    )
  })
})
