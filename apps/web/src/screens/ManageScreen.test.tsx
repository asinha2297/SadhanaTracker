import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { admin, coordinator, seedPendingAccount, setMockSession } from '../mocks/handlers'
import { renderAt } from '../test/render'

describe('ManageScreen', () => {
  it('shows a coordinator their roster without administrative controls', async () => {
    setMockSession(coordinator)
    renderAt('/manage')
    expect(await screen.findByRole('row', { name: /Rādhikā Devī Dāsī/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Create account' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Deactivate' })).not.toBeInTheDocument()
  })

  it('lets an administrator create an account and hands over a one-time password', async () => {
    setMockSession(admin)
    renderAt('/manage')
    const user = userEvent.setup()
    await user.type(await screen.findByLabelText('Name'), 'Haridāsa Dāsa')
    await user.click(screen.getByRole('button', { name: 'Create account' }))
    expect(await screen.findByText('Enter your mobile number')).toBeInTheDocument()
    await user.type(screen.getByLabelText('Mobile number'), '98450 00300')
    await user.click(screen.getByRole('button', { name: 'Create account' }))
    expect(await screen.findByText('hari-200')).toBeInTheDocument()
    expect(screen.getByText(/share this one-time password in person/i)).toBeInTheDocument()
    expect(screen.getByText(/\+919845000300/)).toBeInTheDocument()
    expect(await screen.findByRole('row', { name: /Haridāsa Dāsa/ })).toBeInTheDocument()
  })

  it('lets an administrator correct a devotee’s name', async () => {
    setMockSession(admin)
    renderAt('/manage')
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
    renderAt('/manage')
    const user = userEvent.setup()
    const row = await screen.findByRole('row', { name: /Rādhikā Devī Dāsī/ })
    await user.click(within(row).getByRole('button', { name: 'Deactivate' }))
    expect(await within(row).findByText('Inactive')).toBeInTheDocument()
    await user.click(within(row).getByRole('button', { name: 'Reactivate' }))
    expect(await within(row).findByText('Active')).toBeInTheDocument()
  })

  it('lets an administrator answer a pending password reset request', async () => {
    setMockSession(admin)
    renderAt('/manage')
    const requests = within(await screen.findByRole('region', { name: 'Password reset requests' }))
    expect(requests.getByText('Vṛndā Devī Dāsī')).toBeInTheDocument()
    await userEvent.setup().click(requests.getByRole('button', { name: 'Issue one-time password' }))
    expect(await requests.findByText(/hari-\d+/)).toBeInTheDocument()
    expect(requests.queryByRole('button', { name: 'Issue one-time password' })).not.toBeInTheDocument()
  })

  it('lets a coordinator approve a join request', async () => {
    setMockSession(coordinator)
    seedPendingAccount({ devoteeId: 'SH-0150', name: 'Haridāsa Dāsa', groupId: 'sharanagati', phone: '+919845000150' })
    renderAt('/manage')
    const requests = within(await screen.findByRole('region', { name: 'Join requests' }))
    expect(requests.getByText('Haridāsa Dāsa')).toBeInTheDocument()
    await userEvent.setup().click(requests.getByRole('button', { name: 'Approve' }))
    const row = await screen.findByRole('row', { name: /Haridāsa Dāsa/ })
    expect(within(row).getByText('Active')).toBeInTheDocument()
  })

  it('lets a coordinator create a group and add a devotee to it', async () => {
    setMockSession(coordinator)
    renderAt('/manage')
    const user = userEvent.setup()
    await user.type(await screen.findByLabelText('New group name'), 'Sharanagati Youth')
    await user.click(screen.getByRole('button', { name: 'Create group' }))
    await waitFor(() => expect(screen.getByLabelText('Group')).toHaveValue('sharanagati-youth'))
    const picker = await screen.findByLabelText('Add existing devotee')
    expect(within(picker).queryByRole('option', { name: /Balarāma Dāsa/ })).not.toBeInTheDocument()
    await user.selectOptions(picker, 'SH-0046')
    await user.click(screen.getByRole('button', { name: 'Add to group' }))
    expect(await screen.findByRole('row', { name: /Gopīnātha Dāsa/ })).toBeInTheDocument()
  })

  it('lets a coordinator remove a devotee from the group', async () => {
    setMockSession(coordinator)
    renderAt('/manage')
    const row = await screen.findByRole('row', { name: /Yaśodā Devī Dāsī/ })
    await userEvent.setup().click(within(row).getByRole('button', { name: 'Remove from group' }))
    await waitFor(() => expect(screen.queryByRole('row', { name: /Yaśodā Devī Dāsī/ })).not.toBeInTheDocument())
  })
})
