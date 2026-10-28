import { ChevronDown, Languages } from 'lucide-react'
import { LANGUAGES, useLanguage, type Language } from '../i18n'

/** The three languages by their own names, in a pill; the choice is remembered on this device. */
export function LanguageToggle({ className = '' }: { className?: string }) {
  const { language, setLanguage, t } = useLanguage()
  return (
    <span className={`relative inline-flex items-center ${className}`}>
      <Languages className="pointer-events-none absolute left-3 size-4 text-saffron" aria-hidden />
      <select
        aria-label={t.language}
        value={language}
        onChange={(event) => setLanguage(event.target.value as Language)}
        className="cursor-pointer appearance-none rounded-full border border-line bg-card py-1.5 pl-9 pr-8 text-sm font-medium text-ink shadow-card transition-colors hover:border-peacock/40 hover:text-peacock"
      >
        {(Object.keys(LANGUAGES) as Language[]).map((code) => (
          <option key={code} value={code}>
            {LANGUAGES[code].nativeName}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 size-3.5 text-ink-muted" aria-hidden />
    </span>
  )
}
