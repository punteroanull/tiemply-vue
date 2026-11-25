/**
 * The API wraps payloads as `{ success, message, data }`, and list endpoints that paginate
 * put a Laravel paginator in `data` (`{ currentPage, data: [...], total, ... }`) instead of
 * a bare array. These helpers take the axios response and return the payload either way.
 */

export interface PageMeta {
  currentPage: number;
  lastPage: number;
  perPage: number;
  total: number;
}

function isObject(value: unknown): value is Record<string, any> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** The payload of a wrapped response (`response.data.data`), or the body when unwrapped. */
export function unwrap<T = any>(response: { data?: any } | null | undefined): T {
  const body = response?.data;
  return (isObject(body) && "data" in body ? body.data : body) as T;
}

/** The rows of a list response, whether the endpoint paginates or returns a bare array. */
export function unwrapList<T = any>(response: { data?: any } | null | undefined): T[] {
  const payload = unwrap<any>(response);
  if (Array.isArray(payload)) return payload;
  if (isObject(payload) && Array.isArray(payload.data)) return payload.data;
  return [];
}

/** Paging information of a paginated list response, or null when it is not paginated. */
export function unwrapPageMeta(response: { data?: any } | null | undefined): PageMeta | null {
  const payload = unwrap<any>(response);
  if (!isObject(payload) || !Array.isArray(payload.data)) return null;
  return {
    currentPage: Number(payload.currentPage ?? 1),
    lastPage: Number(payload.lastPage ?? 1),
    perPage: Number(payload.perPage ?? payload.data.length),
    total: Number(payload.total ?? payload.data.length),
  };
}

/** The API's own message for a failed request, or the fallback when it sent none. */
/**
 * Everything the API said was wrong, for a form that shows it all: each validation message
 * once, or the general message, or the fallback.
 */
export function apiErrorMessages(error: unknown, fallback: string): string[] {
  const data = (error as any)?.response?.data;
  if (isObject(data)) {
    if (isObject(data.errors)) {
      const all = Object.values(data.errors)
        .flat()
        .filter((message): message is string => typeof message === "string" && !!message);
      if (all.length) return [...new Set(all)];
    }
    if (typeof data.message === "string" && data.message) return [data.message];
  }
  return [fallback];
}

export function apiErrorMessage(error: unknown, fallback: string): string {
  const data = (error as any)?.response?.data;
  if (isObject(data)) {
    if (isObject(data.errors)) {
      const first = Object.values(data.errors).flat()[0];
      if (typeof first === "string" && first) return first;
    }
    if (typeof data.message === "string" && data.message) return data.message;
  }
  return fallback;
}
