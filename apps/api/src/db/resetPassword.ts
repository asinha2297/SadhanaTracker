import { parseIdentifier } from '@sadhana/domain'
import { loadConfig } from '../config'
import { loadDotEnv } from '../env'
import { issueTemporaryPassword } from '../services/accounts'
import { connect } from './client'
import { findAccountByIdentifier } from './queries'

// Break-glass reset from the server, for when nobody who could issue a one-time password can sign in
// (the only administrator, say). Usage: npm run reset-password -w apps/api -- <mobile number or email>
const identifier = parseIdentifier(process.argv.slice(2).join(' '))
if (!identifier) {
  console.error('Usage: npm run reset-password -w apps/api -- <mobile number or email>')
  process.exit(1)
}

loadDotEnv()
const config = loadConfig()
const database = await connect(config)
try {
  const account = await findAccountByIdentifier(database.db, identifier)
  if (!account) {
    console.error(`No account signs in with ${identifier.value}.`)
    process.exitCode = 1
  } else {
    const password = await issueTemporaryPassword(database.db, account.devoteeId, config.argon)
    console.log(
      `${account.name} (${account.devoteeId}) now signs in with ${account.phone} and the one-time password ${password}, and must then choose a new one. Every session of the account has been ended.`,
    )
  }
} finally {
  await database.close()
}
