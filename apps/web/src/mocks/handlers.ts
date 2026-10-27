import {
  addDays,
  dayStatus,
  EffectiveTargetSchema,
  hasCapability,
  isEditable,
  parseIdentifier,
  resolveTarget,
  sumTotals,
  TargetChoiceSchema,
  targetCompletion,
  weekDates,
  weekRangeOf,
  type Capability,
  type DailyEntry,
  type EffectiveTarget,
  type Identifier,
  type LocalDate,
  type Target,
  type TargetChoice,
  type TargetHistory,
} from '@sadhana/domain'
import { http, HttpResponse } from 'msw'
import {
  CONTACT_IN_USE,
  DevoteePatchSchema,
  NewDevoteeSchema,
  OtpRequestSchema,
  ProfileInputSchema,
  PutEntrySchema,
  RemindersSchema,
  VERIFICATION,
  type Account as AccountView,
  type AuditEvent,
  type EntryRecord,
  type MemberWeek,
  type PendingReset,
  type Profile,
  type Reminders,
  type Report,
} from '../api/contract'
import type { LoginInput } from '../auth/forms'
import type { SessionUser } from '../auth/session'
import { deviceTimeZone, todayLocalDate } from '../lib/clock'
import { ACCOUNTS, AUDIT, generatedEntry, PERSONAL, RECOMMENDED, RESET_REQUESTS, type Account } from '@sadhana/fixtures'

export { PASSWORD, TEMPORARY_PASSWORD } from '@sadhana/fixtures'

const must = <T>(value: T | undefined): T => {
  if (value === undefined) throw new Error('Missing mock fixture')
  return value
}

const sessionUser = (account: Account): SessionUser => ({
  devoteeId: account.devoteeId,
  name: account.name,
  role: account.role,
  mustChangePassword: account.mustChangePassword,
})

const fixture = (devoteeId: string) => sessionUser(must(ACCOUNTS.find((account) => account.devoteeId === devoteeId)))

export const devotee = fixture('SH-0042')
export const coordinator = fixture('SH-0007')
export const coordinatorWithoutReview = fixture('SH-0011')
export const admin = fixture('SH-0001')
export const newcomer = fixture('SH-0108')

const MAX_ATTEMPTS = 5
const ZERO: Target = { rounds: 0, readingMinutes: 0, hearingMinutes: 0 }

interface MockState {
  session: SessionUser | null
  failures: Map<string, number>
  accounts: Account[]
  entries: Map<string, EntryRecord>
  seen: Map<string, EntryRecord>
  recommended: EffectiveTarget[]
  personal: Map<string, TargetChoice[]>
  reminders: Map<string, Reminders>
  resetRequests: PendingReset[]
  audit: AuditEvent[]
  nextId: number
  /** Verification codes "texted" to numbers being claimed, keyed by E.164 number. */
  codes: Map<string, { code: string; attempts: number }>
  nextCode: number
  lastCode?: string
}

const PERSIST_SESSION = import.meta.env.MODE === 'development'
const SESSION_KEY = 'mock-session'

function initialSession(): SessionUser | null {
  if (!PERSIST_SESSION) return devotee
  const stored = sessionStorage.getItem(SESSION_KEY)
  return stored === null ? devotee : (JSON.parse(stored) as SessionUser | null)
}

function persistSession() {
  if (PERSIST_SESSION) sessionStorage.setItem(SESSION_KEY, JSON.stringify(state.session))
}

const freshState = (): MockState => ({
  session: initialSession(),
  failures: new Map(),
  accounts: ACCOUNTS.map((account) => ({ ...account })),
  entries: new Map(),
  seen: new Map(),
  recommended: [...RECOMMENDED],
  personal: new Map(Object.entries(PERSONAL).map(([id, choices]) => [id, [...choices]])),
  reminders: new Map([[devotee.devoteeId, { enabled: true, time: '21:00', timeZone: deviceTimeZone(), channel: 'IN_APP' }]]),
  resetRequests: [...RESET_REQUESTS],
  audit: [...AUDIT],
  nextId: 200,
  codes: new Map(),
  nextCode: 246810,
})

