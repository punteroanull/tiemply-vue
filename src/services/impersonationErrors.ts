/**
 * How the axios interceptor reacts to errors that concern an impersonated session.
 *
 * Kept apart from api.ts so it can be tested without standing up axios, and because the
 * 401 branch is easy to get wrong: before impersonation existed, any 401 cleared the token
 * and redirected to the login page, which would have destroyed the administrator's own
 * session the moment the person they were viewing hit one.
 */

export const TOKEN_KEY = "token";
export const ORIGINAL_TOKEN_KEY = "token_original";
export const IMPERSONATING_KEY = "impersonating";

export function isImpersonating(): boolean {
  return localStorage.getItem(IMPERSONATING_KEY) === "1";
}

/**
 * Handle a 401 received while impersonating: the token died (expired, revoked or the
 * session was closed server-side).
 *
 * @returns where the browser should go, or null when this was not an impersonation.
 */
export function resolveImpersonated401(adminUrl?: string): string | null {
  if (!isImpersonating()) {
    return null;
  }

  const original = localStorage.getItem(ORIGINAL_TOKEN_KEY);

  localStorage.removeItem(IMPERSONATING_KEY);
  localStorage.removeItem(ORIGINAL_TOKEN_KEY);

  if (original) {
    localStorage.setItem(TOKEN_KEY, original);
    return "/";
  }

  localStorage.removeItem(TOKEN_KEY);

  // Platform administrators usually have no session of their own in this app: send them
  // back to the panel they started from rather than to an empty dashboard.
  return adminUrl ?? "/login";
}

/**
 * Whether a 403 is the read-only impersonation guard rather than a genuine permission
 * problem, so the user gets an explanation instead of a generic failure.
 */
export function isReadOnlyRejection(data: unknown): boolean {
  return (data as { code?: string } | null)?.code === "IMPERSONATION_READ_ONLY";
}
