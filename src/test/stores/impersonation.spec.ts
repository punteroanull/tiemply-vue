import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useAuthStore } from '@/stores/auth';
import { mockApi } from '../mocks/api';

vi.mock('vue-toastification', () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  }),
}));

const resetAllStores = vi.fn();
vi.mock('@/stores/reset', () => ({
  resetAllStores: (...args: unknown[]) => resetAllStores(...args),
}));

const IMPERSONATION = {
  sessionId: 'session-1',
  impersonatorName: 'Admin Person',
  impersonatorEmail: 'admin@example.com',
  impersonatedName: 'Claudia',
  impersonatedEmail: 'claudia@example.com',
  writesEnabled: false,
  expiresAt: '2026-09-21T12:30:00Z',
  returnUrl: 'https://admin.example.com/admin',
};

describe('impersonation in the auth store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    localStorage.clear();
  });

  function mockRedeem(overrides: Record<string, unknown> = {}) {
    vi.mocked(mockApi.post).mockResolvedValueOnce({
      data: {
        data: {
          token: 'impersonated-token',
          impersonation: { ...IMPERSONATION, ...overrides },
          user: { id: 'u2', name: 'Claudia' },
        },
      },
    });
    vi.mocked(mockApi.get).mockResolvedValueOnce({
      data: { data: { id: 'u2', name: 'Claudia', impersonation: { ...IMPERSONATION, ...overrides } } },
    });
  }

  it('parks the original token and activates the impersonated one', async () => {
    localStorage.setItem('token', 'admin-token');
    const store = useAuthStore();
    store.token = 'admin-token';

    mockRedeem();
    await store.redeemImpersonation('a'.repeat(64));

    expect(localStorage.getItem('token')).toBe('impersonated-token');
    expect(localStorage.getItem('token_original')).toBe('admin-token');
    expect(localStorage.getItem('impersonating')).toBe('1');
    expect(store.isImpersonating).toBe(true);
    expect(store.impersonation?.impersonatedName).toBe('Claudia');
  });

  it('parks nothing when the administrator had no session in this browser', async () => {
    const store = useAuthStore();
    store.token = null;

    mockRedeem();
    await store.redeemImpersonation('a'.repeat(64));

    expect(localStorage.getItem('token_original')).toBeNull();
    expect(store.isImpersonating).toBe(true);
  });

  it('resets the cached stores when the identity changes', async () => {
    const store = useAuthStore();

    mockRedeem();
    await store.redeemImpersonation('a'.repeat(64));

    expect(resetAllStores).toHaveBeenCalled();
  });

  it('reports the write mode from the session', async () => {
    const store = useAuthStore();

    mockRedeem({ writesEnabled: true });
    await store.redeemImpersonation('a'.repeat(64));

    expect(store.canWriteWhileImpersonating).toBe(true);
  });

  it('restores the original token when the impersonation stops', async () => {
    localStorage.setItem('token', 'admin-token');
    const store = useAuthStore();
    store.token = 'admin-token';

    mockRedeem();
    await store.redeemImpersonation('a'.repeat(64));

    vi.mocked(mockApi.post).mockResolvedValueOnce({ data: { data: { return_url: 'x' } } });
    vi.mocked(mockApi.get).mockResolvedValueOnce({ data: { data: { id: 'u1', name: 'Admin Person' } } });

    await store.stopImpersonation();

    expect(localStorage.getItem('token')).toBe('admin-token');
    expect(localStorage.getItem('token_original')).toBeNull();
    expect(localStorage.getItem('impersonating')).toBeNull();
    expect(store.isImpersonating).toBe(false);
  });

  it('keeps the impersonation context across a reload, from /me', async () => {
    const store = useAuthStore();
    store.token = 'impersonated-token';

    vi.mocked(mockApi.get).mockResolvedValueOnce({
      data: { data: { id: 'u2', name: 'Claudia', impersonation: IMPERSONATION } },
    });

    await store.fetchCurrentUser();

    expect(store.isImpersonating).toBe(true);
    expect(store.impersonation?.impersonatorName).toBe('Admin Person');
    expect(localStorage.getItem('impersonating')).toBe('1');
  });

  it('clears the context when /me reports no impersonation', async () => {
    const store = useAuthStore();
    store.token = 'plain-token';
    localStorage.setItem('impersonating', '1');

    vi.mocked(mockApi.get).mockResolvedValueOnce({
      data: { data: { id: 'u1', name: 'Someone', impersonation: null } },
    });

    await store.fetchCurrentUser();

    expect(store.isImpersonating).toBe(false);
    expect(localStorage.getItem('impersonating')).toBeNull();
  });

  it('logout clears the parked administrator token as well', async () => {
    const store = useAuthStore();
    store.token = 'impersonated-token';
    localStorage.setItem('token', 'impersonated-token');
    localStorage.setItem('token_original', 'admin-token');
    localStorage.setItem('impersonating', '1');

    vi.mocked(mockApi.post).mockResolvedValueOnce({ data: { success: true } });

    await store.logout();

    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('token_original')).toBeNull();
    expect(localStorage.getItem('impersonating')).toBeNull();
    expect(store.isImpersonating).toBe(false);
  });
});
