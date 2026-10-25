import { hash, verify } from '@node-rs/argon2'
import { randomInt } from 'node:crypto'
import type { ArgonOptions } from '../config'

const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789'
const chunk = () => Array.from({ length: 4 }, () => ALPHABET.charAt(randomInt(ALPHABET.length))).join('')

export const temporaryPassword = (): string => `hari-${chunk()}-${chunk()}`

export const hashPassword = (password: string, argon: ArgonOptions): Promise<string> =>
  hash(password, { memoryCost: argon.memoryCost, timeCost: argon.timeCost, parallelism: 1 })

export const verifyPassword = (passwordHash: string, password: string): Promise<boolean> =>
  verify(passwordHash, password).catch(() => false)
