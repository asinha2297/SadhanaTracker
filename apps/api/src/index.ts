import { createApp } from './app'
import { loadConfig } from './config'
import { bootstrapAdmin } from './db/bootstrap'
import { connect } from './db/client'
import { loadDotEnv } from './env'
import { createLogger } from './logger'
import { smsSender } from './services/sms'

loadDotEnv()
const config = loadConfig()
const logger = createLogger(config.logLevel, config.nodeEnv === 'development')
const database = await connect(config)
await bootstrapAdmin(database.db, config, logger)

const server = createApp({ db: database.db, config, logger, sms: smsSender(config.sms, logger) }).listen(config.port, () => {
  logger.info(
    { port: config.port, database: config.databaseUrl ? 'postgres' : `pglite:${config.pgliteDir}` },
    'Sadhana API listening',
  )
})

const shutdown = (signal: string) => {
  logger.info({ signal }, 'Shutting down')
  server.close(() => {
    void database.close().then(() => process.exit(0))
  })
}
process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
