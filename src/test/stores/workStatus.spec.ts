import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useWorkStatusStore } from '@/stores/workStatus';
import { getCurrentPosition, isGeolocationAvailable } from '@/utils/geolocation';
import { mockApi } from '../mocks/api';

// Mock de vue-toastification
vi.mock('vue-toastification', () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  }),
}));

// Mock del auth store
vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({
    user: {
      id: 'user-123',
      employeeRecords: [{ id: 'employee-123' }],
    },
  }),
}));

// Mock de geolocation utils
vi.mock('@/utils/geolocation', () => ({
  getCurrentPosition: vi.fn().mockResolvedValue({
    latitude: 40.416775,
    longitude: -3.703790,
    accuracy: 10,
    timestamp: Date.now(),
  }),
  getAddressFromCoords: vi.fn().mockResolvedValue('Test Address'),
  formatCoordinates: vi.fn().mockReturnValue('40.416775, -3.703790 (±10m)'),
  isGeolocationAvailable: vi.fn().mockReturnValue(true),
}));

describe('workStatus Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const store = useWorkStatusStore();

      expect(store.status).toBeNull();
      expect(store.loading).toBe(false);
      expect(store.checkingIn).toBe(false);
      expect(store.checkingOut).toBe(false);
      expect(store.currentState).toBe('not_working');
      expect(store.lastCategory).toBeNull();
    });

    it('should have correct computed properties', () => {
      const store = useWorkStatusStore();

      expect(store.isCheckedIn).toBe(false);
      expect(store.canStartShift).toBe(true);
      expect(store.canEndShift).toBe(false);
      expect(store.canStartBreak).toBe(false);
      expect(store.canEndBreak).toBe(false);
      expect(store.canStartOffsite).toBe(false);
      expect(store.canEndOffsite).toBe(false);
    });
  });

  describe('fetchStatus', () => {
    it('should fetch and update status correctly when checked in', async () => {
      const mockResponse = {
        data: {
          status: 'in',
          category: 'shift_start',
          last_activity: { time: '2025-01-15T09:00:00' },
        },
      };
      vi.mocked(mockApi.get).mockResolvedValueOnce(mockResponse);

      const store = useWorkStatusStore();
      await store.fetchStatus();

      expect(mockApi.get).toHaveBeenCalledWith('/worklogs/status/employee-123');
      expect(store.status?.checked_in).toBe(true);
      expect(store.currentState).toBe('working');
    });

    it('should update state to on_break when category is break_start', async () => {
      const mockResponse = {
        data: {
          status: 'in',
          category: 'break_start',
          last_activity: { time: '2025-01-15T12:00:00' },
        },
      };
      vi.mocked(mockApi.get).mockResolvedValueOnce(mockResponse);

      const store = useWorkStatusStore();
      await store.fetchStatus();

      expect(store.currentState).toBe('on_break');
    });

    it('should update state to offsite when category is offsite_start', async () => {
      const mockResponse = {
        data: {
          status: 'in',
          category: 'offsite_start',
          last_activity: { time: '2025-01-15T14:00:00' },
        },
      };
      vi.mocked(mockApi.get).mockResolvedValueOnce(mockResponse);

      const store = useWorkStatusStore();
      await store.fetchStatus();

      expect(store.currentState).toBe('offsite');
    });
  });

  describe('checkIn', () => {
    it('should call API with correct category', async () => {
      vi.mocked(mockApi.post).mockResolvedValueOnce({ data: { success: true } });
      vi.mocked(mockApi.get).mockResolvedValueOnce({
        data: { status: 'in', category: 'shift_start' },
      });

      const store = useWorkStatusStore();
      await store.checkIn('shift_start');

      expect(mockApi.post).toHaveBeenCalledWith('/worklogs/check-in', expect.objectContaining({
        employee_id: 'employee-123',
        category: 'shift_start',
      }));
    });

    it('records an error when the browser has no geolocation and the company requires it', async () => {
      // The bug this covers: getCurrentLocation() returned null without a word, checkIn()
      // aborted, and the user saw absolutely nothing happen when pressing the button.
      vi.mocked(isGeolocationAvailable).mockReturnValueOnce(false);

      const store = useWorkStatusStore();
      store.companySettings = { geolocationEnabled: true, geolocationRequired: true };

      const result = await store.checkIn('shift_start');

      expect(result).toBe(false);
      expect(mockApi.post).not.toHaveBeenCalled();
      expect(store.locationError).not.toBeNull();
      expect(store.locationError?.messageKey).toBe('geolocation.errors.notSupported');
    });

    it('records a translatable reason when the position cannot be obtained', async () => {
      vi.mocked(getCurrentPosition).mockRejectedValueOnce({
        code: 1,
        messageKey: 'geolocation.errors.permissionDenied',
        message: 'denied',
      });

      const store = useWorkStatusStore();
      store.companySettings = { geolocationEnabled: true, geolocationRequired: true };

      const result = await store.checkIn('shift_start');

      expect(result).toBe(false);
      expect(mockApi.post).not.toHaveBeenCalled();
      expect(store.locationError?.messageKey).toBe('geolocation.errors.permissionDenied');
    });

    it('retryLocation clears the previous error and asks again', async () => {
      const store = useWorkStatusStore();
      store.companySettings = { geolocationEnabled: true, geolocationRequired: true };
      store.locationError = { code: 3, messageKey: 'geolocation.errors.timeout', message: 'timeout' };

      const location = await store.retryLocation();

      expect(location).not.toBeNull();
      expect(store.locationError).toBeNull();
    });
  });

  describe('checkOut', () => {
    it('should call API with correct category', async () => {
      vi.mocked(mockApi.post).mockResolvedValueOnce({ data: { success: true } });
      vi.mocked(mockApi.get).mockResolvedValueOnce({
        data: { status: 'out', category: 'shift_end' },
      });

      const store = useWorkStatusStore();
      await store.checkOut('shift_end');

      expect(mockApi.post).toHaveBeenCalledWith('/worklogs/check-out', expect.objectContaining({
        employee_id: 'employee-123',
        category: 'shift_end',
      }));
    });
  });

  describe('Break actions', () => {
    it('startBreak should call checkOut with break_start', async () => {
      vi.mocked(mockApi.post).mockResolvedValueOnce({ data: { success: true } });
      vi.mocked(mockApi.get).mockResolvedValueOnce({
        data: { status: 'in', category: 'break_start' },
      });

      const store = useWorkStatusStore();
      await store.startBreak();

      expect(mockApi.post).toHaveBeenCalledWith('/worklogs/check-out', expect.objectContaining({
        category: 'break_start',
      }));
    });

    it('endBreak should call checkIn with break_end', async () => {
      vi.mocked(mockApi.post).mockResolvedValueOnce({ data: { success: true } });
      vi.mocked(mockApi.get).mockResolvedValueOnce({
        data: { status: 'in', category: 'break_end' },
      });

      const store = useWorkStatusStore();
      await store.endBreak();

      expect(mockApi.post).toHaveBeenCalledWith('/worklogs/check-in', expect.objectContaining({
        category: 'break_end',
      }));
    });
  });

  describe('Offsite actions', () => {
    it('startOffsite should call checkOut with offsite_start', async () => {
      vi.mocked(mockApi.post).mockResolvedValueOnce({ data: { success: true } });
      vi.mocked(mockApi.get).mockResolvedValueOnce({
        data: { status: 'in', category: 'offsite_start' },
      });

      const store = useWorkStatusStore();
      await store.startOffsite();

      expect(mockApi.post).toHaveBeenCalledWith('/worklogs/check-out', expect.objectContaining({
        category: 'offsite_start',
      }));
    });

    it('endOffsite should call checkIn with offsite_end', async () => {
      vi.mocked(mockApi.post).mockResolvedValueOnce({ data: { success: true } });
      vi.mocked(mockApi.get).mockResolvedValueOnce({
        data: { status: 'in', category: 'offsite_end' },
      });

      const store = useWorkStatusStore();
      await store.endOffsite();

      expect(mockApi.post).toHaveBeenCalledWith('/worklogs/check-in', expect.objectContaining({
        category: 'offsite_end',
      }));
    });
  });

  describe('State labels and colors', () => {
    it('should return correct label for each state', () => {
      const store = useWorkStatusStore();

      expect(store.stateLabel).toBe('Not Working');

      store.currentState = 'working';
      expect(store.stateLabel).toBe('Working');

      store.currentState = 'on_break';
      expect(store.stateLabel).toBe('On Break');

      store.currentState = 'offsite';
      expect(store.stateLabel).toBe('Offsite');
    });

    it('should return correct color for each state', () => {
      const store = useWorkStatusStore();

      expect(store.stateColor).toBe('gray');

      store.currentState = 'working';
      expect(store.stateColor).toBe('green');

      store.currentState = 'on_break';
      expect(store.stateColor).toBe('amber');

      store.currentState = 'offsite';
      expect(store.stateColor).toBe('blue');
    });
  });
});