let state = freshState()

export function resetMocks() {
  state = freshState()
}

export function setMockSession(user: SessionUser | null) {
  state.session = user
  persistSession()
}

export function seedEntry(devoteeId: string, entry: DailyEntry, updatedAt = `${entry.localDate}T16:30:00.000Z`) {
  state.entries.set(`${devoteeId}|${entry.localDate}`, { ...entry, updatedAt })
}

/** The code the mock last "texted", for tests and for trying the flow against the mocks. */
export const lastVerificationCode = (): string | undefined => state.lastCode

export function savedEntry(devoteeId: string, localDate: LocalDate): EntryRecord | undefined {
  return state.entries.get(`${devoteeId}|${localDate}`)
}

export function savedReminders(devoteeId: string): Reminders | undefined {
  return state.reminders.get(devoteeId)
}

const status = (code: number) => new HttpResponse(null, { status: code })

const guard = (capability?: Capability): SessionUser | Response => {
  const user = state.session
  if (!user) return status(401)
  if (capability && !hasCapability(user.role, capability)) return status(403)
  return user
}

const accountOf = (devoteeId: string) => state.accounts.find((account) => account.devoteeId === devoteeId)
const accountByIdentifier = ({ kind, value }: Identifier) => state.accounts.find((account) => account[kind] === value)
const activeAccounts = () => state.accounts.filter((account) => account.active)

/** Administrators always see individual rows; a coordinator only once granted record review. */
const mayReview = (user: SessionUser) => user.role === 'ADMIN' || accountOf(user.devoteeId)?.canReviewRecords === true

/** Coordinators look after devotees; only administrators touch other coordinators and administrators. */
const inCare = (user: SessionUser, account: { role: Account['role'] }) => user.role === 'ADMIN' || account.role === 'DEVOTEE'

const contactIssues = (contact: { phone: string; email?: string }, exceptDevoteeId?: string) =>
  (['phone', 'email'] as const)
    .filter((field) =>
      state.accounts.some((account) => account.devoteeId !== exceptDevoteeId && contact[field] && account[field] === contact[field]),
    )
    .map((field) => ({ path: [field], message: CONTACT_IN_USE[field] }))

const conflict = (issues: { path: string[]; message: string }[]) => HttpResponse.json({ issues }, { status: 409 })

const refuseCode = (message: string) => HttpResponse.json({ issues: [{ path: ['code'], message }] }, { status: 400 })

/** Spends the code sent to `phone`; the message to show when it cannot be. */
function codeProblem(phone: string, code: string | undefined): string | undefined {
  if (!code) return VERIFICATION.required
  const pending = state.codes.get(phone)
  if (!pending) return VERIFICATION.wrong
  if (pending.attempts >= 5) return VERIFICATION.exhausted
  if (pending.code !== code) {
    pending.attempts += 1
    return VERIFICATION.wrong
  }
  state.codes.delete(phone)
  return undefined
}

function entryRecord(devoteeId: string, localDate: LocalDate): EntryRecord | undefined {
  const saved = state.entries.get(`${devoteeId}|${localDate}`)
  if (saved) return saved
  if (localDate >= todayLocalDate()) return undefined
  const generated = generatedEntry(devoteeId, localDate)
  return generated && { ...generated, updatedAt: `${localDate}T16:30:00.000Z` }
}

function entriesBetween(devoteeId: string, from: LocalDate, to: LocalDate): EntryRecord[] {
  const records: EntryRecord[] = []
  for (let date = from; date <= to; date = addDays(date, 1)) {
    const record = entryRecord(devoteeId, date)
    if (record) records.push(record)
  }
  return records
}

const targetHistory = (devoteeId: string): TargetHistory => ({
  recommended: state.recommended,
  personal: state.personal.get(devoteeId) ?? [],
})

