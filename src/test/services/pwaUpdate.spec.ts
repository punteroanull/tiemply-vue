import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { scheduleUpdateChecks } from '@/services/pwaUpdate';

/**
 * The scheduling is what decides whether a deploy ever reaches an installed PWA, so it is
 * tested on its own, without the service worker machinery.
 */
describe('pwa update checks', () => {
  let listeners: Record<string, Array<() => void>>;
  let target: any;
  let registration: { update: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.useFakeTimers();
    listeners = {};
    registration = { update: vi.fn() };

    target = {
      visibilityState: 'visible',
      addEventListener: (event: string, handler: () => void) => {
        (listeners[event] ??= []).push(handler);
      },
      removeEventListener: (event: string, handler: () => void) => {
        listeners[event] = (listeners[event] ?? []).filter((h) => h !== handler);
      },
    };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function fire(event: string) {
    (listeners[event] ?? []).forEach((handler) => handler());
  }

  it('checks for a new build when the app comes back to the foreground', () => {
    // The moment that matters on a phone: the employee opening the app to clock in.
    scheduleUpdateChecks(registration, { target });

    fire('visibilitychange');

    expect(registration.update).toHaveBeenCalledTimes(1);
  });

  it('does not check while the app is hidden', () => {
    scheduleUpdateChecks(registration, { target });

    target.visibilityState = 'hidden';
    fire('visibilitychange');

    expect(registration.update).not.toHaveBeenCalled();
  });

  it('checks periodically during a long session', () => {
    scheduleUpdateChecks(registration, { target, intervalMs: 1000 });

    vi.advanceTimersByTime(3000);

    expect(registration.update).toHaveBeenCalledTimes(3);
  });

  it('stops checking once torn down', () => {
    const stop = scheduleUpdateChecks(registration, { target, intervalMs: 1000 });

    stop();
    vi.advanceTimersByTime(5000);
    fire('visibilitychange');

    expect(registration.update).not.toHaveBeenCalled();
  });

  it('survives a failing update check', () => {
    // Offline is the normal case here, and it must not take the scheduler down with it.
    registration.update.mockImplementation(() => {
      throw new Error('offline');
    });

    scheduleUpdateChecks(registration, { target, intervalMs: 1000 });

    expect(() => vi.advanceTimersByTime(2000)).not.toThrow();
    expect(registration.update).toHaveBeenCalledTimes(2);
  });
});
