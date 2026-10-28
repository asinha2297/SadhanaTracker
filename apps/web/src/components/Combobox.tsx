import { ChevronDown } from 'lucide-react'
import { useId, useState, type KeyboardEvent } from 'react'
import { translateMessage, useT } from '../i18n'

export interface ComboboxOption<T extends string | number> {
  value: T
  label: string
  hint?: string | undefined
}

/** Case and diacritics aside, so "bhagavad" finds "Bhagavad-gītā". */
const fold = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

interface ComboboxProps<T extends string | number> {
  id: string
  label: string
  options: ComboboxOption<T>[]
  value: T | undefined
  onChange: (value: T | undefined) => void
  placeholder?: string | undefined
  error?: string | undefined
  /** Replaces the field when there is nothing to choose from. */
  emptyHint?: string | undefined
}

/** A searchable list to pick one option from: type to filter, arrows and Enter or a tap to choose, Escape to leave. */
export function Combobox<T extends string | number>({ id, label, options, value, onChange, placeholder, error, emptyHint }: ComboboxProps<T>) {
  const t = useT()
  const listId = useId()
  // While undefined the field shows the chosen option's label; typing replaces it with the query.
  const [query, setQuery] = useState<string>()
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const selected = options.find((option) => option.value === value)
  const matches = query === undefined ? options : options.filter((option) => fold(`${option.label} ${option.hint ?? ''}`).includes(fold(query)))
  const message = translateMessage(t, error)

  const choose = (option: ComboboxOption<T>) => {
    onChange(option.value)
    setQuery(undefined)
    setOpen(false)
  }
  const close = () => {
    setOpen(false)
    setQuery(undefined)
  }
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setOpen(true)
      setActive((index) => Math.min(index + 1, matches.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActive((index) => Math.max(index - 1, 0))
    } else if (event.key === 'Enter' && open) {
      event.preventDefault()
      const option = matches[active]
      if (option) choose(option)
    } else if (event.key === 'Escape') {
      close()
    }
  }

  if (options.length === 0 && emptyHint) {
    return (
      <div>
        <p className="block text-sm font-medium text-ink">{label}</p>
        <p className="mt-1.5 text-sm text-ink-muted">{emptyHint}</p>
      </div>
    )
  }

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-ink">
        {label}
      </label>
      <div className="relative mt-1.5">
        <input
          id={id}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && matches[active] ? `${listId}-${active}` : undefined}
          aria-invalid={message ? true : undefined}
          autoComplete="off"
          value={query ?? selected?.label ?? ''}
          placeholder={placeholder}
          onChange={(event) => {
            setQuery(event.target.value)
            setOpen(true)
            setActive(0)
            if (event.target.value === '') onChange(undefined)
          }}
          onFocus={() => setOpen(true)}
          onBlur={close}
          onKeyDown={onKeyDown}
          className="block w-full rounded-xl border border-line bg-canvas py-2.5 pl-3.5 pr-9 text-base text-ink transition-colors focus:border-saffron"
        />
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted" aria-hidden />
        {open && (
          <ul
            id={listId}
            role="listbox"
            className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-line bg-card p-1 shadow-float"
          >
            {matches.length === 0 && <li className="px-3 py-2 text-sm text-ink-muted">{t.combobox.noMatches}</li>}
            {matches.map((option, index) => (
              <li
                key={String(option.value)}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={option.value === value}
                // Chosen on mousedown, before the input blurs and the list closes.
                onMouseDown={(event) => {
                  event.preventDefault()
                  choose(option)
                }}
                onMouseEnter={() => setActive(index)}
                className={`cursor-pointer rounded-lg px-3 py-2 text-sm ${index === active ? 'bg-peacock/8 text-peacock' : 'text-ink'}`}
              >
                {option.label}
                {option.hint && <span className="block text-xs text-ink-muted">{option.hint}</span>}
              </li>
            ))}
          </ul>
        )}
      </div>
      {message && <p className="mt-1.5 text-sm text-red-700">{message}</p>}
    </div>
  )
}
