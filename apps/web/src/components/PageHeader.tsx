import type { ReactNode } from 'react'

export function PageHeader({ title, subtitle, children }: { title: string; subtitle?: string; children?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-serif text-3xl text-ink md:text-4xl">{title}</h1>
        {subtitle && <p className="mt-1.5 text-ink-muted">{subtitle}</p>}
      </div>
      {children}
    </header>
  )
}
