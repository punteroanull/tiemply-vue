import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useWorkLogsStore } from '@/stores/workLogs';
import { mockApi } from '../mocks/api';

vi.mock('vue-toastification', () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
  }),
}));

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({
    user: {
      id: 'user-123',
      employeeRecords: [{ id: 'employee-123' }],
    },
    currentEmployee: { id: 'employee-123' },
  }),
}));

// The api.ts interceptor camelCases responses before the store sees them, and this suite
// mocks that module away, so every fixture here is already camelCase.

describe('workLogs Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    mockApi.get.mockReset();
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const store = useWorkLogsStore();

      expect(store.dailyReport).toBeNull();
      expect(store.weeklyReport).toBeNull();
      expect(store.monthlyReport).toBeNull();
      expect(store.loading).toBe(false);
    });
  });

  describe('fetchDailyReport', () => {
    it('should fetch and transform daily report', async () => {
      mockApi.get.mockResolvedValueOnce({
        data: {
          date: '2025-01-15',
          shift: {
            start: { time: '09:00:00', type: 'check_in' },
            end: { time: '17:35:00', type: 'check_out' },
            totalMinutes: 515,
          },
          totalWorkTime: { minutes: 485, formatted: '08:05' },
          allLogs: [],
        },
      });

      const store = useWorkLogsStore();
      await store.fetchDailyReport();

      expect(mockApi.get).toHaveBeenCalledWith('/worklogs/daily-report/employee-123');
      expect(store.dailyReport).not.toBeNull();
      expect(store.dailyReport?.days[0].date).toBe('2025-01-15');
      // Zero-padded minutes, and net time (breaks excluded) rather than the gross span.
      expect(store.dailyReport?.days[0].duration).toBe('8:05');
      expect(store.dailyReport?.totalDuration).toBe('8:05');
      expect(store.dailyReport?.totalDays).toBe(1);
      expect(store.dailyReport?.hasLogs).toBe(true);
    });

    it('should fetch with specific period', async () => {
      mockApi.get.mockResolvedValueOnce({
        data: {
          date: '2025-01-10',
          shift: null,
          totalWorkTime: { minutes: 0, formatted: '00:00' },
          allLogs: [],
        },
      });

      const store = useWorkLogsStore();
      await store.fetchDailyReport('2025-01-10');

      expect(mockApi.get).toHaveBeenCalledWith('/worklogs/daily-report/employee-123/2025-01-10');
      expect(store.dailyReport?.totalDays).toBe(0);
      expect(store.dailyReport?.hasLogs).toBe(false);
    });

    it('marks a shift that has not ended as in progress', async () => {
      mockApi.get.mockResolvedValueOnce({
        data: {
          date: '2025-01-15',
          shift: { start: { time: '09:00:00', type: 'check_in' }, end: null, totalMinutes: null },
          totalWorkTime: { minutes: 0, formatted: '00:00' },
          allLogs: [{ id: '1', time: '09:00:00', type: 'check_in', category: 'shift_start' }],
        },
      });

      const store = useWorkLogsStore();
      await store.fetchDailyReport();

      expect(store.dailyReport?.days[0].inProgress).toBe(true);
      expect(store.dailyReport?.hasLogs).toBe(true);
    });

    it('clears the previous report and flags the error when the request fails', async () => {
      const store = useWorkLogsStore();

      mockApi.get.mockResolvedValueOnce({
        data: { date: '2025-01-15', shift: null, totalWorkTime: { minutes: 0 }, allLogs: [] },
      });
      await store.fetchDailyReport('2025-01-15');
      expect(store.dailyReport).not.toBeNull();

      mockApi.get.mockRejectedValueOnce(new Error('Network Error'));
      await store.fetchDailyReport('2025-01-14');

      // Otherwise the 15th would stay on screen under the heading of the 14th.
      expect(store.dailyReport).toBeNull();
      expect(store.errors.daily).toBe(true);
      expect(store.loading).toBe(false);
    });

    it('ignores an answer that arrives after a newer request', async () => {
      const store = useWorkLogsStore();
      let releaseFirst: (value: unknown) => void = () => undefined;

      mockApi.get.mockReturnValueOnce(new Promise((resolve) => { releaseFirst = resolve; }));
      mockApi.get.mockResolvedValueOnce({
        data: { date: '2025-01-14', shift: null, totalWorkTime: { minutes: 0 }, allLogs: [] },
      });

      const first = store.fetchDailyReport('2025-01-15');
      await store.fetchDailyReport('2025-01-14');

      expect(store.loading).toBe(true);

      releaseFirst({
        data: { date: '2025-01-15', shift: null, totalWorkTime: { minutes: 0 }, allLogs: [] },
      });
      await first;

      expect(store.dailyReport?.days[0].date).toBe('2025-01-14');
      expect(store.loading).toBe(false);
    });
  });

  describe('fetchWeeklyReport', () => {
    it('should fetch and transform weekly report', async () => {
      // The API always returns the seven days of the week.
      const emptyDay = (date: string) => ({
        date,
        status: 'absent',
        isWeekend: false,
        shift: { startTime: null, endTime: null },
        workTime: { minutes: 0, formatted: '00:00' },
      });

      mockApi.get.mockResolvedValueOnce({
        data: {
          days: [
            {
              date: '2025-01-13',
              status: 'completed',
              isWeekend: false,
              shift: { startTime: '09:00', endTime: '17:00' },
              workTime: { minutes: 480, formatted: '8:00' },
            },
            emptyDay('2025-01-14'),
            emptyDay('2025-01-15'),
            emptyDay('2025-01-16'),
            emptyDay('2025-01-17'),
            emptyDay('2025-01-18'),
            emptyDay('2025-01-19'),
          ],
          summary: {
            workTime: { formatted: '08:00' },
            expectedWorkTime: { minutes: 2400, formatted: '40:00' },
            daysWorked: 1,
            daysIncomplete: 0,
            productivity: 20,
          },
        },
      });

      const store = useWorkLogsStore();
      await store.fetchWeeklyReport();

      expect(mockApi.get).toHaveBeenCalledWith('/worklogs/weekly-report/employee-123');
      expect(store.weeklyReport).not.toBeNull();
      expect(store.weeklyReport?.totalDuration).toBe('08:00');
      expect(store.weeklyReport?.days[0].checkIn?.time).toBe('09:00');
      expect(store.weeklyReport?.days[0].duration).toBe('8:00');
      // Days worked, not the seven days the week has.
      expect(store.weeklyReport?.totalDays).toBe(1);
      expect(store.weeklyReport?.progressPercent).toBe(20);
      expect(store.weeklyReport?.expectedDuration).toBe('40:00');
    });

    it('reports an empty week as having no logs', async () => {
      mockApi.get.mockResolvedValueOnce({
        data: {
          days: [
            { date: '2025-01-13', shift: { startTime: null, endTime: null }, workTime: { minutes: 0 } },
          ],
          summary: { workTime: { formatted: '00:00' }, daysWorked: 0, daysIncomplete: 0 },
        },
      });

      const store = useWorkLogsStore();
      await store.fetchWeeklyReport();

      expect(store.weeklyReport?.hasLogs).toBe(false);
      expect(store.weeklyReport?.totalDays).toBe(0);
    });
  });

  describe('fetchMonthlyReport', () => {
    it('should fetch and transform monthly report', async () => {
      mockApi.get.mockResolvedValueOnce({
        data: {
          days: [
            {
              date: '2025-01-01',
              status: 'completed',
              isWeekend: false,
              shift: { startTime: '09:00', endTime: '17:05' },
              // The API sends fractional minutes: times carry seconds.
              workMinutes: 485.383333333333326,
            },
            {
              date: '2025-01-02',
              status: 'incomplete',
              isWeekend: false,
              shift: { startTime: '09:00', endTime: null },
              workMinutes: 0,
            },
          ],
          summary: {
            workTime: { formatted: '08:05' },
            daysWorked: 1,
            daysIncomplete: 1,
          },
        },
      });

      const store = useWorkLogsStore();
      await store.fetchMonthlyReport(2025, 1);

      expect(mockApi.get).toHaveBeenCalledWith('/worklogs/monthly-report/employee-123/2025/1');
      expect(store.monthlyReport).not.toBeNull();
      expect(store.monthlyReport?.days[0].duration).toBe('8:05');
      expect(store.monthlyReport?.days[1].duration).toBe('0:00');
      expect(store.monthlyReport?.days[1].inProgress).toBe(true);
      expect(store.monthlyReport?.totalDays).toBe(2);
    });
  });

  describe('exports', () => {
    it('returns false when the plan does not include PDF export', async () => {
      mockApi.get.mockRejectedValueOnce({ response: { status: 403 } });

      const store = useWorkLogsStore();
      const result = await store.exportDailyPdf('2025-01-15');

      expect(result).toBe(false);
      expect(store.exporting).toBe(false);
    });
  });
});
