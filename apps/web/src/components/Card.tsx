import type { ComponentProps } from 'react'

export function Card({ className = '', ...props }: ComponentProps<'section'>) {
  return <section className={`rounded-2xl border border-line bg-card p-5 shadow-card ${className}`} {...props} />
}
