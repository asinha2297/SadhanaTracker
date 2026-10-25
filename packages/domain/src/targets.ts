import type { LocalDate } from './localDate'
import type { EffectiveTarget, Target, TargetChoice } from './schemas'

export interface TargetHistory {
  recommended: EffectiveTarget[]
  personal: TargetChoice[]
}

function activeOn<T extends { effectiveDate: LocalDate }>(history: T[], localDate: LocalDate): T | undefined {
  return history.reduce<T | undefined>(
    (active, change) =>
      change.effectiveDate <= localDate && (!active || change.effectiveDate >= active.effectiveDate) ? change : active,
    undefined,
  )
}

export function resolveTarget(history: TargetHistory, localDate: LocalDate): Target | undefined {
  const choice = activeOn(history.personal, localDate)
  return choice?.kind === 'PERSONAL' ? choice.target : activeOn(history.recommended, localDate)?.target
}
