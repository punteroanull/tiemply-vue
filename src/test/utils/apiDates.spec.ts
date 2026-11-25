import { describe, it, expect } from 'vitest'
import {
  apiDateToYmd,
  parseApiDate,
  businessToday,
  formatClockTime,
  formatMinutesAsClock,
  formatHoursAsDuration,
} from '@/utils/apiDates'
import { unwrap, unwrapList, unwrapPageMeta, apiErrorMessage, apiErrorMessages } from '@/utils/apiResponse'

describe('apiDates', () => {
  describe('apiDateToYmd', () => {
    it('keeps a plain date as is', () => {
      expect(apiDateToYmd('2026-11-23')).toBe('2026-11-23')
    })

    it('reads a Laravel date cast as the day the server meant (winter, UTC+1)', () => {
      // 23 Nov 00:00 in Madrid, serialised in UTC.
      expect(apiDateToYmd('2026-11-22T23:00:00.000000Z')).toBe('2026-11-23')
    })

    it('reads a Laravel date cast as the day the server meant (summer, UTC+2)', () => {
      expect(apiDateToYmd('2026-07-14T22:00:00.000000Z')).toBe('2026-07-15')
    })

    it('takes the date part of a zoneless datetime', () => {
      expect(apiDateToYmd('2026-11-23 00:00:00')).toBe('2026-11-23')
    })

    it('returns null for empty or invalid input', () => {
      expect(apiDateToYmd(null)).toBeNull()
      expect(apiDateToYmd(undefined)).toBeNull()
      expect(apiDateToYmd('')).toBeNull()
      expect(apiDateToYmd('not a date')).toBeNull()
    })
  })

  describe('parseApiDate', () => {
    it('returns local midnight of the intended calendar day', () => {
      const date = parseApiDate('2026-11-22T23:00:00.000000Z')!
      expect(date.getFullYear()).toBe(2026)
      expect(date.getMonth()).toBe(10)
      expect(date.getDate()).toBe(23)
      expect(date.getHours()).toBe(0)
    })

    it('returns null when there is no date', () => {
      expect(parseApiDate(null)).toBeNull()
    })
  })

  describe('businessToday', () => {
    it('uses the server timezone, not UTC', () => {
      // 23:30 UTC on the 22nd is already the 23rd in Madrid.
      expect(businessToday(new Date('2026-11-22T23:30:00Z'))).toBe('2026-11-23')
    })
  })

  describe('formatClockTime', () => {
    it('trims seconds from a time string', () => {
      expect(formatClockTime('09:05:00')).toBe('09:05')
      expect(formatClockTime('17:30')).toBe('17:30')
    })

    it('returns an empty string for empty or invalid input', () => {
      expect(formatClockTime(null)).toBe('')
      expect(formatClockTime('nope')).toBe('')
    })
  })

  describe('formatMinutesAsClock', () => {
    it('pads minutes', () => {
      expect(formatMinutesAsClock(485)).toBe('8:05')
      expect(formatMinutesAsClock(0)).toBe('0:00')
    })

    it('rounds fractional minutes instead of printing them', () => {
      expect(formatMinutesAsClock(485.383333)).toBe('8:05')
      expect(formatMinutesAsClock(59.6)).toBe('1:00')
    })

    it('keeps the sign of a negative value', () => {
      expect(formatMinutesAsClock(-90)).toBe('-1:30')
    })
  })

  describe('formatHoursAsDuration', () => {
    it('splits hours and minutes', () => {
      expect(formatHoursAsDuration(1.5)).toBe('1h 30m')
      expect(formatHoursAsDuration(8)).toBe('8h')
    })

    it('never renders 60 minutes', () => {
      expect(formatHoursAsDuration(0.9999999)).toBe('1h')
    })
  })
})

describe('apiResponse', () => {
  it('unwraps a wrapped payload', () => {
    expect(unwrap({ data: { success: true, data: { id: 1 } } })).toEqual({ id: 1 })
  })

  it('returns the body when it is not wrapped', () => {
    expect(unwrap({ data: [1, 2] })).toEqual([1, 2])
  })

  it('returns the rows of a bare array response', () => {
    expect(unwrapList({ data: { success: true, data: [{ id: 1 }] } })).toEqual([{ id: 1 }])
  })

  it('returns the rows of a paginated response', () => {
    const response = {
      data: { success: true, data: { currentPage: 1, lastPage: 3, perPage: 20, total: 45, data: [{ id: 1 }] } },
    }
    expect(unwrapList(response)).toEqual([{ id: 1 }])
    expect(unwrapPageMeta(response)).toEqual({ currentPage: 1, lastPage: 3, perPage: 20, total: 45 })
  })

  it('returns an empty list when there is nothing usable', () => {
    expect(unwrapList({ data: { success: true, data: null } })).toEqual([])
    expect(unwrapList(undefined)).toEqual([])
    expect(unwrapPageMeta({ data: { success: true, data: [] } })).toBeNull()
  })

  it('prefers the first validation error, then the message, then the fallback', () => {
    expect(
      apiErrorMessage({ response: { data: { message: 'Invalid', errors: { email: ['Taken'] } } } }, 'x')
    ).toBe('Taken')
    expect(apiErrorMessage({ response: { data: { message: 'Nope' } } }, 'x')).toBe('Nope')
    expect(apiErrorMessage(new Error('boom'), 'fallback')).toBe('fallback')
  })

  it('lists every validation error once for a form that shows them all', () => {
    const error = {
      response: {
        data: {
          message: 'Invalid',
          errors: { start_date: ['Too soon'], 'periods.0.start_date': ['Too soon'], notes: ['Too long'] },
        },
      },
    }
    expect(apiErrorMessages(error, 'x')).toEqual(['Too soon', 'Too long'])
    expect(apiErrorMessages({ response: { data: { message: 'Nope' } } }, 'x')).toEqual(['Nope'])
    expect(apiErrorMessages(new Error('boom'), 'fallback')).toEqual(['fallback'])
  })
})
