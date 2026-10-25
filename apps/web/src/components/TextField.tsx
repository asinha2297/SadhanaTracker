import type { ComponentProps } from 'react'

interface TextFieldProps extends ComponentProps<'input'> {
  id: string
  label: string
  error?: string
}

export function TextField({ id, label, error, ...input }: TextFieldProps) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-ink">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className="mt-1.5 block w-full rounded-xl border border-line bg-canvas px-3.5 py-2.5 text-base text-ink transition-colors focus:border-saffron"
        {...input}
      />
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  )
}
