import type { DailyEntry, EffectiveTarget, LocalDate, Role, TargetChoice } from '@sadhana/domain'
import type { AuditEvent, PendingReset } from '@sadhana/contract'
import { BOOKS } from '@sadhana/contract'

export const PASSWORD = 'haribol'
export const TEMPORARY_PASSWORD = 'temp-1234'

export interface Account {
  devoteeId: string
  name: string
  role: Role
  active: boolean
  pending: boolean
  mustChangePassword: boolean
  password: string
  groupId: string | null
  joinedAt: LocalDate
  phone: string
  email?: string
  address?: string
}

export interface GroupDef {
  id: string
  name: string
  coordinatorId: string
  canReviewRecords: boolean
}

export const GROUPS: GroupDef[] = [
  { id: 'sharanagati', name: 'Sharanagati', coordinatorId: 'SH-0007', canReviewRecords: true },
  { id: 'east', name: 'Sharanagati East', coordinatorId: 'SH-0011', canReviewRecords: false },
]

/** Every demo account answers on +91 98450 0NNNN, NNNN being its devotee number. */
const phoneFor = (devoteeId: string) => `+91984500${devoteeId.slice(3)}`

const account = (
  devoteeId: string,
  name: string,
  role: Role,
  groupId: string | null,
  joinedAt: LocalDate,
  extra: Partial<Account> = {},
): Account => ({
  devoteeId,
  name,
  role,
  active: true,
  pending: false,
  mustChangePassword: false,
  password: PASSWORD,
  groupId,
  joinedAt,
  phone: phoneFor(devoteeId),
  ...extra,
})

export const ACCOUNTS: Account[] = [
  account('SH-0001', 'Nitāi Dāsa', 'ADMIN', null, '2024-01-15', { email: 'nitai@example.org' }),
  account('SH-0007', 'Govinda Dāsa', 'COORDINATOR', 'sharanagati', '2024-02-03'),
  account('SH-0011', 'Lalitā Devī Dāsī', 'COORDINATOR', 'east', '2024-02-03'),
  account('SH-0042', 'Rādhikā Devī Dāsī', 'DEVOTEE', 'sharanagati', '2025-03-20', {
    email: 'radhika@example.org',
    phone: '+919876543210',
    address: 'Sharanagati, Bengaluru',
  }),
  account('SH-0043', 'Yaśodā Devī Dāsī', 'DEVOTEE', 'sharanagati', '2025-04-02'),
  account('SH-0044', 'Nanda Kumāra Dāsa', 'DEVOTEE', 'sharanagati', '2025-05-11'),
  account('SH-0045', 'Vṛndā Devī Dāsī', 'DEVOTEE', 'sharanagati', '2025-06-30'),
  account('SH-0046', 'Gopīnātha Dāsa', 'DEVOTEE', 'sharanagati', '2025-08-14'),
  account('SH-0051', 'Balarāma Dāsa', 'DEVOTEE', 'east', '2025-03-20'),
  account('SH-0052', 'Tulasī Devī Dāsī', 'DEVOTEE', 'east', '2025-07-07'),
  account('SH-0053', 'Keśava Dāsa', 'DEVOTEE', 'east', '2025-09-01'),
  account('SH-0054', 'Subhadrā Devī Dāsī', 'DEVOTEE', 'east', '2025-10-10'),
  account('SH-0108', 'Mādhava Dāsa', 'DEVOTEE', 'sharanagati', '2026-10-20', {
    mustChangePassword: true,
    password: TEMPORARY_PASSWORD,
  }),
  account('SH-0099', 'Jagannātha Dāsa', 'DEVOTEE', 'east', '2024-11-11', { active: false }),
]

/** The mobile number a demo account signs in with. */
export function identifierOf(devoteeId: string): string {
  const found = ACCOUNTS.find((candidate) => candidate.devoteeId === devoteeId)
  if (!found) throw new Error(`No demo account ${devoteeId}`)
  return found.phone
}

export const RECOMMENDED: EffectiveTarget[] = [
  { effectiveDate: '2026-01-01', target: { rounds: 16, readingMinutes: 30, hearingMinutes: 30 } },
]

export const PERSONAL: Record<string, TargetChoice[]> = {
  'SH-0044': [{ effectiveDate: '2026-06-01', kind: 'PERSONAL', target: { rounds: 8, readingMinutes: 15, hearingMinutes: 15 } }],
}

