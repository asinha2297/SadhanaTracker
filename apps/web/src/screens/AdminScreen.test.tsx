import { fireEvent, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { admin, coordinator, setMockSession } from '../mocks/handlers'
import { freezeTime, SATURDAY_EVENING } from '../test/clock'
import { expectLocation, renderAt } from '../test/render'

freezeTime(SATURDAY_EVENING)

const auditRows = async () => within(await screen.findByRole('list', { name: 'Audit log' })).getAllByRole('listitem')

describe('AdminScreen', () => {
  it('shows the immutable audit log newest first', async () => {
    setMockSession(admin)
    renderAt('/admin')
    const rows = await auditRows()
    expect(rows[0]).toHaveTextContent('Account created')
    expect(rows[0]).toHaveTextContent('Mādhava Dāsa')
    expect(rows).toHaveLength(5)
  })

  it('sets a new recommended target from a future date and records it in the audit log', async () => {
    setMockSession(admin)
    renderAt('/admin')
    const user = userEvent.setup()
    for (const [label, value] of [
      ['Rounds', '16'],
      ['Reading minutes', '45'],
      ['Hearing minutes', '45'],
    ] as const) {
      const input = await screen.findByLabelText(label)
      await user.clear(input)
      await user.type(input, value)
    }
    fireEvent.change(screen.getByLabelText('Effective from'), { target: { value: '2026-11-01' } })
    await user.click(screen.getByRole('button', { name: 'Save recommended target' }))
    expect(await screen.findByText('From 1 Nov')).toBeInTheDocument()
    expect(screen.getByText('16 rounds · 45 min reading · 45 min hearing')).toBeInTheDocument()
    const rows = await auditRows()
    expect(rows[0]).toHaveTextContent('Recommended target set')
    expect(rows).toHaveLength(6)
  })

  it('keeps a coordinator out of administration', async () => {
    setMockSession(coordinator)
    renderAt('/admin')
    await expectLocation('/')
  })
})
