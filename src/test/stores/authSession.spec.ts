import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useAuthStore } from '@/stores/auth';
import i18n, { setAppLocale } from '@/i18n';
import { mockApi } from '../mocks/api';

const resetAllStores = vi.fn();
vi.mock('@/stores/reset', () => ({
  resetAllStores: (...args: unknown[]) => resetAllStores(...args),
}));

const rejection = (status?: number) =>
  status ? { response: { status, data: {} } } : new Error('Network Error');

describe('auth store: session handling', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    vi.mocked(mockApi.get).mockReset();
    vi.mocked(mockApi.post).mockReset();
    vi.mocked(mockApi.put).mockReset();
    localStorage.clear();
    setAppLocale('en');
  });

  describe('own account', () => {
    const ana = {
      id: 'u1',
      name: 'Ana',
      email: 'ana@example.com',
      phone: '600000000',
      employeeRecords: [
        { id: 'e1', companyId: 'c1', userId: 'u1', remainingVacationDays: 3, active: true },
      ],
    };

    it('saves the contact details and keeps the relations /me loaded', async () => {
      const store = useAuthStore();
      store.user = { ...ana };
      // The API answers with the bare user.
      vi.mocked(mockApi.put).mockResolvedValueOnce({
        data: { success: true, data: { id: 'u1', name: 'Ana Ruiz', phone: null, address: 'Calle 1' } },
      });

      const result = await store.updateProfile({ name: 'Ana Ruiz', phone: null, address: 'Calle 1' });

      expect(result.ok).toBe(true);
      expect(mockApi.put).toHaveBeenCalledWith('/me', {
        name: 'Ana Ruiz',
        phone: null,
        address: 'Calle 1',
      });
      expect(store.user?.name).toBe('Ana Ruiz');
      expect(store.user?.phone).toBeUndefined();
      expect(store.user?.address).toBe('Calle 1');
      expect(store.currentEmployeeId).toBe('e1');
    });

    it('hands back the field errors of a rejected password change', async () => {
      const store = useAuthStore();
      vi.mocked(mockApi.put).mockRejectedValueOnce({
        response: {
          status: 422,
          data: { message: 'Invalid', errors: { current_password: ['The password is incorrect.'] } },
        },
      });

      const result = await store.changePassword({
        current_password: 'wrong',
        password: 'new-password',
        password_confirmation: 'new-password',
      });

      expect(mockApi.put).toHaveBeenCalledWith('/me/password', expect.any(Object));
      expect(result.ok).toBe(false);
      expect(result.fieldErrors).toEqual({ current_password: 'The password is incorrect.' });
    });

    it('requests a reset link and sets a new password with the token of the email', async () => {
      const store = useAuthStore();
      vi.mocked(mockApi.post).mockResolvedValue({ data: { success: true } });

      expect((await store.requestPasswordReset('ana@example.com')).ok).toBe(true);
      expect(mockApi.post).toHaveBeenCalledWith('/password/forgot', { email: 'ana@example.com' });

      const form = {
        token: 'tok',
        email: 'ana@example.com',
        password: 'new-password',
        password_confirmation: 'new-password',
      };
      expect((await store.resetPassword(form)).ok).toBe(true);
      expect(mockApi.post).toHaveBeenCalledWith('/password/reset', form);
    });

    it('reports an expired reset link as a token error', async () => {
      const store = useAuthStore();
      vi.mocked(mockApi.post).mockRejectedValueOnce({
        response: { status: 422, data: { message: 'Expired', errors: { token: ['Expired'] } } },
      });

      const result = await store.resetPassword({
        token: 'old',
        email: 'ana@example.com',
        password: 'new-password',
        password_confirmation: 'new-password',
      });

      expect(result.fieldErrors?.token).toBe('Expired');
    });
  });

  describe('plan features and supervised departments', () => {
    const withCompany = (company: Record<string, unknown>, extra: Record<string, unknown> = {}) => ({
      id: 'u1',
      name: 'Ana',
      email: 'ana@example.com',
      employeeRecords: [
        {
          id: 'e1',
          companyId: 'c1',
          departmentId: 'd1',
          userId: 'u1',
          remainingVacationDays: 0,
          active: true,
          company: { id: 'c1', name: 'Acme', ...company },
          department: { id: 'd1', companyId: 'c1', name: 'Sales', supervisorId: 'other' },
        },
      ],
      ...extra,
    });

    it('reads the features of the company plan', () => {
      const store = useAuthStore();
      store.user = withCompany({ features: ['overtime'] }) as any;

      expect(store.hasFeature('overtime')).toBe(true);
      expect(store.hasFeature('employee_schedules')).toBe(false);
    });

    it('hides nothing when the API does not list the features', () => {
      const store = useAuthStore();
      store.user = withCompany({}) as any;

      expect(store.hasFeature('export_reports')).toBe(true);
    });

    it('counts a department the person supervises without belonging to it', () => {
      const store = useAuthStore();
      store.user = withCompany({}, {
        supervisedDepartments: [{ id: 'd2', name: 'Support', companyId: 'c1' }],
      }) as any;

      expect(store.isSupervisor).toBe(false);
      expect(store.supervisesAnyDepartment).toBe(true);
    });

    it('ignores departments supervised in another company', () => {
      const store = useAuthStore();
      store.user = withCompany({}, {
        supervisedDepartments: [{ id: 'd9', name: 'Other', companyId: 'c2' }],
      }) as any;

      expect(store.supervisesAnyDepartment).toBe(false);
    });
  });

  describe('loading the signed-in user', () => {
    it('flags a failure that is not about the token and keeps the session', async () => {
      localStorage.setItem('token', 'good-token');
      const store = useAuthStore();
      vi.mocked(mockApi.get).mockRejectedValueOnce(rejection(500));

      const user = await store.fetchCurrentUser();

      expect(user).toBeNull();
      expect(store.userLoadFailed).toBe(true);
      // Offline or a server error must not sign the person out.
      expect(store.isAuthenticated).toBe(true);
      expect(localStorage.getItem('token')).toBe('good-token');
      expect(mockApi.post).not.toHaveBeenCalled();
    });

    it('flags a network failure the same way', async () => {
      localStorage.setItem('token', 'good-token');
      const store = useAuthStore();
      vi.mocked(mockApi.get).mockRejectedValueOnce(rejection());

      await store.fetchCurrentUser();

      expect(store.userLoadFailed).toBe(true);
      expect(store.isAuthenticated).toBe(true);
    });

    it('clears the failure once a retry succeeds', async () => {
      localStorage.setItem('token', 'good-token');
      const store = useAuthStore();
      vi.mocked(mockApi.get)
        .mockRejectedValueOnce(rejection(503))
        .mockResolvedValueOnce({ data: { data: { id: 'u1', name: 'Ana' } } });

      await store.fetchCurrentUser();
      await store.fetchCurrentUser();

      expect(store.userLoadFailed).toBe(false);
      expect(store.user?.name).toBe('Ana');
    });

    it('asks for /me once when two callers need it at the same time', async () => {
      localStorage.setItem('token', 'good-token');
      const store = useAuthStore();
      vi.mocked(mockApi.get).mockResolvedValue({ data: { data: { id: 'u1', name: 'Ana' } } });

      // The router guard and the shell on a cold load.
      await Promise.all([store.fetchCurrentUser(), store.fetchCurrentUser()]);

      expect(mockApi.get).toHaveBeenCalledTimes(1);
    });

    it('ends the session locally on a 401 without calling /logout', async () => {
      localStorage.setItem('token', 'dead-token');
      const store = useAuthStore();
      vi.mocked(mockApi.get).mockRejectedValueOnce(rejection(401));

      await store.fetchCurrentUser();

      expect(store.isAuthenticated).toBe(false);
      expect(store.userLoadFailed).toBe(false);
      expect(localStorage.getItem('token')).toBeNull();
      expect(mockApi.post).not.toHaveBeenCalled();
    });
  });

  describe('a dead impersonation token', () => {
    it('adopts the administrator token the interceptor restored, and never revokes it', async () => {
      // Reload while impersonating: the store starts with the impersonated token and
      // knows nothing about the impersonation yet (that comes from /me).
      localStorage.setItem('token', 'impersonated-token');
      const store = useAuthStore();

      vi.mocked(mockApi.get)
        .mockImplementationOnce(async () => {
          // What the axios interceptor does on that 401 before the store sees it.
          localStorage.removeItem('impersonating');
          localStorage.removeItem('token_original');
          localStorage.setItem('token', 'admin-token');
          throw rejection(401);
        })
        .mockResolvedValueOnce({ data: { data: { id: 'admin', name: 'Admin Person' } } });

      await store.fetchCurrentUser();

      expect(store.token).toBe('admin-token');
      expect(localStorage.getItem('token')).toBe('admin-token');
      expect(store.user?.name).toBe('Admin Person');
      expect(store.isImpersonating).toBe(false);
      // The old code called logout() here, revoking the token it had just been given back.
      expect(mockApi.post).not.toHaveBeenCalled();
    });

    it('restores the parked token itself when nothing else handled the 401', async () => {
      localStorage.setItem('token', 'impersonated-token');
      localStorage.setItem('token_original', 'admin-token');
      localStorage.setItem('impersonating', '1');
      const store = useAuthStore();

      vi.mocked(mockApi.get)
        .mockRejectedValueOnce(rejection(401))
        .mockResolvedValueOnce({ data: { data: { id: 'admin', name: 'Admin Person' } } });

      await store.fetchCurrentUser();

      expect(store.token).toBe('admin-token');
      expect(localStorage.getItem('token_original')).toBeNull();
      expect(localStorage.getItem('impersonating')).toBeNull();
      expect(mockApi.post).not.toHaveBeenCalled();
    });

    it('keeps the administrator token when stopping hits a 401 the interceptor handled', async () => {
      localStorage.setItem('token', 'impersonated-token');
      localStorage.setItem('token_original', 'admin-token');
      localStorage.setItem('impersonating', '1');
      const store = useAuthStore();
      store.impersonation = {
        sessionId: 's1',
        impersonatorName: 'Admin Person',
        impersonatorEmail: 'admin@example.com',
        impersonatedName: 'Claudia',
        impersonatedEmail: 'claudia@example.com',
        writesEnabled: false,
        expiresAt: '2026-09-21T12:30:00Z',
        returnUrl: 'https://admin.example.com/admin',
      };

      vi.mocked(mockApi.post).mockImplementationOnce(async () => {
        localStorage.removeItem('impersonating');
        localStorage.removeItem('token_original');
        localStorage.setItem('token', 'admin-token');
        throw rejection(401);
      });
      vi.mocked(mockApi.get).mockResolvedValueOnce({
        data: { data: { id: 'admin', name: 'Admin Person' } },
      });

      await store.stopImpersonation({ silent: true });

      // Reading the parked token after the request used to find nothing and delete this.
      expect(localStorage.getItem('token')).toBe('admin-token');
      expect(store.token).toBe('admin-token');
      expect(store.isImpersonating).toBe(false);
    });
  });

  describe('language', () => {
    it('applies the language saved in the account when this device has none', async () => {
      localStorage.setItem('token', 'good-token');
      const store = useAuthStore();
      vi.mocked(mockApi.get).mockResolvedValueOnce({
        data: { data: { id: 'u1', name: 'Ana', locale: 'es' } },
      });

      await store.fetchCurrentUser();

      expect(i18n.global.locale.value).toBe('es');
      expect(localStorage.getItem('locale')).toBe('es');
      expect(document.documentElement.lang).toBe('es');
    });

    it('lets the choice made on this device win over the account', async () => {
      localStorage.setItem('token', 'good-token');
      setAppLocale('en', { persist: true });
      const store = useAuthStore();
      vi.mocked(mockApi.get).mockResolvedValueOnce({
        data: { data: { id: 'u1', name: 'Ana', locale: 'es' } },
      });

      await store.fetchCurrentUser();

      expect(i18n.global.locale.value).toBe('en');
    });

    it('applies, remembers and saves a language the user picks', async () => {
      localStorage.setItem('token', 'good-token');
      const store = useAuthStore();
      vi.mocked(mockApi.put).mockResolvedValueOnce({ data: { success: true } });

      const ok = await store.updateLocale('es');

      expect(ok).toBe(true);
      expect(i18n.global.locale.value).toBe('es');
      expect(localStorage.getItem('locale')).toBe('es');
      expect(mockApi.put).toHaveBeenCalledWith('/user/locale', { locale: 'es' });
    });

    it('rejects a language the app does not have', async () => {
      const store = useAuthStore();

      expect(await store.updateLocale('fr')).toBe(false);
      expect(i18n.global.locale.value).toBe('en');
      expect(mockApi.put).not.toHaveBeenCalled();
    });
  });

  describe('the employee the app works with', () => {
    it('is the active record, not the first one', () => {
      const store = useAuthStore();
      store.user = {
        id: 'u1',
        name: 'Ana',
        email: 'ana@example.com',
        employeeRecords: [
          { id: 'old', companyId: 'c1', userId: 'u1', remainingVacationDays: 0, active: false },
          { id: 'current', companyId: 'c2', userId: 'u1', remainingVacationDays: 12, active: true },
        ],
      };

      expect(store.currentEmployeeId).toBe('current');
      expect(store.currentCompanyId).toBe('c2');
      expect(store.remainingVacationDays).toBe(12);
    });
  });
});
