import { describe, expect, it } from 'vitest'
import { dequeue, enqueue, pending } from './syncQueue'

const entry = (rounds: number) => ({ localDate: '2026-10-24', rounds, reading: [], hearing: [] })

describe('sync queue', () => {
  it('keeps one queued record per devotee and day, replacing older edits', async () => {
    await enqueue({
      devoteeId: 'SH-0042',
      entry: entry(8),
      clientUpdatedAt: '2026-10-24T10:00:00.000Z',
      baseUpdatedAt: '2026-10-23T16:30:00.000Z',
      idempotencyKey: 'k1',
    })
    await enqueue({
      devoteeId: 'SH-0042',
      entry: entry(16),
      clientUpdatedAt: '2026-10-24T11:00:00.000Z',
      baseUpdatedAt: undefined,
      idempotencyKey: 'k2',
    })
    const queued = await pending('SH-0042')
    expect(queued).toHaveLength(1)
    expect(queued[0]?.entry.rounds).toBe(16)
    expect(queued[0]?.idempotencyKey).toBe('k2')
    expect(queued[0]?.baseUpdatedAt).toBe('2026-10-23T16:30:00.000Z')
  })

  it('lists only the given devotee and forgets dequeued items', async () => {
    await enqueue({ devoteeId: 'SH-0042', entry: entry(4), clientUpdatedAt: 'c', idempotencyKey: 'a' })
    await enqueue({ devoteeId: 'SH-0007', entry: entry(4), clientUpdatedAt: 'c', idempotencyKey: 'b' })
    expect(await pending('SH-0042')).toHaveLength(1)
    await dequeue('SH-0042|2026-10-24')
    expect(await pending('SH-0042')).toHaveLength(0)
    expect(await pending('SH-0007')).toHaveLength(1)
  })
})
