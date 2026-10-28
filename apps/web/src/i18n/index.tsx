import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { bn } from './bn'
import { en, type Dictionary } from './en'
import { hi } from './hi'

export type { Dictionary }
export type Language = 'en' | 'hi' | 'bn'

export const LANGUAGES: Record<Language, { nativeName: string; locale: string; dictionary: Dictionary }> = {
  en: { nativeName: 'English', locale: 'en-GB', dictionary: en },
  hi: { nativeName: 'हिन्दी', locale: 'hi-IN', dictionary: hi },
  bn: { nativeName: 'বাংলা', locale: 'bn-IN', dictionary: bn },
}

export const STORAGE_KEY = 'sadhana.language'

const isLanguage = (value: unknown): value is Language => typeof value === 'string' && value in LANGUAGES

/** The remembered choice first; on a first visit, the device's language when it is one of ours; English otherwise. */
export function initialLanguage(): Language {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (isLanguage(stored)) return stored
  } catch {
    // Storage can be unavailable (private mode, blocked site data); the choice then lasts for the session.
  }
  const device = navigator.language?.slice(0, 2)
  return isLanguage(device) ? device : 'en'
}

interface LanguageValue {
  language: Language
  setLanguage: (language: Language) => void
  t: Dictionary
}

// English outside a provider, so a component rendered on its own (tests, previews) still reads.
const LanguageContext = createContext<LanguageValue>({ language: 'en', setLanguage: () => {}, t: en })

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(initialLanguage)
  const setLanguage = useCallback((next: Language) => {
    setLanguageState(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // See initialLanguage.
    }
  }, [])
  const t = LANGUAGES[language].dictionary

  useEffect(() => {
    document.documentElement.lang = language
    document.title = t.brand.title
  }, [language, t])

  const value = useMemo(() => ({ language, setLanguage, t }), [language, setLanguage, t])
  return <LanguageContext value={value}>{children}</LanguageContext>
}

export const useLanguage = (): LanguageValue => useContext(LanguageContext)

/** The dictionary of the current language. */
export const useT = (): Dictionary => useLanguage().t

const KEY_BY_ENGLISH = new Map(Object.entries(en.messages).map(([key, text]) => [text, key as keyof Dictionary['messages']]))

/** Validation and server messages arrive in English; known ones are shown in the current language, the rest as they came. */
export function translateMessage(t: Dictionary, message: string | undefined): string | undefined {
  if (message === undefined) return undefined
  const key = KEY_BY_ENGLISH.get(message)
  return key ? t.messages[key] : message
}

/** Renders `**bold**` runs as <strong> and `{slot}` tokens from `slots`, so dictionaries stay plain text. */
export function renderRich(text: string, slots: Record<string, ReactNode> = {}): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|\{[a-zA-Z]+\})/).map((part, index) => {
    if (part.startsWith('**')) return <strong key={index}>{part.slice(2, -2)}</strong>
    if (part.startsWith('{')) return <span key={index}>{slots[part.slice(1, -1)] ?? part}</span>
    return part
  })
}
