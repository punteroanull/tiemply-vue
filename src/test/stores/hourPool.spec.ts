import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useHourPoolStore } from '@/stores/hourPool';
import { mockApi } from '../mocks/api';

const auth = {
  isAdmin: false,
  isManager: false,
  isSupervisor: false,
  currentEmployee: { id: 'employee-123' } as { id: string } | null,
  currentCompany: { id: 'company-1' } as { id: string } | null,
};

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => auth,
}));

const settings = (visible: boolean) => ({
  data: { success: true, data: { hourPoolVisibleToEmployees: visible } },
});

describe('hourPool Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    Object.assign(auth, {
      isAdmin: false,
      isManager: false,
      isSupervisor: false,
      currentEmployee: { id: 'employee-123' },
      currentCompany: { id: 'company-1' },
    });
  });

  describe('access', () => {
    it('does not let a department supervisor in: the API only allows admins and managers', () => {
      auth.isSupervisor = true;
      const store = useHourPoolStore();

      expect(store.canViewHourPool).toBe(false);
      expect(store.canViewCompanySummary).toBe(false);
    });

    it('lets employees in once the company shows the pool to them', async () => {
      mockApi.get.mockResolvedValue(settings(true));
      const store = useHourPoolStore();

      expect(store.settingsLoaded).toBe(false);
      await store.fetchCompanySettings();

      expect(store.settingsLoaded).toBe(true);
      expect(store.canViewHourPool).toBe(true);
      expect(store.canViewCompanySummary).toBe(false);
    });

    it('lets managers see both screens', () => {
      auth.isManager = true;
      const store = useHourPoolStore();

      expect(store.canViewHourPool).toBe(true);
      expect(store.canViewCompanySummary).toBe(true);
    });

    it('forgets the visibility flag on reset', async () => {
      mockApi.get.mockResolvedValue(settings(true));
      const store = useHourPoolStore();
      await store.fetchCompanySettings();

      store.reset();

      expect(store.hourPoolVisibleToEmployees).toBe(false);
      expect(store.settingsLoaded).toBe(false);
      expect(store.canViewHourPool).toBe(false);
    });
  });

  describe('entries', () => {
    it('scopes entries to a date range and reads the paginator', async () => {
      auth.isManager = true;
      mockApi.get.mockResolvedValue({
        data: {
          success: true,
          data: { currentPage: 2, lastPage: 3, total: 45, from: 21, to: 40, data: [{ id: 'e1' }] },
        },
      });

      const store = useHourPoolStore();
      await store.fetchEntries({ startDate: '2025-01-01', endDate: '2025-12-31', type: 'debit', page: 2 });

      const url = mockApi.get.mock.calls[0][0] as string;
      expect(url).toContain('/hour-pool/employee/employee-123/entries');
      expect(url).toContain('start_date=2025-01-01');
      expect(url).toContain('end_date=2025-12-31');
      expect(url).toContain('type=debit');
      expect(store.entries?.data).toHaveLength(1);
      expect(store.currentPage).toBe(2);
      expect(store.totalPages).toBe(3);
      expect(store.totalEntries).toBe(45);
    });

    it('does not call the API without permission', async () => {
      const store = useHourPoolStore();
      await store.fetchEntries();
      await store.fetchBalance(2026);

      expect(mockApi.get).not.toHaveBeenCalled();
    });

    it('flags a failure instead of looking empty', async () => {
      auth.isManager = true;
      mockApi.get.mockRejectedValue(new Error('Network error'));

      const store = useHourPoolStore();
      await store.fetchEntries();
      await store.fetchBalance(2026);

      expect(store.entriesError).toBe(true);
      expect(store.balanceError).toBe(true);
      expect(store.loading).toBe(false);
      expect(store.loadingEntries).toBe(false);
    });
  });

  describe('company summary', () => {
    it('reports an error when there is no company to ask for', async () => {
      auth.currentCompany = null;
      const store = useHourPoolStore();

      await store.fetchCompanySummary();

      expect(mockApi.get).not.toHaveBeenCalled();
      expect(store.summaryError).toBe(true);
    });

    it('lists every employee of the company for a first adjustment', async () => {
      mockApi.get.mockResolvedValue({
        data: {
          success: true,
          data: [
            { id: 'e2', user: { name: 'Zoe' } },
            { id: 'e1', user: { name: 'Ana' } },
          ],
        },
      });

      const store = useHourPoolStore();
      const options = await store.fetchCompanyEmployees();

      expect(mockApi.get).toHaveBeenCalledWith('/companies/company-1/employees');
      expect(options).toEqual([
        { id: 'e1', name: 'Ana' },
        { id: 'e2', name: 'Zoe' },
      ]);
    });

    it('sends the adjustment in snake_case-compatible fields', async () => {
      mockApi.post.mockResolvedValue({ data: { success: true } });

      const store = useHourPoolStore();
      const ok = await store.createAdjustment('e1', { type: 'debit', minutes: 90, description: 'Ajuste' });

      expect(ok).toBe(true);
      expect(mockApi.post).toHaveBeenCalledWith('/hour-pool/employee/e1/adjustment', {
        type: 'debit',
        minutes: 90,
        description: 'Ajuste',
      });
    });
  });
});
