/**
 * Routes behind a subscription feature answer 403 with
 * `{ success: false, message, errors: { upgrade_required: true, feature, minimum_tier } }`
 * when the company plan does not include it. That is "not on your plan", not a failure, so
 * screens show a quiet notice instead of an error. (Error bodies are not camel-cased.)
 */
export function isFeatureUnavailable(error: unknown): boolean {
  const response = (error as any)?.response;
  if (response?.status !== 403) return false;
  const data = response.data;
  return Boolean(
    data?.errors?.upgrade_required ?? data?.errors?.upgradeRequired ?? data?.upgrade_required
  );
}
