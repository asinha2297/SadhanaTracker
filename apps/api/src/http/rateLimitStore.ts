import { eq, lt, sql } from 'drizzle-orm'
import type { ClientRateLimitInfo, Options, Store } from 'express-rate-limit'
import type { Db } from '../db/client'
import { rateLimits } from '../db/schema'

/** Counts hits in the shared database, so every API instance enforces the same limits. */
export class DbRateLimitStore implements Store {
  localKeys = false
  private windowMs = 60_000

  constructor(
    private readonly db: Db,
    readonly prefix: string,
  ) {}

  init(options: Options): void {
    this.windowMs = options.windowMs
  }

  async increment(key: string): Promise<ClientRateLimitInfo> {
    const now = new Date().toISOString()
    const resetAt = new Date(Date.now() + this.windowMs)
    const [row] = await this.db
      .insert(rateLimits)
      .values({ key: this.scoped(key), hits: 1, resetAt })
      .onConflictDoUpdate({
        target: rateLimits.key,
        set: {
          hits: sql`case when ${rateLimits.resetAt} <= ${now}::timestamptz then 1 else ${rateLimits.hits} + 1 end`,
          resetAt: sql`case when ${rateLimits.resetAt} <= ${now}::timestamptz then ${resetAt.toISOString()}::timestamptz else ${rateLimits.resetAt} end`,
        },
      })
      .returning()
    if (!row) throw new Error('Rate limit was not recorded')
    if (Math.random() < 0.01) await this.db.delete(rateLimits).where(lt(rateLimits.resetAt, new Date()))
    return { totalHits: row.hits, resetTime: row.resetAt }
  }

  async decrement(key: string): Promise<void> {
    await this.db
      .update(rateLimits)
      .set({ hits: sql`greatest(${rateLimits.hits} - 1, 0)` })
      .where(eq(rateLimits.key, this.scoped(key)))
  }

  async resetKey(key: string): Promise<void> {
    await this.db.delete(rateLimits).where(eq(rateLimits.key, this.scoped(key)))
  }

  private scoped(key: string): string {
    return `${this.prefix}:${key}`
  }
}
