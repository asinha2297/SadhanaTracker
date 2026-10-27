import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { admin, coordinator, setMockSession } from '../mocks/handlers'
import { expectLocation, renderAt } from '../test/render'

describe('MasterAdminScreen', () => {
  it('lets a coordinator create a devotee account and hand over its one-time password', async () => {
    setMockSession(coordinator)
    renderAt('/master-admin')
    expect(await screen.findByRole('heading', { name: 'Master admin' })).toBeInTheDocument()
    const user = userEvent.setup()
    expect(screen.queryByLabelText('Role')).not.toBeInTheDocument()
    await user.type(screen.getByLabelText('Name'), 'Haridāsa Dāsa')
    await user.click(screen.getByRole('button', { name: 'Create account' }))
    expect(await screen.findByText('Enter your mobile number')).toBeInTheDocument()
    await user.type(screen.getByLabelText('Mobile number'), '98450 00300')
    await user.click(screen.getByRole('button', { name: 'Create account' }))
    expect(await screen.findByText('hari-200')).toBeInTheDocument()
    expect(screen.getByText(/share this one-time password in person/i)).toBeInTheDocument()
    expect(screen.getByText(/\+919845000300/)).toBeInTheDocument()
    const row = await screen.findByRole('row', { name: /Haridāsa Dāsa/ })
    expect(within(row).getByText('Devotee')).toBeInTheDocument()
  })

  it('keeps administrative controls, and other leaders’ passwords, away from a coordinator', async () => {
    setMockSession(coordinator)
    renderAt('/master-admin')
    const devoteeRow = await screen.findByRole('row', { name: /Rādhikā Devī Dāsī/ })
    expect(within(devoteeRow).getByRole('button', { name: 'Issue one-time password' })).toBeInTheDocument()
    const adminRow = screen.getByRole('row', { name: /Nitāi Dāsa/ })
    expect(within(adminRow).queryByRole('button', { name: 'Issue one-time password' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Deactivate' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Rename' })).not.toBeInTheDocument()
    expect(screen.queryByRole('checkbox', { name: /Record review/ })).not.toBeInTheDocument()
  })

  it('lets an administrator create a coordinator', async () => {
    setMockSession(admin)
    renderAt('/master-admin')
    const user = userEvent.setup()
    await user.type(await screen.findByLabelText('Name'), 'Gaura Dāsa')
    await user.type(screen.getByLabelText('Mobile number'), '98450 00302')
    await user.selectOptions(screen.getByLabelText('Role'), 'COORDINATOR')
    await user.click(screen.getByRole('button', { name: 'Create account' }))
    expect(await screen.findByText('hari-200')).toBeInTheDocument()
    const row = await screen.findByRole('row', { name: /Gaura Dāsa/ })
    expect(within(row).getByLabelText('Role of Gaura Dāsa')).toHaveValue('COORDINATOR')
  })

  it('lets an administrator correct a devotee’s name', async () => {
    setMockSession(admin)
    renderAt('/master-admin')
    const user = userEvent.setup()
    const row = await screen.findByRole('row', { name: /Yaśodā Devī Dāsī/ })
    await user.click(within(row).getByRole('button', { name: 'Rename' }))
    const input = within(row).getByLabelText('New name')
    await user.clear(input)
    await user.type(input, 'Yaśodā Devī Dāsī (Bengaluru)')
    await user.click(within(row).getByRole('button', { name: 'Save name' }))
    expect(await screen.findByRole('row', { name: /Yaśodā Devī Dāsī \(Bengaluru\)/ })).toBeInTheDocument()
  })

  it('lets an administrator deactivate and reactivate an account', async () => {
    setMockSession(admin)
    renderAt('/master-admin')
    const user = userEvent.setup()
    const row = await screen.findByRole('row', { name: /Rādhikā Devī Dāsī/ })
    await user.click(within(row).getByRole('button', { name: 'Deactivate' }))
    expect(await within(row).findByText('Inactive')).toBeInTheDocument()
    await user.click(within(row).getByRole('button', { name: 'Reactivate' }))
    expect(await within(row).findByText('Active')).toBeInTheDocument()
  })

  it('lets an administrator answer a pending password reset request', async () => {
    setMockSession(admin)
    renderAt('/master-admin')
    const requests = within(await screen.findByRole('region', { name: 'Password reset requests' }))
    expect(requests.getByText('Vṛndā Devī Dāsī')).toBeInTheDocument()
    await userEvent.setup().click(requests.getByRole('button', { name: 'Issue one-time password' }))
    expect(await requests.findByText(/share this one-time password in person/i)).toBeInTheDocument()
    expect(requests.queryByRole('button', { name: 'Issue one-time password' })).not.toBeInTheDocument()
  })

  it('lets an administrator grant record review to a coordinator', async () => {
    setMockSession(admin)
    renderAt('/master-admin')
    const row = await screen.findByRole('row', { name: /Lalitā Devī Dāsī/ })
    const toggle = within(row).getByRole('checkbox', { name: 'Record review for Lalitā Devī Dāsī' })
    expect(toggle).not.toBeChecked()
    await userEvent.setup().click(toggle)
    await waitFor(() => expect(within(screen.getByRole('row', { name: /Lalitā Devī Dāsī/ })).getByRole('checkbox', { name: /Record review/ })).toBeChecked())
    expect(within(screen.getByRole('row', { name: /Rādhikā Devī Dāsī/ })).queryByRole('checkbox')).not.toBeInTheDocument()
  })

  it('sends a devotee back to today', async () => {
    renderAt('/master-admin')
    await expectLocation('/')
  })
})