export const RESET_REQUESTS: PendingReset[] = [
  { devoteeId: 'SH-0045', name: 'Vṛndā Devī Dāsī', requestedAt: '2026-10-23T14:20:00.000Z' },
]

export const AUDIT: AuditEvent[] = [
  {
    id: 'a5',
    at: '2026-10-20T04:12:00.000Z',
    actor: 'Nitāi Dāsa (SH-0001)',
    action: 'ACCOUNT_CREATED',
    subject: 'Mādhava Dāsa (SH-0108)',
    details: 'Devotee, Sharanagati',
  },
  {
    id: 'a4',
    at: '2026-10-18T13:40:00.000Z',
    actor: 'Nitāi Dāsa (SH-0001)',
    action: 'RECORD_REVIEW_GRANTED',
    subject: 'Sharanagati',
    details: 'Coordinator may review individual records',
  },
  {
    id: 'a3',
    at: '2026-10-11T05:05:00.000Z',
    actor: 'Nitāi Dāsa (SH-0001)',
    action: 'PASSWORD_RESET_ISSUED',
    subject: 'Tulasī Devī Dāsī (SH-0052)',
  },
  {
    id: 'a2',
    at: '2026-09-30T10:00:00.000Z',
    actor: 'Nitāi Dāsa (SH-0001)',
    action: 'ACCOUNT_DEACTIVATED',
    subject: 'Jagannātha Dāsa (SH-0099)',
  },
  {
    id: 'a1',
    at: '2026-01-01T03:30:00.000Z',
    actor: 'Nitāi Dāsa (SH-0001)',
    action: 'RECOMMENDED_TARGET_SET',
    details: '16 rounds · 30 min reading · 30 min hearing, effective 2026-01-01',
  },
]

const LECTURES = [
  'Bhagavad-gītā class',
  'Śrīmad-Bhāgavatam class',
  'Sunday feast lecture',
  'Japa workshop',
  'Caitanya-caritāmṛta reading',
] as const
const SPEAKERS = ['Śrīla Prabhupāda', 'Temple president', 'Visiting speaker', 'Govinda Dāsa'] as const
const SOURCES = ['Temple', 'Vanipedia', 'YouTube', 'Audio archive'] as const
const REFLECTIONS = [
  'Chanting felt focused today.',
  'Mind wandered during the first rounds; steadier later.',
  'Grateful for the morning program.',
  'Read with the family after dinner.',
  'Travelling, so chanted on the train.',
] as const

function hash32(input: string): number {
  let hash = 0x811c9dc5
  for (const char of input) {
    hash ^= char.codePointAt(0) ?? 0
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return hash
}

const roll = (devoteeId: string, localDate: LocalDate, salt: string) =>
  hash32(`${devoteeId}|${localDate}|${salt}`) / 0x1_0000_0000

const pick = <T>(list: readonly T[], fraction: number): T => list[Math.floor(fraction * list.length)] as T

export function generatedEntry(devoteeId: string, localDate: LocalDate): DailyEntry | undefined {
  const kind = roll(devoteeId, localDate, 'kind')
  if (kind < 0.12) return undefined
  if (kind < 0.18) {
    return { localDate, rounds: 0, reading: [], hearing: [], reflection: kind < 0.15 ? 'Unwell today.' : undefined }
  }
  const rounds = kind < 0.6 ? 16 : 4 + Math.floor(roll(devoteeId, localDate, 'rounds') * 12)
  const readingRoll = roll(devoteeId, localDate, 'reading')
  const hearingRoll = roll(devoteeId, localDate, 'hearing')
  const reflectionRoll = roll(devoteeId, localDate, 'reflection')
  return {
    localDate,
    rounds,
    reading:
      readingRoll < 0.75
        ? [
            {
              bookTitle: pick(BOOKS, readingRoll),
              chapterOrSection: readingRoll < 0.4 ? `Chapter ${1 + Math.floor(readingRoll * 30)}` : undefined,
              minutes: 10 + Math.floor(roll(devoteeId, localDate, 'reading-minutes') * 31),
            },
          ]
        : [],
    hearing:
      hearingRoll < 0.6
        ? [
            {
              lectureTitle: pick(LECTURES, hearingRoll),
              speaker: pick(SPEAKERS, hearingRoll),
              source: pick(SOURCES, hearingRoll),
              minutes: 15 + Math.floor(roll(devoteeId, localDate, 'hearing-minutes') * 46),
            },
          ]
        : [],
    reflection: reflectionRoll < 0.3 ? pick(REFLECTIONS, reflectionRoll) : undefined,
  }
}
