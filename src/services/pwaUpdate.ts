import { ref } from "vue";

/**
 * Keeps installed PWAs from running a stale build.
 *
 * An installed app on a phone can go days without ever re-fetching the service worker:
 * the employee opens it, clocks in, and sends it to the background without a navigation.
 * A deploy therefore reaches nobody until the browser decides to look, which is why the
 * geolocation fixes sat undelivered on people's phones.
 *
 * Two halves: ask the browser to look for a new worker at the moments that matter, and
 * tell the user when one is waiting instead of reloading under their fingers. Reloading
 * on its own would be worse here than a stale build: it could happen mid clock-in.
 */

/** True once a new build is downloaded and waiting to take over. */
export const needRefresh = ref(false);

/** How often to look for a new build during a long session. */
const UPDATE_INTERVAL_MS = 60 * 60 * 1000;

type UpdatableRegistration = { update: () => unknown };

let applyFn: ((reloadPage?: boolean) => void | Promise<void>) | null = null;

/**
 * Check for a new service worker on the events that actually happen on a phone.
 *
 * Bringing the app to the foreground is the important one: it is exactly the moment an
 * employee opens it to clock in, and the only reliable signal that an installed PWA is
 * being used at all.
 *
 * @returns a function that stops the checks, for tests and teardown.
 */
export function scheduleUpdateChecks(
  registration: UpdatableRegistration,
  options: { intervalMs?: number; target?: Pick<Document, "addEventListener" | "removeEventListener" | "visibilityState"> } = {}
): () => void {
  const intervalMs = options.intervalMs ?? UPDATE_INTERVAL_MS;
  const target = options.target ?? document;

  const check = () => {
    try {
      registration.update();
    } catch (error) {
      // Offline, or the worker is gone: nothing to do but try again next time.
      console.warn("Could not check for an application update:", error);
    }
  };

  const onVisible = () => {
    if (target.visibilityState === "visible") {
      check();
    }
  };

  target.addEventListener("visibilitychange", onVisible);
  const timer = setInterval(check, intervalMs);

  return () => {
    target.removeEventListener("visibilitychange", onVisible);
    clearInterval(timer);
  };
}

/**
 * Apply the waiting build. Reloads the page, which is safe because the user asked.
 */
export async function applyUpdate(): Promise<void> {
  if (!applyFn) {
    window.location.reload();
    return;
  }

  await applyFn(true);
}

/**
 * Wire the service worker up. Called once at start-up.
 */
export async function setupPwaUpdates(): Promise<void> {
  try {
    // Dynamic: the virtual module only exists once vite-plugin-pwa has run, so a static
    // import would break unit tests and any non-PWA build.
    const { registerSW } = await import("virtual:pwa-register");

    applyFn = registerSW({
      immediate: true,
      onNeedRefresh() {
        needRefresh.value = true;
      },
      onRegisteredSW(_swUrl, registration) {
        if (registration) {
          scheduleUpdateChecks(registration);
        }
      },
      onRegisterError(error) {
        console.warn("Service worker registration failed:", error);
      },
    });
  } catch (error) {
    console.warn("Service worker support is not available:", error);
  }
}
