import { describe, expect, it } from 'vitest'
import { toCsv } from './export'

describe('toCsv', () => {
  it('defuses cells a spreadsheet would run as formulas, leaving numbers alone', () => {
    const csv = toCsv({
      header: ['name', 'rounds'],
      rows: [
        ['=HYPERLINK("http://evil","click")', 16],
        ['+1', -2],
        ['@SUM(A1)', 0],
        ['\tTab', 4],
        ['Rādhikā, Devī Dāsī', 8],
      ],
    })
    expect(csv.split('\n')).toEqual([
      'name,rounds',
      `"'=HYPERLINK(""http://evil"",""click"")",16`,
      "'+1,-2",
      "'@SUM(A1),0",
      "'\tTab,4",
      '"Rādhikā, Devī Dāsī",8',
      '',
    ])
  })
})
