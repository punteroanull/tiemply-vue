import { describe, it, expect, vi, afterEach } from 'vitest';
import { mount, VueWrapper } from '@vue/test-utils';
import UpdateAvailableBanner from '@/components/UpdateAvailableBanner.vue';
import { needRefresh } from '@/services/pwaUpdate';
import i18n from '@/i18n';

const applyUpdate = vi.fn();
vi.mock('@/services/pwaUpdate', async () => {
  const { ref } = await import('vue');

  return {
    needRefresh: ref(false),
    applyUpdate: (...args: unknown[]) => applyUpdate(...args),
  };
});

describe('UpdateAvailableBanner', () => {
  let wrapper: VueWrapper<any>;

  afterEach(() => {
    wrapper?.unmount();
    needRefresh.value = false;
    vi.clearAllMocks();
  });

  function mountBanner() {
    return mount(UpdateAvailableBanner, { global: { plugins: [i18n] } });
  }

  it('stays out of the way until a new build is waiting', () => {
    wrapper = mountBanner();

    expect(wrapper.find('[role="status"]').exists()).toBe(false);
  });

  it('appears when a new build is waiting', async () => {
    wrapper = mountBanner();
    needRefresh.value = true;
    await wrapper.vm.$nextTick();

    expect(wrapper.find('[role="status"]').exists()).toBe(true);
    expect(wrapper.find('button').exists()).toBe(true);
  });

  it('applies the update only when the user asks', async () => {
    // Never on its own: this app is used to clock in, and reloading mid-action would be
    // worse than running a slightly stale build.
    wrapper = mountBanner();
    needRefresh.value = true;
    await wrapper.vm.$nextTick();

    expect(applyUpdate).not.toHaveBeenCalled();

    await wrapper.find('button').trigger('click');

    expect(applyUpdate).toHaveBeenCalled();
  });
});