const addTotals = (a: Target, b: Target): Target => ({
  rounds: a.rounds + b.rounds,
  readingMinutes: a.readingMinutes + b.readingMinutes,
  hearingMinutes: a.hearingMinutes + b.hearingMinutes,
})

const weekTarget = (history: TargetHistory, dates: LocalDate[]): Target =>
  dates.reduce((sum, date) => addTotals(sum, resolveTarget(history, date) ?? ZERO), ZERO)

const accountView = (account: Account): AccountView => ({
  devoteeId: account.devoteeId,
  name: account.name,
  role: account.role,
  active: account.active,
  joinedAt: account.joinedAt,
  phone: account.phone,
  email: account.email,
  canReviewRecords: account.canReviewRecords,
})

function memberWeek(account: Account, dates: LocalDate[]): MemberWeek {
  const records = dates.map((date) => entryRecord(account.devoteeId, date))
  const entries = records.filter((record): record is EntryRecord => record !== undefined)
  const totals = sumTotals(entries)
  return {
    devoteeId: account.devoteeId,
    name: account.name,
    days: records.map(dayStatus),
    totals,
    completion: targetCompletion(totals, weekTarget(targetHistory(account.devoteeId), dates)),
  }
}

function congregationReport(weekStart: LocalDate, withRows: boolean): Report {
  const dates = weekDates(weekStart)
  const weeks = activeAccounts().map((account) => memberWeek(account, dates))
  const average = (key: keyof Target) =>
    weeks.length ? Math.round(weeks.reduce((sum, week) => sum + week.completion[key], 0) / weeks.length) : 0
  return {
    week: weekRangeOf(weekStart),
    summary: {
      members: weeks.length,
      active: weeks.filter((week) => week.days.includes('RECORDED')).length,
      fullyRecorded: weeks.filter((week) => !week.days.includes('MISSING')).length,
      totals: weeks.reduce((sum, week) => addTotals(sum, week.totals), ZERO),
      averageCompletion: {
        rounds: average('rounds'),
        readingMinutes: average('readingMinutes'),
        hearingMinutes: average('hearingMinutes'),
      },
    },
    ...(withRows && { members: weeks }),
  }
}

const profileOf = (account: Account): Profile => ({
  devoteeId: account.devoteeId,
  name: account.name,
  phone: account.phone,
  email: account.email,
  address: account.address,
})

const remindersOf = (devoteeId: string): Reminders =>
  state.reminders.get(devoteeId) ?? { enabled: false, time: '21:00', timeZone: deviceTimeZone(), channel: 'IN_APP' }

function audit(user: SessionUser, action: string, subject?: string, details?: string) {
  state.audit.unshift({
    id: `a${state.nextId++}`,
    at: new Date().toISOString(),
    actor: `${user.name} (${user.devoteeId})`,
    action,
    subject,
    details,
  })
}

const label = (account: Account) => `${account.name} (${account.devoteeId})`

