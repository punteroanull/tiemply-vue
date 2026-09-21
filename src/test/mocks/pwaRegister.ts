/**
 * Stand-in for "virtual:pwa-register", which only exists once vite-plugin-pwa has run.
 * Aliased in vitest.config.ts so importing the real module does not break the test build.
 */
export function registerSW(_options: Record<string, unknown> = {}) {
  return async (_reloadPage?: boolean) => {};
}
