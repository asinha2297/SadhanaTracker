export const EYEBROW = 'text-xs font-semibold uppercase tracking-[0.18em] text-ink-muted'

export const ICON_BUTTON =
  'flex size-9 items-center justify-center rounded-full border border-line text-ink-muted transition-colors hover:text-ink disabled:opacity-30'

export const chip = (pressed: boolean) =>
  `rounded-full border px-3 py-1 text-sm font-medium transition-colors ${
    pressed ? 'border-saffron bg-saffron/10 text-saffron-text' : 'border-line text-ink-muted hover:text-ink'
  }`
