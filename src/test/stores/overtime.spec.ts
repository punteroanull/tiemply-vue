import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useOvertimeStore } from '@/stores/overtime';
import { formatHoursAsDuration } from '@/utils/apiDates';
import { mockApi } from '../mocks/api';

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({
    currentEmployee: { id: 'employee-123' },
  }),
}));

// OvertimeService::getEmployeeSummary, after the interceptor camel-cases the keys.
function summaryResponse(overrides: Record<string, unknown> = {}) {
  return {
    data: {
      success: true,
      data: {
        year: 2026,
        employeeId: 'employee-123',
        employeeName: 'Ana',
        approvedHours: 30,
        pendingHours: 4.5,
        annualLimit: 80,
        remainingHours: 50,
        usagePercentage: 37.5,
        monthlyBreakdown: {
          '2026-03': { totalHours: 6, approvedHours: 4, pendingHours: 2, rejectedHours: 0, count: 3 },
        },
        records: [
          {
            id: 'r1',
            date: '2026-03-04T23:00:00.000000Z',
            hours: '1.50',
            status: 'approved',
            approvedBy: '9b1f0000-0000-0000-0000-000000000000',
            approver: { id: '9b1f0000-0000-0000-0000-000000000000', name: 'Marta' },
          },
        ],
        ...overrides,
      },
    },
  };
}

describe('overtime Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('maps the summary the API really sends', async () => {
    mockApi.get.mockResolvedValue(summaryResponse());

    const store = useOvertimeStore();
    await store.fetchSummary(2026);

    expect(mockApi.get).toHaveBeenCalledWith('/overtime/employee/employee-123/summary/2026');
    expect(store.summary?.approvedHours).toBe(30);
    expect(store.summary?.pendingHours).toBe(4.5);
    expect(store.summary?.remainingHours).toBe(50);
    expect(store.summary?.monthlyBreakdown['2026-03'].approvedHours).toBe(4);
    expect(store.totalHours).toBe(34.5);
    expect(store.formattedTotalOvertime).toBe('34h 30m');
    expect(store.formattedRemainingLimit).toBe('50h');
  });

  it('measures progress with approved hours against the annual limit', async () => {
    mockApi.get.mockResolvedValue(summaryResponse({ approvedHours: 68, pendingHours: 30 }));

    const store = useOvertimeStore();
    await store.fetchSummary(2026);

    expect(store.progressPercentage).toBe(85);
    expect(store.isNearLimit).toBe(true);
    expect(store.isAtLimit).toBe(false);
  });

  it('caps progress at 100 and never divides by a missing limit', async () => {
    const store = useOvertimeStore();

    mockApi.get.mockResolvedValue(summaryResponse({ approvedHours: 120 }));
    await store.fetchSummary(2026);
    expect(store.progressPercentage).toBe(100);
    expect(store.isAtLimit).toBe(true);

    mockApi.get.mockResolvedValue(summaryResponse({ annualLimit: 0 }));
    await store.fetchSummary(2026);
    expect(store.progressPercentage).toBe(0);
  });

  it('turns decimal-string hours into numbers and keeps the approver name', async () => {
    mockApi.get.mockResolvedValue(summaryResponse());

    const store = useOvertimeStore();
    await store.fetchSummary(2026);

    const record = store.summary!.records[0];
    expect(record.hours).toBe(1.5);
    expect(record.approver?.name).toBe('Marta');
  });

  it('accepts an empty monthly breakdown serialised as an array', async () => {
    mockApi.get.mockResolvedValue(summaryResponse({ monthlyBreakdown: [], records: [] }));

    const store = useOvertimeStore();
    await store.fetchSummary(2026);

    expect(store.summary?.monthlyBreakdown).toEqual({});
    expect(store.summary?.records).toEqual([]);
  });

  it('flags a failure instead of showing zeros', async () => {
    mockApi.get.mockRejectedValue(new Error('Network error'));

    const store = useOvertimeStore();
    await store.fetchSummary(2026);

    expect(store.summary).toBeNull();
    expect(store.error).toBe(true);
    expect(store.featureUnavailable).toBe(false);
  });

  it('treats a plan-gated 403 as "not available", not as an error', async () => {
    mockApi.get.mockRejectedValue({
      response: { status: 403, data: { success: false, errors: { upgrade_required: true } } },
    });

    const store = useOvertimeStore();
    await store.fetchSummary(2026);

    expect(store.featureUnavailable).toBe(true);
    expect(store.error).toBe(false);
  });

  it('reads paginated records with the parameter names the API expects', async () => {
    mockApi.get.mockResolvedValue({
      data: {
        success: true,
        data: { currentPage: 1, lastPage: 1, total: 1, data: [{ id: 'r1', hours: '2.25', status: 'pending' }] },
      },
    });

    const store = useOvertimeStore();
    await store.fetchRecords({ status: 'pending', startDate: '2026-01-01', endDate: '2026-12-31' });

    const url = mockApi.get.mock.calls[0][0] as string;
    expect(url).toContain('start_date=2026-01-01');
    expect(url).toContain('end_date=2026-12-31');
    expect(url).not.toContain('date_from');
    expect(store.records).toHaveLength(1);
    expect(store.records[0].hours).toBe(2.25);
    expect(store.hasPendingOvertime).toBe(true);
  });
});

describe('formatHoursAsDuration', () => {
  it('formats decimal hours', () => {
    expect(formatHoursAsDuration(0)).toBe('0h');
    expect(formatHoursAsDuration(8)).toBe('8h');
    expect(formatHoursAsDuration(1.5)).toBe('1h 30m');
    expect(formatHoursAsDuration(12.333333)).toBe('12h 20m');
  });

  it('never renders 60 minutes', () => {
    expect(formatHoursAsDuration(0.9999999)).toBe('1h');
    expect(formatHoursAsDuration(2.9999)).toBe('3h');
  });
});
