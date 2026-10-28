import type { EntryRecord } from '@sadhana/contract'
import { addDays, dailyTotals, dayStatus, sumTotals, type LocalDate, type Target } from '@sadhana/domain'
import ExcelJS from 'exceljs'
import type { Db } from '../db/client'
import { activeAccounts } from './accounts'
import { entriesFor } from './reports'

type Cell = string | number

export interface ExportTable {
  header: string[]
  rows: Cell[][]
}

const ZERO: Target = { rounds: 0, readingMinutes: 0, hearingMinutes: 0 }

/** Individual rows per devotee and day when `individual`, otherwise one row of totals per day. */
export async function exportTable(db: Db, from: LocalDate, to: LocalDate, individual: boolean): Promise<ExportTable> {
  const members = await activeAccounts(db)
  const records = await entriesFor(
    db,
    members.map((member) => member.devoteeId),
    from,
    to,
  )
  const record = (devoteeId: string, date: LocalDate): EntryRecord | undefined => records.get(`${devoteeId}|${date}`)
  const rows: Cell[][] = []

  if (individual) {
    for (const member of members) {
      for (let date = from; date <= to; date = addDays(date, 1)) {
        const row = record(member.devoteeId, date)
        const totals = row ? dailyTotals(row) : ZERO
        rows.push([member.devoteeId, member.name, date, dayStatus(row), totals.rounds, totals.readingMinutes, totals.hearingMinutes])
      }
    }
    return { header: ['devoteeId', 'name', 'date', 'status', 'rounds', 'readingMinutes', 'hearingMinutes'], rows }
  }

  for (let date = from; date <= to; date = addDays(date, 1)) {
    const present = members.map((member) => record(member.devoteeId, date)).filter((row): row is EntryRecord => row !== undefined)
    const totals = sumTotals(present)
    rows.push([date, members.length, present.length, totals.rounds, totals.readingMinutes, totals.hearingMinutes])
  }
  return { header: ['date', 'members', 'recorded', 'rounds', 'readingMinutes', 'hearingMinutes'], rows }
}

function csvCell(cell: Cell): string {
  if (typeof cell === 'number') return String(cell)
  // A leading quote stops spreadsheets from running a name such as =HYPERLINK(...) as a formula.
  const text = /^[=+\-@\t\r]/.test(cell) ? `'${cell}` : cell
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

export const toCsv = (table: ExportTable): string =>
  `${[table.header, ...table.rows].map((row) => row.map(csvCell).join(',')).join('\n')}\n`

export async function toXlsx(table: ExportTable): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Sadhana')
  sheet.addRow(table.header).font = { bold: true }
  for (const row of table.rows) sheet.addRow(row)
  return Buffer.from(await workbook.xlsx.writeBuffer())
}
