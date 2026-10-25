import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router'
import { expect } from 'vitest'
import { App } from '../App'

function LocationProbe() {
  return <output data-testid="location">{useLocation().pathname}</output>
}

export function renderAt(path: string) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } },
  })
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <App />
        <LocationProbe />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

export const expectLocation = (path: string) =>
  waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent(new RegExp(`^${path}$`)))
