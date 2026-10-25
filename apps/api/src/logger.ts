import pino, { type Logger } from 'pino'

export type { Logger }

export const createLogger = (level: string, pretty = false): Logger =>
  pino({ level, ...(pretty && { transport: { target: 'pino-pretty' } }) })
