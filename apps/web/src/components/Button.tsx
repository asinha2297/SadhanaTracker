import type { ComponentProps } from 'react'

export function Button({ className = '', ...button }: ComponentProps<'button'>) {
  return (
    <button
      className={`rounded-full bg-saffron px-5 py-3 text-sm font-semibold text-white transition-opacity disabled:opacity-60 ${className}`}
      {...button}
    />
  )
}
