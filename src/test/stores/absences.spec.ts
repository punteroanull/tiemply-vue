import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useAbsencesStore } from '@/stores/absences';
import { mockApi } from '../mocks/api';

vi.mock('vue-toastification', () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
  }),
}));

const fetchCurrentUser = vi.fn();

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({
    user: {
      id: 'user-123',
      // The first record is a closed employment: the store must not pick it by position.
      employeeRecords: [{ id: 'employee-old', active: false }, { id: 'employee-123', active: true }],
    },
    currentEmployee: { id: 'employee-123', active: true },
    fetchCurrentUser,
  }),
}));

describe('absences Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const store = useAbsencesStore();

      expect(store.absences).toEqual([]);
      expect(store.absenceTypes).toEqual([]);
      expect(store.requests).toEqual([]);
      expect(store.pendingRequests).toEqual([]);
      expect(store.loading).toBe(false);
      expect(store.submitting).toBe(false);
    });
  });

  describe('fetchAbsenceTypes', () => {
    it('should fetch and store absence types', async () => {
      const mockTypes = [
        { id: '1', name: 'Vacation', code: 'vacation', requires_approval: true },
        { id: '2', name: 'Sick Leave', code: 'sick_leave', requires_approval: false },
      ];
      vi.mocked(mockApi.get).mockResolvedValueOnce({ data: mockTypes });

      const store = useAbsencesStore();
      await store.fetchAbsenceTypes();

      expect(mockApi.get).toHaveBeenCalledWith('/absence-types');
      expect(store.absenceTypes).toEqual(mockTypes);
    });
  });

  describe('fetchAbsences', () => {
    it('should fetch employee absences', async () => {
      const mockAbsences = [
        { id: '1', date: '2025-01-15', is_partial: false },
      ];
      vi.mocked(mockApi.get).mockResolvedValueOnce({ data: mockAbsences });

      const store = useAbsencesStore();
      await store.fetchAbsences();

      expect(mockApi.get).toHaveBeenCalledWith('/employees/employee-123/absences');
      expect(store.absences).toEqual(mockAbsences);
    });
  });

  describe('submitAbsenceRequest', () => {
    it('should submit request to correct endpoint', async () => {
      vi.mocked(mockApi.post).mockResolvedValueOnce({ data: { success: true } });
      vi.mocked(mockApi.get).mockResolvedValue({ data: [] });

      const store = useAbsencesStore();
      const requestData = {
        absence_type_id: 'type-1',
        start_date: '2025-02-01',
        end_date: '2025-02-05',
      };

      await store.submitAbsenceRequest(requestData);

      // Debe usar /requests, no /absence-requests
      expect(mockApi.post).toHaveBeenCalledWith('/requests', expect.objectContaining({
        employee_id: 'employee-123',
        absence_type_id: 'type-1',
      }));
    });

    it('should return true on success', async () => {
      vi.mocked(mockApi.post).mockResolvedValueOnce({ data: { success: true } });
      vi.mocked(mockApi.get).mockResolvedValue({ data: [] });

      const store = useAbsencesStore();
      const result = await store.submitAbsenceRequest({
        absence_type_id: 'type-1',
        start_date: '2025-02-01',
        end_date: '2025-02-05',
      });

      expect(result).toBe(true);
    });
  });

  describe('fetchPendingRequests', () => {
    it('should fetch pending requests from correct endpoint', async () => {
      const mockPending = [
        { id: '1', status: 'pending', start_date: '2025-02-01' },
      ];
      vi.mocked(mockApi.get).mockResolvedValueOnce({ data: mockPending });

      const store = useAbsencesStore();
      await store.fetchPendingRequests();

      expect(mockApi.get).toHaveBeenCalledWith('/requests/pending/employee/employee-123');
      expect(store.pendingRequests).toEqual(mockPending);
    });
  });

  describe('fetchTeamPendingRequests', () => {
    it('should fetch team pending requests from /requests/pending', async () => {
      const mockTeamPending = [
        { id: 'req-1', status: 'pending', periods: [{ id: 'p-1', status: 'pending' }] },
        { id: 'req-2', status: 'partial', periods: [{ id: 'p-2', status: 'pending' }] },
      ];
      vi.mocked(mockApi.get).mockResolvedValueOnce({ data: { success: true, data: mockTeamPending } });

      const store = useAbsencesStore();
      await store.fetchTeamPendingRequests();

      expect(mockApi.get).toHaveBeenCalledWith('/requests/pending');
      expect(store.teamPendingRequests).toEqual(mockTeamPending);
      expect(store.loading).toBe(false);
    });

    it('should leave the list empty when the request fails', async () => {
      vi.mocked(mockApi.get).mockRejectedValueOnce({ response: { status: 404, data: { message: 'Not found' } } });

      const store = useAbsencesStore();
      await store.fetchTeamPendingRequests();

      expect(store.teamPendingRequests).toEqual([]);
      expect(store.loading).toBe(false);
    });
  });

  describe('reviewPeriod', () => {
    it('should approve a period and refetch team pending requests', async () => {
      vi.mocked(mockApi.post).mockResolvedValueOnce({ data: { success: true } });
      vi.mocked(mockApi.get).mockResolvedValueOnce({ data: { success: true, data: [] } });

      const store = useAbsencesStore();
      const result = await store.reviewPeriod('period-1', 'approved');

      expect(result).toBe(true);
      expect(mockApi.post).toHaveBeenCalledWith('/requests/periods/period-1/review', { status: 'approved' });
      expect(mockApi.get).toHaveBeenCalledWith('/requests/pending');
      expect(store.reviewing).toBe(false);
    });

    it('should send rejection_reason in snake_case when rejecting', async () => {
      vi.mocked(mockApi.post).mockResolvedValueOnce({ data: { success: true } });
      vi.mocked(mockApi.get).mockResolvedValueOnce({ data: { success: true, data: [] } });

      const store = useAbsencesStore();
      const result = await store.reviewPeriod('period-1', 'rejected', 'Not enough coverage');

      expect(result).toBe(true);
      expect(mockApi.post).toHaveBeenCalledWith('/requests/periods/period-1/review', {
        status: 'rejected',
        rejection_reason: 'Not enough coverage',
      });
    });

    it('should return false when the API rejects the review', async () => {
      vi.mocked(mockApi.post).mockRejectedValueOnce({ response: { status: 403, data: { message: 'Forbidden' } } });

      const store = useAbsencesStore();
      const result = await store.reviewPeriod('period-1', 'approved');

      expect(result).toBe(false);
      expect(mockApi.get).not.toHaveBeenCalled();
      expect(store.reviewing).toBe(false);
    });
  });

  describe('approveAllPeriods / rejectAllPeriods', () => {
    it('should call the approve-all-periods endpoint and refetch', async () => {
      vi.mocked(mockApi.post).mockResolvedValueOnce({ data: { success: true } });
      vi.mocked(mockApi.get).mockResolvedValueOnce({ data: { success: true, data: [] } });

      const store = useAbsencesStore();
      const result = await store.approveAllPeriods('req-1');

      expect(result).toBe(true);
      expect(mockApi.post).toHaveBeenCalledWith('/requests/req-1/approve-all-periods');
      expect(mockApi.get).toHaveBeenCalledWith('/requests/pending');
    });

    it('should call the reject-all-periods endpoint with rejection_reason', async () => {
      vi.mocked(mockApi.post).mockResolvedValueOnce({ data: { success: true } });
      vi.mocked(mockApi.get).mockResolvedValueOnce({ data: { success: true, data: [] } });

      const store = useAbsencesStore();
      const result = await store.rejectAllPeriods('req-1', 'Team is short-staffed');

      expect(result).toBe(true);
      expect(mockApi.post).toHaveBeenCalledWith('/requests/req-1/reject-all-periods', {
        rejection_reason: 'Team is short-staffed',
      });
      expect(mockApi.get).toHaveBeenCalledWith('/requests/pending');
    });
  });

  describe('failed fetches', () => {
    it('flags a failed request list instead of leaving it looking empty', async () => {
      vi.mocked(mockApi.get).mockRejectedValueOnce({ response: { status: 500, data: {} } });

      const store = useAbsencesStore();
      await store.fetchAbsenceRequests();

      expect(store.requestsError).toBe(true);
      expect(store.loading).toBe(false);
    });

    it('clears the flag once the list loads again', async () => {
      vi.mocked(mockApi.get)
        .mockRejectedValueOnce({ response: { status: 500, data: {} } })
        .mockResolvedValueOnce({ data: { success: true, data: [{ id: 'req-1' }] } });

      const store = useAbsencesStore();
      await store.fetchAbsenceRequests();
      await store.fetchAbsenceRequests();

      expect(store.requestsError).toBe(false);
      expect(store.requests).toEqual([{ id: 'req-1' }]);
    });

    it('flags failed absences and failed team requests separately', async () => {
      vi.mocked(mockApi.get).mockRejectedValue({ response: { status: 500, data: {} } });

      const store = useAbsencesStore();
      await store.fetchAbsences();
      await store.fetchTeamPendingRequests();

      expect(store.absencesError).toBe(true);
      expect(store.teamRequestsError).toBe(true);
      expect(store.requestsError).toBe(false);
    });
  });

  describe('balance refresh', () => {
    it('reloads the user after submitting, so the vacation balance is current', async () => {
      vi.mocked(mockApi.post).mockResolvedValueOnce({ data: { success: true } });
      vi.mocked(mockApi.get).mockResolvedValue({ data: [] });

      const store = useAbsencesStore();
      await store.submitAbsenceRequest({ absence_type_id: 'type-1' });

      expect(fetchCurrentUser).toHaveBeenCalledTimes(1);
    });

    it('does not reload the user when the submission fails', async () => {
      vi.mocked(mockApi.post).mockRejectedValueOnce({
        response: { status: 422, data: { message: 'Not enough days' } },
      });

      const store = useAbsencesStore();
      const result = await store.submitAbsenceRequest({ absence_type_id: 'type-1' });

      expect(result).toBe(false);
      expect(fetchCurrentUser).not.toHaveBeenCalled();
    });
  });

  describe('cancelRequest', () => {
    it('deletes the request, refetches the lists and reloads the balance', async () => {
      vi.mocked(mockApi.delete).mockResolvedValueOnce({ data: { success: true } });
      vi.mocked(mockApi.get).mockResolvedValue({ data: [] });

      const store = useAbsencesStore();
      const result = await store.cancelRequest('req-1');

      expect(result).toBe(true);
      expect(mockApi.delete).toHaveBeenCalledWith('/requests/req-1');
      expect(mockApi.get).toHaveBeenCalledWith('/employees/employee-123/absence-requests');
      expect(fetchCurrentUser).toHaveBeenCalledTimes(1);
    });

    it('returns false when the API refuses (already under review)', async () => {
      vi.mocked(mockApi.delete).mockRejectedValueOnce({
        response: { status: 422, data: { message: 'Only pending requests can be deleted' } },
      });

      const store = useAbsencesStore();

      expect(await store.cancelRequest('req-1')).toBe(false);
      expect(mockApi.get).not.toHaveBeenCalled();
    });
  });

  describe('whole-request review', () => {
    it('approves a request without periods through /requests/approve', async () => {
      vi.mocked(mockApi.post).mockResolvedValueOnce({ data: { success: true } });
      vi.mocked(mockApi.get).mockResolvedValueOnce({ data: { success: true, data: [] } });

      const store = useAbsencesStore();
      const result = await store.approveRequest('req-1');

      expect(result).toBe(true);
      expect(mockApi.post).toHaveBeenCalledWith('/requests/approve', { request_id: 'req-1' });
      expect(mockApi.get).toHaveBeenCalledWith('/requests/pending');
    });

    it('rejects a request without periods with request_id and rejection_reason', async () => {
      vi.mocked(mockApi.post).mockResolvedValueOnce({ data: { success: true } });
      vi.mocked(mockApi.get).mockResolvedValueOnce({ data: { success: true, data: [] } });

      const store = useAbsencesStore();
      await store.rejectRequest('req-1', 'No cover');

      expect(mockApi.post).toHaveBeenCalledWith('/requests/reject', {
        request_id: 'req-1',
        rejection_reason: 'No cover',
      });
    });

    it('refreshes the list without the page-wide loading flag', async () => {
      let loadingDuringRefetch: boolean | null = null;
      const store = useAbsencesStore();
      vi.mocked(mockApi.post).mockResolvedValueOnce({ data: { success: true } });
      vi.mocked(mockApi.get).mockImplementationOnce(async () => {
        loadingDuringRefetch = store.loading;
        return { data: { success: true, data: [] } };
      });

      await store.approveAllPeriods('req-1');

      expect(loadingDuringRefetch).toBe(false);
    });
  });

  describe('fetchTeamReviewedRequests', () => {
    it('merges approved and rejected requests, newest review first', async () => {
      vi.mocked(mockApi.get).mockImplementation(async (_url: string, config?: any) => ({
        data: {
          success: true,
          data:
            config?.params?.status === 'approved'
              ? [{ id: 'approved-1', status: 'approved', reviewedAt: '2026-11-01T10:00:00Z' }]
              : [{ id: 'rejected-1', status: 'rejected', reviewedAt: '2026-11-05T10:00:00Z' }],
        },
      }));

      const store = useAbsencesStore();
      await store.fetchTeamReviewedRequests();

      expect(mockApi.get).toHaveBeenCalledWith('/requests', { params: { status: 'approved' } });
      expect(mockApi.get).toHaveBeenCalledWith('/requests', { params: { status: 'rejected' } });
      expect(store.teamReviewedRequests.map((request) => request.id)).toEqual([
        'rejected-1',
        'approved-1',
      ]);
    });
  });
});