const csvLine = (cells: (string | number)[]) =>
  cells.map((cell) => (typeof cell === 'string' && /[",\n]/.test(cell) ? `"${cell.replaceAll('"', '""')}"` : cell)).join(',')

function exportCsv(from: LocalDate, to: LocalDate, individual: boolean): string {
  const lines: string[] = []
  const members = activeAccounts()
  if (individual) {
    lines.push(csvLine(['devoteeId', 'name', 'date', 'status', 'rounds', 'readingMinutes', 'hearingMinutes']))
    for (const account of members) {
      for (let date = from; date <= to; date = addDays(date, 1)) {
        const record = entryRecord(account.devoteeId, date)
        const totals = record ? sumTotals([record]) : ZERO
        lines.push(
          csvLine([account.devoteeId, account.name, date, dayStatus(record), totals.rounds, totals.readingMinutes, totals.hearingMinutes]),
        )
      }
    }
  } else {
    lines.push(csvLine(['date', 'members', 'recorded', 'rounds', 'readingMinutes', 'hearingMinutes']))
    for (let date = from; date <= to; date = addDays(date, 1)) {
      const records = members.map((account) => entryRecord(account.devoteeId, date))
      const totals = sumTotals(records.filter((record): record is EntryRecord => record !== undefined))
      lines.push(csvLine([date, members.length, records.filter(Boolean).length, totals.rounds, totals.readingMinutes, totals.hearingMinutes]))
    }
  }
  return `${lines.join('\n')}\n`
}

export const handlers = [
  http.get('/api/auth/session', () => (state.session ? HttpResponse.json({ user: state.session }) : status(401))),

  http.post('/api/auth/login', async ({ request }) => {
    const { identifier, password } = (await request.json()) as LoginInput
    const parsed = parseIdentifier(identifier)
    const key = parsed?.value ?? identifier
    if ((state.failures.get(key) ?? 0) >= MAX_ATTEMPTS) return status(429)
    const account = parsed && accountByIdentifier(parsed)
    if (!account || password !== account.password) {
      state.failures.set(key, (state.failures.get(key) ?? 0) + 1)
      return status(401)
    }
    if (!account.active) return HttpResponse.json({ reason: 'INACTIVE' }, { status: 403 })
    state.failures.delete(key)
    state.session = sessionUser(account)
    persistSession()
    return HttpResponse.json({ user: state.session })
  }),

  http.post('/api/auth/logout', () => {
    state.session = null
    persistSession()
    return status(204)
  }),

  http.post('/api/auth/logout-all', () => {
    state.session = null
    persistSession()
    return status(204)
  }),

  http.post('/api/auth/otp', async ({ request }) => {
    const user = guard()
    if (user instanceof Response) return user
    const parsed = OtpRequestSchema.safeParse(await request.json())
    if (!parsed.success) return status(400)
    const issues = contactIssues({ phone: parsed.data.phone })
    if (issues.length) return conflict(issues)
    const code = String(state.nextCode++)
    state.codes.set(parsed.data.phone, { code, attempts: 0 })
    state.lastCode = code
    if (PERSIST_SESSION) console.info(`[mock SMS] ${parsed.data.phone}: your code is ${code}`)
    return status(202)
  }),

  http.post('/api/auth/password', async ({ request }) => {
    if (!state.session) return status(401)
    const { currentPassword, newPassword } = (await request.json()) as { currentPassword: string; newPassword: string }
    const account = must(accountOf(state.session.devoteeId))
    if (currentPassword !== account.password) {
      return HttpResponse.json({ issues: [{ path: ['currentPassword'], message: "That isn't your current password." }] }, { status: 400 })
    }
    state.session = { ...state.session, mustChangePassword: false }
    account.mustChangePassword = false
    account.password = newPassword
    persistSession()
    return HttpResponse.json({ user: state.session })
  }),

  http.post('/api/auth/reset-request', async ({ request }) => {
    const { identifier } = (await request.json()) as { identifier: string }
    const parsed = parseIdentifier(identifier)
    const account = parsed && accountByIdentifier(parsed)
    if (account && !state.resetRequests.some((pending) => pending.devoteeId === account.devoteeId)) {
      state.resetRequests.push({ devoteeId: account.devoteeId, name: account.name, requestedAt: new Date().toISOString() })
    }
    return status(202)
  }),

  http.get('/api/me/entries', ({ request }) => {
    const user = guard()
    if (user instanceof Response) return user
    const url = new URL(request.url)
    const from = url.searchParams.get('from')
    const to = url.searchParams.get('to')
    if (!from || !to) return status(400)
    return HttpResponse.json({ entries: entriesBetween(user.devoteeId, from, to) })
  }),

  http.put('/api/me/entries/:localDate', async ({ request, params }) => {
    const user = guard()
    if (user instanceof Response) return user
    const key = request.headers.get('Idempotency-Key')
    const replay = key && state.seen.get(key)
    if (replay) return HttpResponse.json({ entry: replay })
    const parsed = PutEntrySchema.safeParse(await request.json())
    if (!parsed.success || parsed.data.localDate !== params['localDate']) return status(400)
    if (!isEditable(parsed.data.localDate, todayLocalDate())) return status(422)
    const current = entryRecord(user.devoteeId, parsed.data.localDate)
    if (current?.updatedAt !== parsed.data.baseUpdatedAt) return HttpResponse.json({ entry: current }, { status: 409 })
    const { clientUpdatedAt, baseUpdatedAt, ...entry } = parsed.data
    const record: EntryRecord = { ...entry, updatedAt: new Date().toISOString() }
    state.entries.set(`${user.devoteeId}|${record.localDate}`, record)
    if (key) state.seen.set(key, record)
    return HttpResponse.json({ entry: record })
  }),

  http.get('/api/me/targets', () => {
    const user = guard()
    if (user instanceof Response) return user
    return HttpResponse.json(targetHistory(user.devoteeId))
  }),

  http.post('/api/me/targets', async ({ request }) => {
    const user = guard()
    if (user instanceof Response) return user
    const parsed = TargetChoiceSchema.safeParse(await request.json())
    if (!parsed.success) return status(400)
    state.personal.set(user.devoteeId, [...(state.personal.get(user.devoteeId) ?? []), parsed.data])
    return HttpResponse.json(targetHistory(user.devoteeId), { status: 201 })
  }),

  http.get('/api/me/profile', () => {
    const user = guard()
    if (user instanceof Response) return user
    return HttpResponse.json({ profile: profileOf(must(accountOf(user.devoteeId))) })
  }),

  http.put('/api/me/profile', async ({ request }) => {
    const user = guard()
    if (user instanceof Response) return user
    const parsed = ProfileInputSchema.safeParse(await request.json())
    if (!parsed.success) return status(400)
    const issues = contactIssues(parsed.data, user.devoteeId)
    if (issues.length) return conflict(issues)
    const account = must(accountOf(user.devoteeId))
    const { code, ...contact } = parsed.data
    if (contact.phone !== account.phone) {
      const problem = codeProblem(contact.phone, code)
      if (problem) return refuseCode(problem)
    }
    Object.assign(account, contact)
    return HttpResponse.json({ profile: profileOf(account) })
  }),

  http.get('/api/me/reminders', () => {
    const user = guard()
    if (user instanceof Response) return user
    return HttpResponse.json({ reminders: remindersOf(user.devoteeId) })
  }),

  http.put('/api/me/reminders', async ({ request }) => {
    const user = guard()
    if (user instanceof Response) return user
    const parsed = RemindersSchema.safeParse(await request.json())
    if (!parsed.success) return status(400)
    state.reminders.set(user.devoteeId, parsed.data)
    return HttpResponse.json({ reminders: parsed.data })
  }),

  http.get('/api/report', ({ request }) => {
    const user = guard('VIEW_REPORTS')
    if (user instanceof Response) return user
    const week = new URL(request.url).searchParams.get('week') ?? weekRangeOf(todayLocalDate()).start
    return HttpResponse.json({ report: congregationReport(weekRangeOf(week).start, mayReview(user)) })
  }),

  http.get('/api/export', ({ request }) => {
    const user = guard('EXPORT_REPORTS')
    if (user instanceof Response) return user
    const url = new URL(request.url)
    const from = url.searchParams.get('from')
    const to = url.searchParams.get('to')
    if (!from || !to) return status(400)
    if (url.searchParams.get('format') === 'xlsx') return status(501)
    return new HttpResponse(exportCsv(from, to, mayReview(user)), {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="sadhana-${from}-${to}.csv"`,
      },
    })
  }),

  http.get('/api/devotees', () => {
    const user = guard('MANAGE_ACCOUNTS')
    if (user instanceof Response) return user
    return HttpResponse.json({ devotees: state.accounts.map(accountView) })
  }),

  http.get('/api/devotees/reset-requests', () => {
    const user = guard('MANAGE_ACCOUNTS')
    if (user instanceof Response) return user
    return HttpResponse.json({ requests: state.resetRequests.filter((pending) => inCare(user, must(accountOf(pending.devoteeId)))) })
  }),

  http.post('/api/devotees', async ({ request }) => {
    const user = guard('MANAGE_ACCOUNTS')
    if (user instanceof Response) return user
    const parsed = NewDevoteeSchema.safeParse(await request.json())
    if (!parsed.success) return status(400)
    if (!inCare(user, parsed.data)) return status(403)
    const issues = contactIssues(parsed.data)
    if (issues.length) return conflict(issues)
    const temporaryPassword = `hari-${state.nextId}`
    const account: Account = {
      devoteeId: `SH-${100000 + state.nextId++}`,
      name: parsed.data.name,
      role: parsed.data.role,
      active: true,
      mustChangePassword: true,
      password: temporaryPassword,
      joinedAt: todayLocalDate(),
      phone: parsed.data.phone,
      email: parsed.data.email,
      canReviewRecords: false,
    }
    state.accounts.push(account)
    audit(user, 'ACCOUNT_CREATED', label(account), parsed.data.role)
    return HttpResponse.json({ devotee: accountView(account), temporaryPassword }, { status: 201 })
  }),

  http.patch('/api/devotees/:id', async ({ request, params }) => {
    const user = guard('ADMINISTER')
    if (user instanceof Response) return user
    const account = accountOf(String(params['id']))
    const parsed = DevoteePatchSchema.safeParse(await request.json())
    if (!account || !parsed.success) return status(404)
    if (parsed.data.active !== undefined && parsed.data.active !== account.active) {
      audit(user, parsed.data.active ? 'ACCOUNT_REACTIVATED' : 'ACCOUNT_DEACTIVATED', label(account))
    }
    if (parsed.data.role && parsed.data.role !== account.role) audit(user, 'ROLE_CHANGED', label(account), parsed.data.role)
    if (parsed.data.name && parsed.data.name !== account.name) {
      audit(user, 'NAME_CHANGED', label({ ...account, name: parsed.data.name }), `was ${account.name}`)
    }
    if (parsed.data.canReviewRecords !== undefined && parsed.data.canReviewRecords !== account.canReviewRecords) {
      audit(user, parsed.data.canReviewRecords ? 'RECORD_REVIEW_GRANTED' : 'RECORD_REVIEW_REVOKED', label(account))
    }
    Object.assign(account, parsed.data)
    return HttpResponse.json({ devotee: accountView(account) })
  }),

  http.post('/api/devotees/:id/reset-password', ({ params }) => {
    const user = guard('MANAGE_ACCOUNTS')
    if (user instanceof Response) return user
    const account = accountOf(String(params['id']))
    if (!account) return status(404)
    if (!inCare(user, account)) return status(403)
    const temporaryPassword = `hari-${state.nextId++}`
    account.mustChangePassword = true
    account.password = temporaryPassword
    state.resetRequests = state.resetRequests.filter((pending) => pending.devoteeId !== account.devoteeId)
    audit(user, 'PASSWORD_RESET_ISSUED', label(account))
    return HttpResponse.json({ temporaryPassword })
  }),

  http.post('/api/admin/targets', async ({ request }) => {
    const user = guard('ADMINISTER')
    if (user instanceof Response) return user
    const parsed = EffectiveTargetSchema.safeParse(await request.json())
    if (!parsed.success) return status(400)
    state.recommended.push(parsed.data)
    const { rounds, readingMinutes, hearingMinutes } = parsed.data.target
    audit(
      user,
      'RECOMMENDED_TARGET_SET',
      undefined,
      `${rounds} rounds · ${readingMinutes} min reading · ${hearingMinutes} min hearing, effective ${parsed.data.effectiveDate}`,
    )
    return HttpResponse.json({ recommended: state.recommended }, { status: 201 })
  }),

  http.get('/api/admin/audit', () => {
    const user = guard('ADMINISTER')
    if (user instanceof Response) return user
    return HttpResponse.json({ events: state.audit })
  }),
]
