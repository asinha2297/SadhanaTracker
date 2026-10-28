import { PASSWORD } from '@sadhana/fixtures'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { signedIn, testContext, type TestContext } from '../test/app'
import { issueTemporaryPassword } from './accounts'

let ctx: TestContext
beforeAll(async () => {
  ctx = await testContext()
})
afterAll(() => ctx.close())

describe('issueTemporaryPassword', () => {
  it('replaces the password with a one-time one and ends every session, with no administrator involved', async () => {
    const agent = await signedIn(ctx, 'SH-0001')
    const password = await issueTemporaryPassword(ctx.db, 'SH-0001', ctx.config.argon)
    expect(password).toMatch(/^hari-/)
    await agent.get('/api/auth/session').expect(401)
    const login = (candidate: string) =>
      request(ctx.app).post('/api/auth/login').send({ identifier: '98450 00001', password: candidate })
    await login(PASSWORD).expect(401)
    const next = await login(password).expect(200)
    expect(next.body.user.mustChangePassword).toBe(true)
  })
})
