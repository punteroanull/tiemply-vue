import { describe, it, expect, vi, afterEach } from 'vitest';
import { mount, VueWrapper } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import ImpersonationBanner from '@/components/ImpersonationBanner.vue';
import { useAuthStore } from '@/stores/auth';
import i18n from '@/i18n';

const CONTEXT = {
  sessionId: 'session-1',
  impersonatorName: 'Admin Person',
  impersonatorEmail: 'admin@example.com',
  impersonatedName: 'Claudia',
  impersonatedEmail: 'claudia@example.com',
  writesEnabled: false,
  expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
  returnUrl: 'https://admin.example.com/admin',
};

describe('ImpersonationBanner', () => {
  let wrapper: VueWrapper<any>;

  function mountWith(impersonation: typeof CONTEXT | null) {
    return mount(ImpersonationBanner, {
      global: {
        plugins: [
          i18n,
          createTestingPinia({
            createSpy: vi.fn,
            initialState: { auth: { impersonation } },
          }),
        ],
      },
    });
  }

  afterEach(() => {
    wrapper?.unmount();
    vi.clearAllMocks();
  });

  it('renders nothing when there is no impersonation', () => {
    wrapper = mountWith(null);

    expect(wrapper.find('[role="alert"]').exists()).toBe(false);
  });

  it('names the impersonated person and marks the session read-only', () => {
    wrapper = mountWith(CONTEXT);

    expect(wrapper.text()).toContain('Claudia');
    expect(wrapper.text()).toContain('claudia@example.com');
    expect(wrapper.text().toLowerCase()).toContain('read-only');
  });

  it('marks the session clearly when writes are enabled', () => {
    wrapper = mountWith({ ...CONTEXT, writesEnabled: true });

    expect(wrapper.text().toLowerCase()).not.toContain('read-only');
    expect(wrapper.text().toLowerCase()).toContain('change data');
  });

  it('asks the store to stop the impersonation when the button is pressed', async () => {
    wrapper = mountWith(CONTEXT);
    const store = useAuthStore();

    await wrapper.find('button').trigger('click');

    expect(store.stopImpersonation).toHaveBeenCalled();
  });
});
