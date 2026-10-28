import { motion } from 'motion/react'
import type { ReactNode } from 'react'
import { LanguageToggle } from './LanguageToggle'
import { Wordmark } from './Wordmark'

export function AuthCard({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <main className="flex min-h-dvh items-center justify-center px-5 py-10">
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="w-full max-w-sm rounded-3xl bg-card p-7 shadow-float md:p-9"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Wordmark tagline={false} />
          <LanguageToggle />
        </div>
        <h1 className="mt-8 font-serif text-3xl text-ink">{title}</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">{subtitle}</p>
        <div className="mt-7">{children}</div>
      </motion.section>
    </main>
  )
}
