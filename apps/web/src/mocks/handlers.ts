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
  OtpRequestSchema,
  VERIFICATION,
  NewDevoteeSchema,
  NewGroupSchema,
  ProfileInputSchema,
  PutEntrySchema,
  RemindersSchema,
  SignupInputSchema,
  type AuditEvent,
  type EntryRecord,
  type Group,
  type GroupReport,
  type Member,
  type MemberWeek,
  type PendingReset,
  type Profile,
  type Reminders,
} from '../api/contract'
import type { LoginInput } from '../auth/forms'
import type { SessionUser } from '../auth/session'
import { deviceTimeZone, todayLocalDate } from '../lib/clock'
import {
  ACCOUNTS,
  AUDIT,
  generatedEntry,
  GROUPS,
  PASSWORD,
  PERSONAL,
  RECOMMENDED,
  RESET_REQUESTS,
  type Account,
  type GroupDef,
} from '@sadhana/fixtures'

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
export const admin = fixture('SH-0001')
export const newcomer = fixture('SH-0108')

const MAX_ATTEMPTS = 5
const ZERO: Target = { rounds: 0, readingMinutes: 0, hearingMinutes: 0 }

interface MockState {
  session: SessionUser | null
  failures: Map<string, number>
  accounts: Account[]
  groups: GroupDef[]
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
  groups: GROUPS.map((group) => ({ ...group })),
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

export function seedPendingAccount(seed: Pick<Account, 'devoteeId' | 'name' | 'groupId' | 'phone'>) {
  state.accounts.push({
    ...seed,
    role: 'DEVOTEE',
    active: false,
    pending: true,
    mustChangePassword: false,
    password: PASSWORD,
    joinedAt: todayLocalDate(),
  })
}

/** The code the mock last "texted", for tests and for trying the sign-up flow against the mocks. */
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
const groupById = (groupId: string) => state.groups.find((group) => group.id === groupId)

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
const groupMembers = (groupId: string) => state.accounts.filter((account) => account.groupId === groupId)
const activeMembers = (groupId: string) => groupMembers(groupId).filter((account) => account.active && !account.pending)

const visibleGroups = (user: SessionUser) =>
  state.groups.filter((group) => user.role === 'ADMIN' || group.coordinatorId === user.devoteeId)
const canManage = (user: SessionUser, groupId: string) => visibleGroups(user).some((group) => group.id === groupId)

const mayPlace = (user: SessionUser, account: Account) =>
  user.role === 'ADMIN' || (account.role === 'DEVOTEE' && (account.groupId === null || canManage(user, account.groupId)))

const groupSummary = (group: GroupDef): Group => ({
  id: group.id,
  name: group.name,
  memberCount: activeMembers(group.id).length,
  canReviewRecords: group.canReviewRecords,
})

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

const member = (account: Account): Member => ({
  devoteeId: account.devoteeId,
  name: account.name,
  role: account.role,
  active: account.active,
  pending: account.pending,
  joinedAt: account.joinedAt,
  phone: account.phone,
  email: account.email,
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

function groupReport(group: GroupDef, weekStart: LocalDate): GroupReport {
  const dates = weekDates(weekStart)
  const weeks = activeMembers(group.id).map((account) => memberWeek(account, dates))
  const average = (key: keyof Target) =>
    weeks.length ? Math.round(weeks.reduce((sum, week) => sum + week.completion[key], 0) / weeks.length) : 0
  return {
    group: { id: group.id, name: group.name },
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
    ...(group.canReviewRecords && { members: weeks }),
  }
}

const profileOf = (account: Account): Profile => ({
  devoteeId: account.devoteeId,
  name: account.name,
  phone: account.phone,
  email: account.email,
  address: account.address,
  group: account.groupId ? { id: account.groupId, name: must(groupById(account.groupId)).name } : null,
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

const slug = (name: string) =>
  name
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'group'

const csvLine = (cells: (string | number)[]) =>
  cells.map((cell) => (typeof cell === 'string' && /[",\n]/.test(cell) ? `"${cell.replaceAll('"', '""')}"` : cell)).join(',')

function exportCsv(group: GroupDef, from: LocalDate, to: LocalDate): string {
  const lines: string[] = []
  const members = activeMembers(group.id)
  if (group.canReviewRecords) {
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

const refusal = (reason: 'PENDING' | 'INACTIVE') => HttpResponse.json({ reason }, { status: 403 })

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
    if (account.pending) return refusal('PENDING')
    if (!account.active) return refusal('INACTIVE')
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

  http.post('/api/auth/signup', async ({ request }) => {
    const parsed = SignupInputSchema.safeParse(await request.json())
    if (!parsed.success || !groupById(parsed.data.groupId)) return status(400)
    const issues = contactIssues(parsed.data)
    if (issues.length) return conflict(issues)
    const problem = codeProblem(parsed.data.phone, parsed.data.code)
    if (problem) return refuseCode(problem)
    const account: Account = {
      devoteeId: `SH-${100000 + state.nextId++}`,
      name: parsed.data.name,
      role: 'DEVOTEE',
      active: false,
      pending: true,
      mustChangePassword: false,
      password: parsed.data.password,
      groupId: parsed.data.groupId,
      joinedAt: todayLocalDate(),
      phone: parsed.data.phone,
      email: parsed.data.email,
    }
    state.accounts.push(account)
    return HttpResponse.json({ devoteeId: account.devoteeId }, { status: 201 })
  }),

  http.get('/api/groups/public', () =>
    HttpResponse.json({ groups: state.groups.map(({ id, name }) => ({ id, name })) }),
  ),

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

  http.get('/api/groups', () => {
    const user = guard('VIEW_GROUP_REPORTS')
    if (user instanceof Response) return user
    return HttpResponse.json({ groups: visibleGroups(user).map(groupSummary) })
  }),

  http.post('/api/groups', async ({ request }) => {
    const user = guard('MANAGE_ROSTER')
    if (user instanceof Response) return user
    const parsed = NewGroupSchema.safeParse(await request.json())
    if (!parsed.success) return status(400)
    const base = slug(parsed.data.name)
    let id = base
    for (let suffix = 2; groupById(id); suffix += 1) id = `${base}-${suffix}`
    const group: GroupDef = { id, name: parsed.data.name, coordinatorId: user.devoteeId, canReviewRecords: false }
    state.groups.push(group)
    audit(user, 'GROUP_CREATED', group.name)
    return HttpResponse.json({ group: groupSummary(group) }, { status: 201 })
  }),

  http.get('/api/devotees', () => {
    const user = guard('MANAGE_ROSTER')
    if (user instanceof Response) return user
    return HttpResponse.json({
      devotees: state.accounts
        .filter((account) => account.active && !account.pending && mayPlace(user, account))
        .map(({ devoteeId, name, groupId }) => ({ devoteeId, name, groupId })),
    })
  }),

  http.get('/api/groups/:id/report', ({ request, params }) => {
    const user = guard('VIEW_GROUP_REPORTS')
    if (user instanceof Response) return user
    const group = groupById(String(params['id']))
    if (!group || !canManage(user, group.id)) return status(403)
    const week = new URL(request.url).searchParams.get('week') ?? weekRangeOf(todayLocalDate()).start
    return HttpResponse.json({ report: groupReport(group, weekRangeOf(week).start) })
  }),

  http.get('/api/groups/:id/members', ({ params }) => {
    const user = guard('MANAGE_ROSTER')
    if (user instanceof Response) return user
    const groupId = String(params['id'])
    if (!canManage(user, groupId)) return status(403)
    return HttpResponse.json({ members: groupMembers(groupId).map(member) })
  }),

  http.put('/api/groups/:id/members/:devoteeId', ({ params }) => {
    const user = guard('MANAGE_ROSTER')
    if (user instanceof Response) return user
    const group = groupById(String(params['id']))
    if (!group || !canManage(user, group.id)) return status(403)
    const account = accountOf(String(params['devoteeId']))
    if (!account) return status(404)
    if (!mayPlace(user, account)) return status(403)
    account.groupId = group.id
    audit(user, 'GROUP_CHANGED', label(account), group.name)
    return status(204)
  }),

  http.delete('/api/groups/:id/members/:devoteeId', ({ params }) => {
    const user = guard('MANAGE_ROSTER')
    if (user instanceof Response) return user
    const groupId = String(params['id'])
    if (!canManage(user, groupId)) return status(403)
    const account = accountOf(String(params['devoteeId']))
    if (!account || account.groupId !== groupId) return status(404)
    if (account.pending) {
      state.accounts.splice(state.accounts.indexOf(account), 1)
      audit(user, 'JOIN_REQUEST_DECLINED', label(account))
    } else {
      account.groupId = null
      audit(user, 'GROUP_CHANGED', label(account), 'No group')
    }
    return status(204)
  }),

  http.post('/api/groups/:id/members/:devoteeId/approve', ({ params }) => {
    const user = guard('MANAGE_ROSTER')
    if (user instanceof Response) return user
    const groupId = String(params['id'])
    if (!canManage(user, groupId)) return status(403)
    const account = accountOf(String(params['devoteeId']))
    if (!account || account.groupId !== groupId || !account.pending) return status(404)
    account.pending = false
    account.active = true
    audit(user, 'ACCOUNT_APPROVED', label(account), must(groupById(groupId)).name)
    return status(204)
  }),

  http.get('/api/groups/:id/export', ({ request, params }) => {
    const user = guard('EXPORT_REPORTS')
    if (user instanceof Response) return user
    const group = groupById(String(params['id']))
    if (!group || !canManage(user, group.id)) return status(403)
    const url = new URL(request.url)
    const from = url.searchParams.get('from')
    const to = url.searchParams.get('to')
    if (!from || !to) return status(400)
    if (url.searchParams.get('format') === 'xlsx') return status(501)
    return new HttpResponse(exportCsv(group, from, to), {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="sadhana-${group.id}-${from}-${to}.csv"`,
      },
    })
  }),

  http.get('/api/admin/reset-requests', () => {
    const user = guard('ADMINISTER')
    if (user instanceof Response) return user
    return HttpResponse.json({ requests: state.resetRequests })
  }),

  http.post('/api/admin/devotees', async ({ request }) => {
    const user = guard('ADMINISTER')
    if (user instanceof Response) return user
    const parsed = NewDevoteeSchema.safeParse(await request.json())
    if (!parsed.success) return status(400)
    const issues = contactIssues(parsed.data)
    if (issues.length) return conflict(issues)
    const temporaryPassword = `hari-${state.nextId}`
    const account: Account = {
      devoteeId: `SH-${100000 + state.nextId++}`,
      name: parsed.data.name,
      role: parsed.data.role,
      active: true,
      pending: false,
      mustChangePassword: true,
      password: temporaryPassword,
      groupId: parsed.data.groupId,
      joinedAt: todayLocalDate(),
      phone: parsed.data.phone,
      email: parsed.data.email,
    }
    state.accounts.push(account)
    audit(
      user,
      'ACCOUNT_CREATED',
      label(account),
      `${parsed.data.role}${account.groupId ? `, ${must(groupById(account.groupId)).name}` : ''}`,
    )
    return HttpResponse.json({ devotee: member(account), temporaryPassword }, { status: 201 })
  }),

  http.patch('/api/admin/devotees/:id', async ({ request, params }) => {
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
    if (parsed.data.groupId !== undefined && parsed.data.groupId !== account.groupId) {
      audit(user, 'GROUP_CHANGED', label(account), parsed.data.groupId ?? 'No group')
    }
    Object.assign(account, parsed.data)
    return HttpResponse.json({ devotee: member(account) })
  }),

  http.post('/api/admin/devotees/:id/reset-password', ({ params }) => {
    const user = guard('ADMINISTER')
    if (user instanceof Response) return user
    const account = accountOf(String(params['id']))
    if (!account) return status(404)
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
