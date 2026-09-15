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
  }),
}));

describe('workLogs Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
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
      const mockResponse = {
        data: {
          date: '2025-01-15',
          shift: {
            start: { time: '09:00:00', type: 'check_in' },
            end: { time: '17:00:00', type: 'check_out' },
            total_minutes: 480,
          },
          total_work_time: { formatted: '8:00' },
          all_logs: [],
        },
      };
      vi.mocked(mockApi.get).mockResolvedValueOnce(mockResponse);

      const store = useWorkLogsStore();
      await store.fetchDailyReport();

      expect(mockApi.get).toHaveBeenCalledWith('/worklogs/daily-report/employee-123');
      expect(store.dailyReport).not.toBeNull();
      expect(store.dailyReport?.days[0].date).toBe('2025-01-15');
    });

    it('should fetch with specific period', async () => {
      const mockResponse = {
        data: {
          date: '2025-01-10',
          shift: null,
          total_work_time: { formatted: '0:00' },
          all_logs: [],
        },
      };
      vi.mocked(mockApi.get).mockResolvedValueOnce(mockResponse);

      const store = useWorkLogsStore();
      await store.fetchDailyReport('2025-01-10');

      expect(mockApi.get).toHaveBeenCalledWith('/worklogs/daily-report/employee-123/2025-01-10');
    });
  });

  describe('fetchWeeklyReport', () => {
    it('should fetch and transform weekly report', async () => {
      // The api.ts interceptor camelCases responses before the store sees them, and this suite
      // mocks that module away — so the fixture has to be camelCase, and so is the output the
      // store builds (`totalDuration`, not `total_duration`).
      const mockResponse = {
        data: {
          days: [
            {
              date: '2025-01-13',
              status: 'completed',
              isWeekend: false,
              shift: { startTime: '09:00', endTime: '17:00' },
              workTime: { formatted: '8:00' },
            },
          ],
          summary: {
            workTime: { formatted: '40:00' },
          },
        },
      };
      vi.mocked(mockApi.get).mockResolvedValueOnce(mockResponse);

      const store = useWorkLogsStore();
      await store.fetchWeeklyReport();

      expect(mockApi.get).toHaveBeenCalledWith('/worklogs/weekly-report/employee-123');
      expect(store.weeklyReport).not.toBeNull();
      expect(store.weeklyReport?.totalDuration).toBe('40:00');
      expect(store.weeklyReport?.days[0].checkIn?.time).toBe('09:00');
      expect(store.weeklyReport?.days[0].duration).toBe('8:00');
    });
  });

  describe('fetchMonthlyReport', () => {
    it('should fetch and transform monthly report', async () => {
      const mockResponse = {
        data: {
          days: [
            {
              date: '2025-01-01',
              status: 'completed',
              is_weekend: false,
              shift: { start_time: '09:00', end_time: '17:00' },
              work_minutes: 480,
            },
          ],
          summary: {
            work_time: { formatted: '160:00' },
          },
        },
      };
      vi.mocked(mockApi.get).mockResolvedValueOnce(mockResponse);

      const store = useWorkLogsStore();
      await store.fetchMonthlyReport(2025, 1);

      expect(mockApi.get).toHaveBeenCalledWith('/worklogs/monthly-report/employee-123/2025/1');
      expect(store.monthlyReport).not.toBeNull();
    });
  });
});
