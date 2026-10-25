import { PGlite } from '@electric-sql/pglite'
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres'
import { migrate as migratePg } from 'drizzle-orm/node-postgres/migrator'
import { drizzle as drizzlePglite, type PgliteDatabase } from 'drizzle-orm/pglite'
import { migrate as migratePglite } from 'drizzle-orm/pglite/migrator'
import { mkdirSync } from 'node:fs'
import { Pool } from 'pg'
import * as schema from './schema'

export type Db = PgliteDatabase<typeof schema>

export interface Database {
  db: Db
  close: () => Promise<void>
}

export interface ConnectOptions {
  databaseUrl?: string | undefined
  pgliteDir?: string | undefined
  migrationsFolder: string
}

export async function connect(options: ConnectOptions): Promise<Database> {
  if (options.databaseUrl) {
    const pool = new Pool({ connectionString: options.databaseUrl })
    const db = drizzlePg(pool, { schema })
    await migratePg(db, { migrationsFolder: options.migrationsFolder })
    return { db: db as unknown as Db, close: () => pool.end() }
  }
  if (options.pgliteDir) mkdirSync(options.pgliteDir, { recursive: true })
  const client = options.pgliteDir ? new PGlite(options.pgliteDir) : new PGlite()
  const db = drizzlePglite(client, { schema })
  await migratePglite(db, { migrationsFolder: options.migrationsFolder })
  return { db, close: () => client.close() }
}
