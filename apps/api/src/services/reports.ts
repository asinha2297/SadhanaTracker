import type { MemberWeek, Report } from '@sadhana/contract'
import {
  dayStatus,
  resolveTarget,
  sumTotals,
  targetCompletion,
  weekDates,
  weekRangeOf,
  type LocalDate,
  type Target,
  type TargetChoice,
} from '@sadhana/domain'
import { and, asc, gte, inArray, lte } from 'drizzle-orm'
import type { Db } from '../db/client'
import { entries, targetChoices, type EntryRow } from '../db/schema'
import { activeAccounts } from './accounts'
import { toRecord } from './entries'
import { recommendedHistory, toChoice } from './targets'

const ZERO: Target = { rounds: 0, readingMinutes: 0, hearingMinutes: 0 }

const add = (a: Target, b: Target): Target => ({
  rounds: a.rounds + b.rounds,
  readingMinutes: a.readingMinutes + b.readingMinutes,
  hearingMinutes: a.hearingMinutes + b.hearingMinutes,
})

export async function entriesFor(db: Db, devoteeIds: string[], from: LocalDate, to: LocalDate): Promise<Map<string, EntryRow>> {
  if (devoteeIds.length === 0) return new Map()
  const rows = await db
    .select()
    .from(entries)
    .where(and(inArray(entries.devoteeId, devoteeIds), gte(entries.localDate, from), lte(entries.localDate, to)))
  return new Map(rows.map((row) => [`${row.devoteeId}|${row.localDate}`, row]))
}

/** The congregation's week; `withRows` adds one row per devotee (numbers only, never reflections). */
export async function congregationReport(db: Db, weekStart: LocalDate, withRows: boolean): Promise<Report> {
  const week = weekRangeOf(weekStart)
  const dates = weekDates(week.start)
  const members = await activeAccounts(db)
  const ids = members.map((member) => member.devoteeId)
  const records = await entriesFor(db, ids, week.start, week.end)
  const recommended = await recommendedHistory(db)
  const choices = new Map<string, TargetChoice[]>()
  if (ids.length > 0) {
    const rows = await db
      .select()
      .from(targetChoices)
      .where(inArray(targetChoices.devoteeId, ids))
      .orderBy(asc(targetChoices.effectiveDate), asc(targetChoices.id))
    for (const row of rows) choices.set(row.devoteeId, [...(choices.get(row.devoteeId) ?? []), toChoice(row)])
  }

  const weeks: MemberWeek[] = members.map((member) => {
    const days = dates.map((date) => records.get(`${member.devoteeId}|${date}`))
    const present = days.filter((row): row is EntryRow => row !== undefined).map(toRecord)
    const totals = sumTotals(present)
    const history = { recommended, personal: choices.get(member.devoteeId) ?? [] }
    const target = dates.reduce((sum, date) => add(sum, resolveTarget(history, date) ?? ZERO), ZERO)
    return {
      devoteeId: member.devoteeId,
      name: member.name,
      days: days.map((row) => dayStatus(row && toRecord(row))),
      totals,
      completion: targetCompletion(totals, target),
    }
  })

  const average = (key: keyof Target) =>
    weeks.length ? Math.round(weeks.reduce((sum, item) => sum + item.completion[key], 0) / weeks.length) : 0

  return {
    week,
    summary: {
      members: weeks.length,
      active: weeks.filter((item) => item.days.includes('RECORDED')).length,
      fullyRecorded: weeks.filter((item) => !item.days.includes('MISSING')).length,
      totals: weeks.reduce((sum, item) => add(sum, item.totals), ZERO),
      averageCompletion: {
        rounds: average('rounds'),
        readingMinutes: average('readingMinutes'),
        hearingMinutes: average('hearingMinutes'),
      },
    },
    ...(withRows && { members: weeks }),
  }
}
