import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  savePendingAction,
  getPendingActions,
  clearPendingActions,
  syncPendingActions,
} from '@/utils/offlineManager';

const toast = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
  warning: vi.fn(),
  info: vi.fn(),
}));

vi.mock('vue-toastification', () => ({
  useToast: () => toast,
}));

// The store is replaced by the three things the queue needs from it.
const store = vi.hoisted(() => ({
  employeeId: 'emp-1' as string | null,
  submitQueuedAction: vi.fn(),
  refreshPendingCount: vi.fn(),
  fetchStatus: vi.fn().mockResolvedValue(true),
  getEmployeeId() {
    return this.employeeId;
  },
}));

vi.mock('@/stores/workStatus', () => ({
  useWorkStatusStore: () => store,
}));

function queue(category: string, employeeId = 'emp-1', timestamp = Date.now()) {
  savePendingAction({
    type: category.endsWith('_start') && category !== 'shift_start' ? 'check-out' : 'check-in',
    timestamp,
    employeeId,
    data: { category, notes: `note for ${category}` },
  });
}

describe('offlineManager', () => {
  beforeEach(() => {
    clearPendingActions();
    store.employeeId = 'emp-1';
    store.submitQueuedAction.mockReset();
    store.fetchStatus.mockClear();
    Object.defineProperty(global.navigator, 'onLine', {
      value: true,
      writable: true,
      configurable: true,
    });
  });

  it('removes an entry once the server has accepted it', async () => {
    queue('shift_start', 'emp-1', 1_700_000_000_000);
    store.submitQueuedAction.mockResolvedValueOnce({ ok: true });

    const summary = await syncPendingActions();

    // The moment the person acted goes along, so the entry is dated then and not now.
    expect(store.submitQueuedAction).toHaveBeenCalledWith(
      'shift_start',
      'note for shift_start',
      1_700_000_000_000
    );
    expect(summary).toEqual({ synced: 1, rejected: 0, remaining: 0 });
    expect(getPendingActions()).toHaveLength(0);
  });

  it('keeps an entry that could not be sent, instead of counting it as synced', async () => {
    // The original bug: checkIn() returns false rather than throwing, and the queue
    // deleted the entry regardless.
    queue('shift_start');
    store.submitQueuedAction.mockResolvedValueOnce({ ok: false, reason: 'network' });

    const summary = await syncPendingActions();

    expect(summary).toEqual({ synced: 0, rejected: 0, remaining: 1 });
    expect(getPendingActions()).toHaveLength(1);
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('stops at the first entry that cannot be sent so the order is kept', async () => {
    queue('shift_start', 'emp-1', 1000);
    queue('break_start', 'emp-1', 2000);
    store.submitQueuedAction.mockResolvedValueOnce({ ok: false, reason: 'network' });

    await syncPendingActions();

    expect(store.submitQueuedAction).toHaveBeenCalledTimes(1);
    expect(getPendingActions().map((action) => action.data.category)).toEqual([
      'shift_start',
      'break_start',
    ]);
  });

  it('drops an entry the server rejects and tells the user why', async () => {
    queue('shift_start');
    store.submitQueuedAction.mockResolvedValueOnce({
      ok: false,
      reason: 'rejected',
      message: 'Outside the allowed area',
    });

    const summary = await syncPendingActions();

    expect(summary).toEqual({ synced: 0, rejected: 1, remaining: 0 });
    expect(getPendingActions()).toHaveLength(0);
    expect(toast.error).toHaveBeenCalledWith(
      expect.stringContaining('Outside the allowed area'),
      expect.anything()
    );
  });

  it('only sends the entries of the employee who is signed in', async () => {
    queue('shift_start', 'emp-1');
    queue('shift_start', 'emp-2');
    store.submitQueuedAction.mockResolvedValue({ ok: true });

    await syncPendingActions();

    expect(store.submitQueuedAction).toHaveBeenCalledTimes(1);
    expect(getPendingActions('emp-1')).toHaveLength(0);
    // The other person's entry waits for them to sign in again.
    expect(getPendingActions('emp-2')).toHaveLength(1);
  });

  it('does nothing while nobody is signed in', async () => {
    queue('shift_start');
    store.employeeId = null;

    await syncPendingActions();

    expect(store.submitQueuedAction).not.toHaveBeenCalled();
    expect(getPendingActions()).toHaveLength(1);
  });

  it('does not send the same entry twice when two syncs overlap', async () => {
    queue('shift_start');
    let release: (value: unknown) => void = () => undefined;
    store.submitQueuedAction.mockReturnValueOnce(
      new Promise((resolve) => {
        release = resolve;
      })
    );

    const first = syncPendingActions();
    const second = syncPendingActions();
    release({ ok: true });
    await Promise.all([first, second]);

    expect(store.submitQueuedAction).toHaveBeenCalledTimes(1);
  });

  it('keeps an entry queued while a sync is running', async () => {
    queue('shift_start', 'emp-1', 1000);
    store.submitQueuedAction.mockImplementationOnce(async () => {
      queue('break_start', 'emp-1', 2000);
      return { ok: true };
    });
    store.submitQueuedAction.mockResolvedValueOnce({ ok: false, reason: 'network' });

    await syncPendingActions();

    expect(getPendingActions().map((action) => action.data.category)).toEqual(['break_start']);
  });

  it('survives a corrupted queue in storage', () => {
    localStorage.setItem('tiemply_pending_actions', '{not json');

    expect(getPendingActions()).toEqual([]);
  });
});
