import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { describe, expect, it } from 'vitest'
import { admin, devotee } from '../mocks/handlers'
import { AuthContext, type AuthContextValue } from './AuthContext'
import { RequireCapability } from './RequireCapability'
import type { SessionUser } from './session'

const signedInAs = (user: SessionUser): AuthContextValue => ({
  state: { status: 'signed-in', user },
  setUser: () => undefined,
  signOut: () => Promise.resolve(),
})

function renderAdminArea(user: SessionUser) {
  render(
    <AuthContext value={signedInAs(user)}>
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route path="/" element={<p>Today</p>} />
          <Route element={<RequireCapability capability="ADMINISTER" />}>
            <Route path="/admin" element={<p>Administration</p>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </AuthContext>,
  )
}

describe('RequireCapability', () => {
  it('lets a role with the capability through', () => {
    renderAdminArea(admin)
    expect(screen.getByText('Administration')).toBeInTheDocument()
  })

  it('sends a role without it back to today', () => {
    renderAdminArea(devotee)
    expect(screen.getByText('Today')).toBeInTheDocument()
    expect(screen.queryByText('Administration')).not.toBeInTheDocument()
  })
})
