import '@testing-library/jest-dom/vitest'
import 'fake-indexeddb/auto'
import { cleanup } from '@testing-library/react'
import { IDBFactory } from 'fake-indexeddb'
import { afterAll, afterEach, beforeAll, vi } from 'vitest'
import { resetMocks } from '../mocks/handlers'
import { server } from '../mocks/server'

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) =>
    ({ matches: query.includes('prefers-reduced-motion'), media: query, addEventListener() {}, removeEventListener() {} }) as unknown as MediaQueryList,
})

class IntersectionObserverStub {
  constructor(private readonly callback: IntersectionObserverCallback) {}
  observe(target: Element) {
    this.callback([{ isIntersecting: true, target, intersectionRatio: 1 } as IntersectionObserverEntry], this as unknown as IntersectionObserver)
  }
  unobserve() {}
  disconnect() {}
  takeRecords(): IntersectionObserverEntry[] {
    return []
  }
}
globalThis.IntersectionObserver = IntersectionObserverStub as unknown as typeof IntersectionObserver

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  server.resetHandlers()
  resetMocks()
  cleanup()
  vi.restoreAllMocks()
  globalThis.indexedDB = new IDBFactory()
})
afterAll(() => server.close())
