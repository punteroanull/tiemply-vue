import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useSchedulesStore } from '@/stores/schedules';
import { mockApi } from '../mocks/api';

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({
    currentEmployee: { id: 'employee-123' },
  }),
}));

const block = (id: string, dayOfWeek: number) => ({
  id,
  dayOfWeek,
  startTime: '09:00:00',
  endTime: '17:00:00',
  crossesMidnight: false,
  order: 1,
});

// ScheduleController::weeklyOverview: seven days, Monday first, Carbon dayOfWeek (0 = Sunday).
function weeklyResponse(workingDays = [1, 2, 3, 4, 5]) {
  const monday = new Date(2026, 10, 23); // Monday 23 Nov 2026
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    const dayOfWeek = date.getDay();
    const working = workingDays.includes(dayOfWeek);
    return {
      date: `2026-11-${String(23 + i).padStart(2, '0')}`,
      dayOfWeek,
      dayName: date.toLocaleDateString('en-US', { weekday: 'long' }),
      isWorkingDay: working,
      isFlexible: false,
      totalHours: working ? 8 : 0,
      blocks: working ? [block(`b-${dayOfWeek}`, dayOfWeek)] : [],
    };
  });

  return {
    data: {
      success: true,
      data: {
        weekStart: '2026-11-23',
        weekEnd: '2026-11-29',
        days,
        totalWeeklyHours: 40,
        isFlexible: false,
        flexible: null,
      },
    },
  };
}

describe('schedules Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('keeps each day under its own date, Monday first', async () => {
    mockApi.get.mockResolvedValue(weeklyResponse());

    const store = useSchedulesStore();
    await store.fetchWeeklySchedule('2026-11-23');

    const days = store.weeklySchedule!.days;
    expect(days).toHaveLength(7);
    expect(days[0].date).toBe('2026-11-23');
    expect(days[0].blocks).toHaveLength(1); // Monday works
    expect(days[4].date).toBe('2026-11-27');
    expect(days[4].blocks).toHaveLength(1); // Friday works
    expect(days[5].blocks).toHaveLength(0); // Saturday off
    expect(days[6].date).toBe('2026-11-29');
    expect(days[6].blocks).toHaveLength(0); // Sunday is present, and off
  });

  it('finds today by date, not by position in the array', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 23, 10, 0, 0)); // Monday
    mockApi.get.mockResolvedValue(weeklyResponse());

    const store = useSchedulesStore();
    await store.fetchWeeklySchedule();

    expect(store.todaySchedule?.date).toBe('2026-11-23');
    expect(store.todaySchedule?.blocks[0].id).toBe('b-1');
    expect(store.todaySchedule?.totalHours).toBe(8);
  });

  it('returns Sunday on a Sunday', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 29, 10, 0, 0)); // Sunday
    mockApi.get.mockResolvedValue(weeklyResponse([0]));

    const store = useSchedulesStore();
    await store.fetchWeeklySchedule();

    expect(store.todaySchedule?.date).toBe('2026-11-29');
    expect(store.todaySchedule?.blocks[0].id).toBe('b-0');
  });

  it('has no "today" when the loaded week is another one', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 11, 2, 10, 0, 0)); // the following Wednesday
    mockApi.get.mockResolvedValue(weeklyResponse());

    const store = useSchedulesStore();
    await store.fetchWeeklySchedule('2026-11-23');

    expect(store.todaySchedule).toBeNull();
  });

  it('takes type and name from the current-schedule endpoint', async () => {
    mockApi.get.mockResolvedValue({
      data: {
        success: true,
        data: {
          type: 'flexible',
          scheduleType: 'night',
          isFlexible: false,
          schedule: { id: 's1', name: 'Noches', scheduleType: 'night', blocks: [] },
        },
      },
    });

    const store = useSchedulesStore();
    await store.fetchCurrentSchedule();

    expect(store.scheduleType).toBe('night');
    expect(store.scheduleName).toBe('Noches');
    expect(store.isNightShift).toBe(true);
    expect(store.hasSchedule).toBe(true);
    expect(store.isLegacy).toBe(false);
  });

  it('recognises contract hours and "nothing assigned"', async () => {
    const store = useSchedulesStore();

    mockApi.get.mockResolvedValue({
      data: {
        success: true,
        data: {
          type: 'legacy',
          scheduleType: null,
          isFlexible: false,
          schedule: { schedule: null, blocks: [], totalHours: 8, contractStartTime: '09:00:00', contractEndTime: '17:00:00' },
        },
      },
    });
    await store.fetchCurrentSchedule();
    expect(store.isLegacy).toBe(true);
    expect(store.hasSchedule).toBe(true);
    expect(store.scheduleType).toBeNull();
    expect(store.scheduleTypeBadge).toBeNull();

    mockApi.get.mockResolvedValue({
      data: { success: true, data: { type: 'legacy', scheduleType: null, isFlexible: false, schedule: null } },
    });
    await store.fetchCurrentSchedule();
    expect(store.hasSchedule).toBe(false);
  });

  it('ignores a slow older week once a newer one was requested', async () => {
    let resolveFirst: (value: unknown) => void = () => {};
    mockApi.get
      .mockImplementationOnce(() => new Promise((resolve) => (resolveFirst = resolve)))
      .mockResolvedValueOnce(weeklyResponse([1]));

    const store = useSchedulesStore();
    const first = store.fetchWeeklySchedule('2026-11-16');
    await store.fetchWeeklySchedule('2026-11-23');

    resolveFirst(weeklyResponse([1, 2, 3, 4, 5, 6, 0]));
    await first;

    // Still the second response: only Monday has blocks.
    expect(store.weeklySchedule!.days.filter((d) => d.blocks.length > 0)).toHaveLength(1);
    expect(store.loading).toBe(false);
  });

  it('flags a failure separately from having no schedule', async () => {
    mockApi.get.mockRejectedValue(new Error('Network error'));

    const store = useSchedulesStore();
    await store.fetchWeeklySchedule();

    expect(store.weeklySchedule).toBeNull();
    expect(store.error).toBe(true);
  });
});
