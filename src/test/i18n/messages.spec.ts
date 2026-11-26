import { describe, it, expect, vi } from 'vitest'
import { createI18n } from 'vue-i18n'
import en from '../../i18n/locales/en'
import es from '../../i18n/locales/es'

function keysOf(obj: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([key, value]) =>
    value && typeof value === 'object'
      ? keysOf(value as Record<string, unknown>, prefix + key + '.')
      : [prefix + key]
  )
}

// A message the compiler rejects (a bare @, an unclosed brace) only logs an error here, but
// in a production build it throws when first shown and leaves the whole page blank.
// Compile every one of them and accept no complaint.
describe('translation messages', () => {
  for (const [locale, messages] of Object.entries({ en, es })) {
    it('compiles every ' + locale + ' message', () => {
      const complaints = vi.spyOn(console, 'error').mockImplementation(() => {})
      const i18n = createI18n({ legacy: false, locale, messages: { [locale]: messages } })
      const broken = keysOf(messages).filter((key) => {
        complaints.mockClear()
        try {
          i18n.global.t(key)
        } catch {
          return true
        }
        return complaints.mock.calls.length > 0
      })
      complaints.mockRestore()
      expect(broken).toEqual([])
    })
  }

  it('has the same keys in both languages', () => {
    expect(keysOf(es).sort()).toEqual(keysOf(en).sort())
  })
})
