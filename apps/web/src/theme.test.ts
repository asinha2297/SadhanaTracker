import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

// Read from disk: under jsdom a CSS import comes back empty, and import.meta.url is not a file URL.
const css = readFileSync(resolve(__dirname, 'index.css'), 'utf8')
const root = css.match(/:root\s*{([^}]*)}/)?.[1] ?? ''
const token = (name: string) => root.match(new RegExp(`--${name}:\\s*(#[0-9a-f]{6})`, 'i'))?.[1]?.toLowerCase() ?? ''

/** WCAG 2 relative luminance and contrast ratio, for six-digit hex colours. */
const luminance = (hex: string) =>
  [0.2126, 0.7152, 0.0722].reduce((sum, weight, index) => {
    const channel = parseInt(hex.slice(1 + index * 2, 3 + index * 2), 16) / 255
    return sum + weight * (channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4)
  }, 0)
const contrast = (a: string, b: string) =>
  (Math.max(luminance(a), luminance(b)) + 0.05) / (Math.min(luminance(a), luminance(b)) + 0.05)

describe('Sandalwood & Marigold palette', () => {
  it('is light only, whatever the device prefers', () => {
    expect(root).toMatch(/color-scheme:\s*light;/)
    expect(css).not.toContain('prefers-color-scheme: dark')
    expect(token('canvas')).toBe('#f5f2eb')
    expect(token('card')).toBe('#ffffff')
  })

  it.each(['ink', 'ink-muted', 'saffron-text', 'peacock', 'tulasi'])('keeps %s legible on both surfaces (AA, 4.5:1)', (name) => {
    expect(contrast(token(name), token('canvas'))).toBeGreaterThanOrEqual(4.5)
    expect(contrast(token(name), token('card'))).toBeGreaterThanOrEqual(4.5)
  })

  it('keeps marigold fills visible as controls and under white labels (3:1)', () => {
    expect(contrast(token('saffron'), token('canvas'))).toBeGreaterThanOrEqual(3)
    expect(contrast('#ffffff', token('saffron'))).toBeGreaterThanOrEqual(3)
  })
})
