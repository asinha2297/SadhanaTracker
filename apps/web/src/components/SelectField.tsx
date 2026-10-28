import type { ComponentProps } from 'react'
import { translateMessage, useT } from '../i18n'

interface SelectFieldProps extends ComponentProps<'select'> {
  id: string
  label: string
  error?: string
}

export function SelectField({ id, label, error, children, ...select }: SelectFieldProps) {
  const message = translateMessage(useT(), error)
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-ink">
        {label}
      </label>
      <select
        id={id}
        className="mt-1.5 block w-full rounded-xl border border-line bg-canvas px-3.5 py-2.5 text-base text-ink"
        {...select}
      >
        {children}
      </select>
      {message && <p className="mt-1.5 text-sm text-red-700">{message}</p>}
    </div>
  )
}
