import { describe, expect, it } from 'vitest'
import { bn } from './bn'
import { en, type Dictionary } from './en'
import { hi } from './hi'

const keysOf = (value: unknown, prefix = ''): string[] =>
  value !== null && typeof value === 'object'
    ? Object.entries(value).flatMap(([key, child]) => keysOf(child, `${prefix}${key}.`))
    : [prefix.slice(0, -1)]

const leaves = (value: unknown): unknown[] =>
  value !== null && typeof value === 'object' ? Object.values(value).flatMap(leaves) : [value]

describe('dictionaries', () => {
  it.each([
    ['hi', hi],
    ['bn', bn],
  ])('%s carries every key of English and nothing else', (_name, dictionary: Dictionary) => {
    expect(keysOf(dictionary)).toEqual(keysOf(en))
  })

  it.each([
    ['hi', hi, /[ऀ-ॿ]/],
    ['bn', bn, /[ঀ-৿]/],
  ])('%s is actually translated, not English under another name', (_name, dictionary: Dictionary, script: RegExp) => {
    const texts = leaves(dictionary).filter((leaf): leaf is string => typeof leaf === 'string')
    const translated = texts.filter((text) => script.test(text)).length
    expect(translated / texts.length).toBeGreaterThan(0.9)
  })

  it('keeps the verified landing strings verbatim', () => {
    expect(hi.landing.heading2).toBe('भक्ति के साथ।')
    expect(hi.landing.openToday).toBe('आज की साधना खोलें')
    expect(hi.landing.heroSloka.source).toBe('भगवद् गीता 18.66')
    expect(bn.landing.heading2).toBe('ভক্তির সাথে।')
    expect(bn.landing.openToday).toBe('আজকের সাধনা খুলুন')
    expect(bn.landing.heroSloka.source).toBe('ভগবদ্গীতা ১৮.৬৬')
  })

  it('keeps the placeholders the code fills in', () => {
    for (const dictionary of [hi, bn]) {
      expect(dictionary.landing.verseBullet).toContain('{{index}}')
      expect(dictionary.landing.slideLabel).toContain('{{slidesLength}}')
      expect(dictionary.credits.designText).toContain('{skiper}')
      expect(dictionary.masterAdmin.share).toContain('{name}')
      expect(dictionary.admin.todayRecommends).toContain('{totals}')
      expect(dictionary.help.you).toMatch(/\*\*.+\*\*/)
      expect(dictionary.landing.slokas).toHaveLength(en.landing.slokas.length)
      expect(dictionary.verses).toHaveLength(en.verses.length)
    }
  })
})
