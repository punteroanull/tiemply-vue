import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useIncidentsStore } from '@/stores/incidents';
import { mockApi } from '../mocks/api';

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({
    currentEmployee: { id: 'employee-123' },
  }),
}));

// What Laravel's paginate(20) looks like after the response interceptor camel-cases it.
function paginated(rows: unknown[], total = rows.length, currentPage = 1, lastPage = 1) {
  return {
    data: {
      success: true,
      data: { currentPage, lastPage, perPage: 20, total, data: rows },
    },
  };
}

const incident = (id: string, status = 'pending') => ({
  id,
  date: '2026-11-22T23:00:00.000000Z',
  type: 'late_arrival',
  status,
});

describe('incidents Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('reads the rows out of a paginated response', async () => {
    mockApi.get
      .mockResolvedValueOnce(paginated([incident('a', 'resolved'), incident('b')], 2))
      .mockResolvedValueOnce(paginated([incident('b')], 1));

    const store = useIncidentsStore();
    await store.fetchIncidents();

    expect(store.incidents.map((i) => i.id)).toEqual(['a', 'b']);
    expect(store.error).toBe(false);
    expect(store.totalIncidents).toBe(2);
  });

  it('still accepts a bare array', async () => {
    mockApi.get.mockResolvedValue({ data: { success: true, data: [incident('a')] } });

    const store = useIncidentsStore();
    await store.fetchIncidents();

    expect(store.incidents).toHaveLength(1);
  });

  it('counts pending incidents across pages from the same request when filtering by pending', async () => {
    mockApi.get.mockResolvedValueOnce(paginated([incident('a')], 37, 1, 2));

    const store = useIncidentsStore();
    await store.fetchIncidents({ status: 'pending' });

    expect(mockApi.get).toHaveBeenCalledTimes(1);
    expect(store.pendingCount).toBe(37);
    expect(store.hasPendingIncidents).toBe(true);
    expect(store.totalPages).toBe(2);
  });

  it('keeps the pending count when the list is filtered by another status', async () => {
    mockApi.get
      .mockResolvedValueOnce(paginated([incident('a', 'resolved')], 1))
      .mockResolvedValueOnce(paginated([incident('p1'), incident('p2')], 2));

    const store = useIncidentsStore();
    await store.fetchIncidents({ status: 'resolved' });

    expect(store.incidents).toHaveLength(1);
    expect(store.pendingCount).toBe(2);
    expect(mockApi.get.mock.calls[1][0]).toContain('status=pending');
  });

  it('sends the employee, filters and page', async () => {
    mockApi.get.mockResolvedValue(paginated([]));

    const store = useIncidentsStore();
    await store.fetchIncidents({ type: 'manual_adjustment', status: 'validated', page: 3 });

    const url = mockApi.get.mock.calls[0][0] as string;
    expect(url).toContain('employee_id=employee-123');
    expect(url).toContain('type=manual_adjustment');
    expect(url).toContain('status=validated');
    expect(url).toContain('page=3');
  });

  it('flags a failed fetch instead of looking empty', async () => {
    mockApi.get.mockRejectedValue(new Error('Network error'));

    const store = useIncidentsStore();
    await store.fetchIncidents();

    expect(store.incidents).toEqual([]);
    expect(store.error).toBe(true);
    expect(store.loading).toBe(false);
  });
});
