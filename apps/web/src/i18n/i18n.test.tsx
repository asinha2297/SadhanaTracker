import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { setMockSession } from '../mocks/handlers'
import { renderAt } from '../test/render'
import { en } from './en'
import { hi } from './hi'
import { LanguageProvider, renderRich, STORAGE_KEY, translateMessage, useLanguage } from './index'

function Probe() {
  const { language, setLanguage, t } = useLanguage()
  return (
    <div>
      <output>{t.nav.items.today}</output>
      <output data-testid="language">{language}</output>
      <button type="button" onClick={() => setLanguage('hi')}>
        hi
      </button>
    </div>
  )
}

beforeEach(() => localStorage.clear())

describe('LanguageProvider', () => {
  it('starts in English, switches instantly and remembers the choice', async () => {
    render(
      <LanguageProvider>
        <Probe />
      </LanguageProvider>,
    )
    expect(screen.getByText('Today')).toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('button', { name: 'hi' }))
    expect(screen.getByText('आज')).toBeInTheDocument()
    expect(localStorage.getItem(STORAGE_KEY)).toBe('hi')
    expect(document.documentElement.lang).toBe('hi')
  })

  it('comes back in the remembered language', () => {
    localStorage.setItem(STORAGE_KEY, 'bn')
    render(
      <LanguageProvider>
        <Probe />
      </LanguageProvider>,
    )
    expect(screen.getByTestId('language')).toHaveTextContent('bn')
    expect(screen.getByText('আজ')).toBeInTheDocument()
  })

  it('shows known validation messages in the current language and leaves unknown text alone', () => {
    expect(translateMessage(en, 'Enter your password')).toBe('Enter your password')
    expect(translateMessage(hi, 'Enter your password')).toBe(hi.messages.passwordRequired)
    expect(translateMessage(hi, 'Something the server made up')).toBe('Something the server made up')
    expect(translateMessage(hi, undefined)).toBeUndefined()
  })

  it('renders bold runs and slots from plain dictionary text', () => {
    render(<p>{renderRich('**You** see {what}.', { what: <em>everything</em> })}</p>)
    expect(screen.getByText('You').tagName).toBe('STRONG')
    expect(screen.getByText('everything').tagName).toBe('EM')
  })
})

describe('language toggle on the welcome page', () => {
  it('switches the whole page to Hindi and remembers it', async () => {
    setMockSession(null)
    renderAt('/welcome')
    await screen.findByRole('heading', { level: 1 })
    await userEvent.setup().selectOptions(screen.getAllByRole('combobox', { name: 'Language' })[0] as HTMLElement, 'hi')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('अपनी दैनिक साधना करें, भक्ति के साथ।')
    expect(screen.getAllByRole('link', { name: 'साइन इन' })[0]).toHaveAttribute('href', '/login')
    expect(screen.getByText('भगवद् गीता 18.66')).toBeInTheDocument()
    expect(localStorage.getItem(STORAGE_KEY)).toBe('hi')
  })
})
