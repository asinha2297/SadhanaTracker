import { existsSync } from 'node:fs'

/** Loads `.env` from the working directory (apps/api) when present; variables already in the environment win. */
export function loadDotEnv(path = '.env'): void {
  if (existsSync(path)) process.loadEnvFile(path)
}
