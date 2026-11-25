import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useWorkStatusStore } from '@/stores/workStatus';
import { getCurrentPosition, isGeolocationAvailable } from '@/utils/geolocation';
import { getPendingActions } from '@/utils/offlineManager';
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

// Mock del auth store. `currentEmployee` is what the stores read; it is mutable so a test
// can turn the employee into a remote worker.
const authState = vi.hoisted(() => ({
  user: { id: 'user-123', employeeRecords: [{ id: 'employee-123' }] },
  currentEmployee: { id: 'employee-123', isRemoteWorker: false } as Record<string, unknown>,
}));

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => authState,
}));

// Mock de geolocation utils
vi.mock('@/utils/geolocation', () => ({
  getCurrentPosition: vi.fn().mockResolvedValue({
    latitude: 40.416775,
    longitude: -3.703790,
    accuracy: 10,
    timestamp: Date.now(),
  }),
  formatCoordinates: vi.fn().mockReturnValue('40.416775, -3.703790 (±10m)'),
  isGeolocationAvailable: vi.fn().mockReturnValue(true),
}));

function setOnline(value: boolean) {
  Object.defineProperty(global.navigator, 'onLine', {
    value,
    writable: true,
    configurable: true,
  });
}

/** A store whose company does not use geolocation, the common case in these tests. */
function storeWithoutGeolocation() {
  const store = useWorkStatusStore();
  store.companySettings = { geolocationEnabled: false };
  return store;
}

