import { LocalDateSchema, TargetSchema, type LocalDate, type TargetChoice } from '@sadhana/domain'
import { z } from 'zod'

const numberOrBlank = z.number().or(z.nan())

export const targetChoiceForm = (today: LocalDate) =>
  z
    .object({
      kind: z.enum(['RECOMMENDED', 'PERSONAL']),
      effectiveDate: LocalDateSchema.refine((date) => date >= today, 'Choose today or a later date'),
      rounds: numberOrBlank,
      readingMinutes: numberOrBlank,
      hearingMinutes: numberOrBlank,
    })
    .superRefine((values, ctx) => {
      if (values.kind !== 'PERSONAL') return
      for (const key of ['rounds', 'readingMinutes', 'hearingMinutes'] as const) {
        const issue = TargetSchema.shape[key].safeParse(values[key]).error?.issues[0]
        if (issue) ctx.addIssue({ code: 'custom', path: [key], message: issue.message })
      }
    })

export type TargetFormValues = z.infer<ReturnType<typeof targetChoiceForm>>

export function toTargetChoice(values: TargetFormValues): TargetChoice {
  return values.kind === 'PERSONAL'
    ? {
        kind: 'PERSONAL',
        effectiveDate: values.effectiveDate,
        target: { rounds: values.rounds, readingMinutes: values.readingMinutes, hearingMinutes: values.hearingMinutes },
      }
    : { kind: 'RECOMMENDED', effectiveDate: values.effectiveDate }
}
