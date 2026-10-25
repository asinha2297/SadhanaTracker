import type { AccountRow } from './db/schema'

declare global {
  namespace Express {
    interface Request {
      account: AccountRow
      sessionId: string
    }
  }
}

export {}