describe('workStatus Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    mockApi.get.mockReset();
    mockApi.post.mockReset();
    authState.currentEmployee = { id: 'employee-123', isRemoteWorker: false };
    setOnline(true);
  });

  afterEach(() => {
    // Stops the refresh and elapsed-time timers a running shift starts.
    useWorkStatusStore().reset();
    setOnline(true);
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
      mockApi.get.mockResolvedValueOnce({
        data: {
          status: 'in',
          category: 'shift_start',
          lastActivity: { time: '2025-01-15T09:00:00' },
        },
      });

      const store = useWorkStatusStore();
      await store.fetchStatus();

      expect(mockApi.get).toHaveBeenCalledWith('/worklogs/status/employee-123');
      expect(store.status?.checkedIn).toBe(true);
      expect(store.currentState).toBe('working');
    });

    it('should update state to on_break when category is break_start', async () => {
      mockApi.get.mockResolvedValueOnce({
        data: {
          status: 'out',
          category: 'break_start',
          lastActivity: { time: '2025-01-15T12:00:00' },
        },
      });

      const store = useWorkStatusStore();
      await store.fetchStatus();

      expect(store.currentState).toBe('on_break');
    });

    it('should update state to offsite when category is offsite_start', async () => {
      mockApi.get.mockResolvedValueOnce({
        data: {
          status: 'out',
          category: 'offsite_start',
          lastActivity: { time: '2025-01-15T14:00:00' },
        },
      });

      const store = useWorkStatusStore();
      await store.fetchStatus();

      expect(store.currentState).toBe('offsite');
    });

    it('keeps showing the start of the shift after coming back from a break', async () => {
      // The latest entry is the return from the break; "working since" must still be the
      // moment the shift started, not that return.
      const shiftStart = new Date(2025, 0, 15, 8, 0, 0);
      const backFromBreak = new Date(2025, 0, 15, 11, 15, 0);
      mockApi.get.mockResolvedValueOnce({
        data: {
          status: 'in',
          category: 'break_end',
          lastActivity: { time: backFromBreak.toISOString() },
          shiftStartedAt: shiftStart.toISOString(),
        },
      });

      const store = useWorkStatusStore();
      await store.fetchStatus();

      expect(store.currentState).toBe('working');
      expect(store.formattedLastCheckIn).toBe('08:00');
    });

    it('runs a timer while on a break', async () => {
      const breakStart = new Date(Date.now() - 20 * 60000);
      mockApi.get.mockResolvedValueOnce({
        data: {
          status: 'out',
          category: 'break_start',
          lastActivity: { time: breakStart.toISOString() },
        },
      });

      const store = useWorkStatusStore();
      await store.fetchStatus();

      expect(store.formattedCurrentDuration).toBe('0:20');
    });

    it('reports failure without throwing when the request fails', async () => {
      mockApi.get.mockRejectedValueOnce(new Error('Network Error'));

      const store = useWorkStatusStore();
      const ok = await store.fetchStatus({ silent: true });

      expect(ok).toBe(false);
      expect(store.statusError).toBe(true);
      expect(store.loading).toBe(false);
    });
  });

  describe('checkIn', () => {
    it('should call API with correct category', async () => {
      mockApi.post.mockResolvedValueOnce({ data: { success: true } });
      mockApi.get.mockResolvedValueOnce({
        data: { status: 'in', category: 'shift_start' },
      });

      const store = storeWithoutGeolocation();
      const result = await store.checkIn('shift_start');

      expect(result).toBe(true);
      expect(mockApi.post).toHaveBeenCalledWith('/worklogs/check-in', expect.objectContaining({
        employee_id: 'employee-123',
        category: 'shift_start',
      }));
      expect(store.currentState).toBe('working');
    });

    it('stays checked in when the confirming status request fails', async () => {
      // The entry was recorded; a failed refresh must not make it look as if it was not.
      mockApi.post.mockResolvedValueOnce({ data: { success: true } });
      mockApi.get.mockRejectedValueOnce(new Error('Network Error'));

      const store = storeWithoutGeolocation();
      const result = await store.checkIn('shift_start');

      expect(result).toBe(true);
      expect(store.currentState).toBe('working');
    });

    it('sends a single request when the action is triggered twice', async () => {
      let release: (value: unknown) => void = () => undefined;
      mockApi.post.mockReturnValueOnce(new Promise((resolve) => { release = resolve; }));
      mockApi.get.mockResolvedValue({ data: { status: 'in', category: 'shift_start' } });

      const store = storeWithoutGeolocation();
      const first = store.checkIn('shift_start');
      const second = await store.checkIn('shift_start');

      release({ data: { success: true } });

      expect(second).toBe(false);
      expect(await first).toBe(true);
      expect(mockApi.post).toHaveBeenCalledTimes(1);
    });

    it('returns false and keeps the state when the server rejects the entry', async () => {
      mockApi.post.mockRejectedValueOnce({
        response: { status: 422, data: { message: 'Shift already started' } },
      });

      const store = storeWithoutGeolocation();
      const result = await store.checkIn('shift_start');

      expect(result).toBe(false);
      expect(store.currentState).toBe('not_working');
      expect(store.checkingIn).toBe(false);
    });

    it('loads the company settings first when they are not known yet', async () => {
      // Acting before the settings arrive must not skip a required location.
      mockApi.get.mockResolvedValueOnce({
        data: { success: true, data: { geolocationEnabled: true, geolocationRequired: true } },
      });
      vi.mocked(getCurrentPosition).mockRejectedValueOnce({
        code: 1,
        messageKey: 'geolocation.errors.permissionDenied',
        message: 'denied',
      });

      const store = useWorkStatusStore();
      const result = await store.checkIn('shift_start');

      expect(mockApi.get).toHaveBeenCalledWith('/employees/employee-123/company-settings');
      expect(result).toBe(false);
      expect(mockApi.post).not.toHaveBeenCalled();
    });

    it('records an error when the browser has no geolocation and the company requires it', async () => {
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

    it('lets a remote worker clock in without a position even if the company requires one', async () => {
      // The API exempts remote workers from geolocation; the app used to block them anyway.
      authState.currentEmployee = { id: 'employee-123', isRemoteWorker: true };
      vi.mocked(getCurrentPosition).mockRejectedValueOnce({
        code: 1,
        messageKey: 'geolocation.errors.permissionDenied',
        message: 'denied',
      });
      mockApi.post.mockResolvedValueOnce({ data: { success: true } });
      mockApi.get.mockResolvedValueOnce({ data: { status: 'in', category: 'shift_start' } });

      const store = useWorkStatusStore();
      store.companySettings = { geolocationEnabled: true, geolocationRequired: true };

      const result = await store.checkIn('shift_start');

      expect(store.isGeolocationRequired).toBe(false);
      expect(result).toBe(true);
      expect(mockApi.post).toHaveBeenCalledTimes(1);
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
      mockApi.post.mockResolvedValueOnce({ data: { success: true } });
      mockApi.get.mockResolvedValueOnce({
        data: { status: 'out', category: 'shift_end' },
      });

      const store = storeWithoutGeolocation();
      await store.checkOut('shift_end');

      expect(mockApi.post).toHaveBeenCalledWith('/worklogs/check-out', expect.objectContaining({
        employee_id: 'employee-123',
        category: 'shift_end',
      }));
      expect(store.currentState).toBe('not_working');
    });
  });

  describe('Break actions', () => {
    it('startBreak should call checkOut with break_start', async () => {
      mockApi.post.mockResolvedValueOnce({ data: { success: true } });
      mockApi.get.mockResolvedValueOnce({
        data: { status: 'out', category: 'break_start' },
      });

      const store = storeWithoutGeolocation();
      await store.startBreak();

      expect(mockApi.post).toHaveBeenCalledWith('/worklogs/check-out', expect.objectContaining({
        category: 'break_start',
        notes: 'Started break via Tiemply app',
      }));
    });

    it('endBreak should call checkIn with break_end', async () => {
      mockApi.post.mockResolvedValueOnce({ data: { success: true } });
      mockApi.get.mockResolvedValueOnce({
        data: { status: 'in', category: 'break_end' },
      });

      const store = storeWithoutGeolocation();
      await store.endBreak();

      expect(mockApi.post).toHaveBeenCalledWith('/worklogs/check-in', expect.objectContaining({
        category: 'break_end',
      }));
    });
  });

  describe('Offsite actions', () => {
    it('startOffsite should call checkOut with offsite_start', async () => {
      mockApi.post.mockResolvedValueOnce({ data: { success: true } });
      mockApi.get.mockResolvedValueOnce({
        data: { status: 'out', category: 'offsite_start' },
      });

      const store = storeWithoutGeolocation();
      await store.startOffsite();

      expect(mockApi.post).toHaveBeenCalledWith('/worklogs/check-out', expect.objectContaining({
        category: 'offsite_start',
      }));
    });

    it('endOffsite should call checkIn with offsite_end', async () => {
      mockApi.post.mockResolvedValueOnce({ data: { success: true } });
      mockApi.get.mockResolvedValueOnce({
        data: { status: 'in', category: 'offsite_end' },
      });

      const store = storeWithoutGeolocation();
      await store.endOffsite();

      expect(mockApi.post).toHaveBeenCalledWith('/worklogs/check-in', expect.objectContaining({
        category: 'offsite_end',
      }));
    });

    it('dates an entry replayed from the offline queue at the moment it was made', async () => {
      mockApi.post.mockResolvedValueOnce({ data: { success: true } });
      mockApi.get.mockResolvedValueOnce({ data: { status: 'in', category: 'shift_start' } });

      const store = storeWithoutGeolocation();
      const result = await store.submitQueuedAction('shift_start', 'note', 1_700_000_000_000);

      expect(result.ok).toBe(true);
      expect(mockApi.post).toHaveBeenCalledWith('/worklogs/check-in', expect.objectContaining({
        occurred_at: '2023-11-14T22:13:20.000Z',
      }));
    });

    it('sends no occurred_at for an entry made online', async () => {
      mockApi.post.mockResolvedValueOnce({ data: { success: true } });
      mockApi.get.mockResolvedValueOnce({ data: { status: 'in', category: 'shift_start' } });

      const store = storeWithoutGeolocation();
      await store.checkIn();

      expect(mockApi.post.mock.calls[0][1]).not.toHaveProperty('occurred_at');
    });

    it('keeps a queued entry for later when another one is still being recorded (409)', async () => {
      mockApi.post.mockRejectedValueOnce({ response: { status: 409, data: { message: 'Busy' } } });

      const store = storeWithoutGeolocation();
      const result = await store.submitQueuedAction('shift_start', 'note', 1_700_000_000_000);

      expect(result).toEqual({ ok: false, reason: 'network', message: 'Busy' });
    });
  });

  describe('requestAction', () => {
    it('asks for confirmation before ending the shift', async () => {
      const store = storeWithoutGeolocation();
      store.currentState = 'working';

      await store.requestAction('shift_end');

      expect(store.confirmingEndShift).toBe(true);
      expect(mockApi.post).not.toHaveBeenCalled();

      mockApi.post.mockResolvedValueOnce({ data: { success: true } });
      mockApi.get.mockResolvedValueOnce({ data: { status: 'out', category: 'shift_end' } });

      await store.confirmEndShift();

      expect(store.confirmingEndShift).toBe(false);
      expect(mockApi.post).toHaveBeenCalledWith('/worklogs/check-out', expect.objectContaining({
        category: 'shift_end',
      }));
    });

    it('runs every other action straight away', async () => {
      mockApi.post.mockResolvedValueOnce({ data: { success: true } });
      mockApi.get.mockResolvedValueOnce({ data: { status: 'in', category: 'shift_start' } });

      const store = storeWithoutGeolocation();
      await store.requestAction('shift_start');

      expect(store.confirmingEndShift).toBe(false);
      expect(mockApi.post).toHaveBeenCalledTimes(1);
    });

    it('queues the action for the current employee when there is no connection', async () => {
      setOnline(false);

      const store = storeWithoutGeolocation();
      const result = await store.requestAction('shift_start');

      expect(result).toBe(true);
      expect(mockApi.post).not.toHaveBeenCalled();
      expect(store.currentState).toBe('working');
      expect(store.pendingCount).toBe(1);

      const queued = getPendingActions('employee-123');
      expect(queued).toHaveLength(1);
      expect(queued[0]).toEqual(expect.objectContaining({
        type: 'check-in',
        employeeId: 'employee-123',
        data: expect.objectContaining({ category: 'shift_start' }),
      }));
    });

    it('restores the queued state after a reload without connection', async () => {
      setOnline(false);
      storeWithoutGeolocation().requestAction('shift_start');

      // A fresh store, as after reloading the page, with the status request failing.
      setActivePinia(createPinia());
      mockApi.get.mockRejectedValueOnce(new Error('Network Error'));

      const store = useWorkStatusStore();
      await store.fetchStatus({ silent: true });

      expect(store.currentState).toBe('working');
      expect(store.pendingCount).toBe(1);
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
