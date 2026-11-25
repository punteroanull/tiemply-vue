import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, VueWrapper } from '@vue/test-utils';
import AbsenceCalendar from '@/components/AbsenceCalendar.vue';
import i18n from '@/i18n';

const push = vi.fn();

vi.mock('vue-router', () => ({
  useRouter: () => ({ push }),
}));

const VACATION = { id: 'type-1', code: 'vacation', name: 'Vacation' };

describe('AbsenceCalendar', () => {
  let wrapper: VueWrapper<any>;

  function mountWith(props: Record<string, unknown>) {
    return mount(AbsenceCalendar, { props, global: { plugins: [i18n] } });
  }

  /** The cell of a day of the month on screen (cells of neighbouring months are greyed). */
  function dayCell(dayOfMonth: number) {
    return wrapper
      .findAll('.grid > div.relative')
      .filter((cell) => !cell.find('.text-neutral-400').exists())
      .find((cell) => cell.find('.text-right').text() === String(dayOfMonth))!;
  }

  beforeEach(() => {
    // Midday on 10 Nov 2026, so "this month" is November in any timezone.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-10T12:00:00Z'));
    i18n.global.locale.value = 'en';
  });

  afterEach(() => {
    wrapper?.unmount();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('draws an approved absence on its day when the API sends the date as an instant', () => {
    // 23 Nov in the server timezone (Europe/Madrid) is serialised as 22 Nov 23:00 UTC.
    wrapper = mountWith({
      absences: [{ id: 'a-1', date: '2026-11-22T23:00:00.000000Z', absenceType: VACATION }],
    });

    expect(dayCell(23).find('span.bg-blue-500').exists()).toBe(true);
    expect(dayCell(22).find('span.bg-blue-500').exists()).toBe(false);
    expect(dayCell(23).text()).toContain('Vacation - Approved absence');
  });

  it('also accepts a plain yyyy-MM-dd date', () => {
    wrapper = mountWith({
      absences: [{ id: 'a-1', date: '2026-11-18', absenceType: VACATION }],
    });

    expect(dayCell(18).find('span.bg-blue-500').exists()).toBe(true);
  });

  it('spreads a pending period-based request over the days of its pending periods', () => {
    wrapper = mountWith({
      requests: [
        {
          id: 'r-1',
          status: 'partial',
          startDate: null,
          endDate: null,
          usesPeriods: true,
          absenceType: VACATION,
          periods: [
            { startDate: '2026-11-02T23:00:00.000000Z', endDate: '2026-11-03T23:00:00.000000Z', status: 'pending' },
            { startDate: '2026-11-16T23:00:00.000000Z', endDate: '2026-11-16T23:00:00.000000Z', status: 'approved' },
          ],
        },
      ],
    });

    expect(dayCell(3).find('.border-blue-500').exists()).toBe(true);
    expect(dayCell(4).find('.border-blue-500').exists()).toBe(true);
    expect(dayCell(5).find('.border-blue-500').exists()).toBe(false);
    // The approved period is not "pending": it shows up through its absences instead.
    expect(dayCell(17).find('.border-blue-500').exists()).toBe(false);
  });

  it('does not offer editing on a period-based request', async () => {
    wrapper = mountWith({
      requests: [
        {
          id: 'r-1',
          status: 'pending',
          startDate: null,
          endDate: null,
          usesPeriods: true,
          absenceType: VACATION,
          periods: [{ startDate: '2026-11-12', endDate: '2026-11-12', status: 'pending' }],
        },
      ],
    });

    expect(dayCell(12).find('button').exists()).toBe(false);
    expect(dayCell(12).text()).not.toContain('Click to edit');
  });

  it('opens the edit form for a pending request with a single date range', async () => {
    wrapper = mountWith({
      requests: [
        { id: 'r-2', status: 'pending', startDate: '2026-11-12', endDate: '2026-11-12', absenceType: VACATION },
      ],
    });

    await dayCell(12).find('button').trigger('click');

    expect(push).toHaveBeenCalledWith('/requests/r-2/edit');
  });

  it('labels the month navigation for screen readers', () => {
    wrapper = mountWith({});

    expect(wrapper.find('button[aria-label="Previous month"]').exists()).toBe(true);
    expect(wrapper.find('button[aria-label="Next month"]').exists()).toBe(true);
  });
});
