import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { coordinator, setMockSession } from '../mocks/handlers'
import { freezeTime, SATURDAY_EVENING } from '../test/clock'
import { renderAt } from '../test/render'

freezeTime(SATURDAY_EVENING)

const createObjectURL = vi.fn(() => 'blob:sadhana')
let anchorClick: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  setMockSession(coordinator)
  createObjectURL.mockClear()
  Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectURL })
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() })
  anchorClick = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
})

describe('ExportScreen', () => {
  it('downloads a CSV for the chosen group and this week by default', async () => {
    renderAt('/export')
    expect(await screen.findByLabelText('From')).toHaveValue('2026-10-19')
    expect(screen.getByLabelText('To')).toHaveValue('2026-10-25')
    await userEvent.setup().click(screen.getByRole('button', { name: 'Download' }))
    expect(await screen.findByText('Downloaded sadhana-sharanagati-2026-10-19-2026-10-25.csv')).toBeInTheDocument()
    expect(createObjectURL).toHaveBeenCalledTimes(1)
    expect(anchorClick).toHaveBeenCalledTimes(1)
  })

  it('explains that Excel is not available yet', async () => {
    renderAt('/export')
    const user = userEvent.setup()
    await user.click(await screen.findByLabelText('Excel (.xlsx)'))
    await user.click(screen.getByRole('button', { name: 'Download' }))
    expect(await screen.findByText(/excel export will be available/i)).toBeInTheDocument()
    expect(anchorClick).not.toHaveBeenCalled()
  })
})
