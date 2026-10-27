export const EYEBROW = 'text-xs font-semibold uppercase tracking-[0.18em] text-ink-muted'

export const ICON_BUTTON =
  'flex size-9 items-center justify-center rounded-full border border-line text-saffron-text transition-colors hover:border-peacock/40 hover:text-peacock disabled:opacity-30'

export const chip = (pressed: boolean) =>
  `rounded-full border px-3 py-1 text-sm font-medium transition-colors ${
    pressed ? 'border-saffron bg-saffron/10 text-saffron-text' : 'border-line text-ink-muted hover:border-peacock/50 hover:text-peacock'
  }`
