import { jwtVerify, SignJWT } from 'jose'

export const SESSION_TTL_SECONDS = 14 * 24 * 60 * 60

/** The cookie carries only a signed session id; the session itself lives in the database. */
export const issueToken = (sessionId: string, secret: Uint8Array): Promise<string> =>
  new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setJti(sessionId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(secret)

export async function readToken(token: string, secret: Uint8Array): Promise<string | undefined> {
  try {
    const { payload } = await jwtVerify(token, secret, { algorithms: ['HS256'] })
    return payload.jti
  } catch {
    return undefined
  }
}
