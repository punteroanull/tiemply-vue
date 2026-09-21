import { describe, it, expect, beforeEach } from 'vitest';
import {
  isImpersonating,
  isReadOnlyRejection,
  resolveImpersonated401,
} from '@/services/impersonationErrors';

describe('impersonation error handling', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('does nothing for a 401 outside an impersonation', () => {
    localStorage.setItem('token', 'plain-token');

    expect(resolveImpersonated401('https://admin.example.com')).toBeNull();

    // The caller keeps its original behaviour untouched.
    expect(localStorage.getItem('token')).toBe('plain-token');
  });

  it('restores the administrator token instead of clearing it', () => {
    // The whole point: a 401 belonging to the impersonated person must not destroy the
    // administrator's own session.
    localStorage.setItem('token', 'impersonated-token');
    localStorage.setItem('token_original', 'admin-token');
    localStorage.setItem('impersonating', '1');

    expect(resolveImpersonated401('https://admin.example.com')).toBe('/');

    expect(localStorage.getItem('token')).toBe('admin-token');
    expect(localStorage.getItem('token_original')).toBeNull();
    expect(localStorage.getItem('impersonating')).toBeNull();
  });

  it('sends the administrator back to the panel when there is nothing to restore', () => {
    localStorage.setItem('token', 'impersonated-token');
    localStorage.setItem('impersonating', '1');

    expect(resolveImpersonated401('https://admin.example.com')).toBe('https://admin.example.com');
    expect(localStorage.getItem('token')).toBeNull();
  });

  it('falls back to the login page when no panel url is configured', () => {
    localStorage.setItem('impersonating', '1');

    expect(resolveImpersonated401(undefined)).toBe('/login');
  });

  it('recognises the read-only rejection and nothing else', () => {
    expect(isReadOnlyRejection({ code: 'IMPERSONATION_READ_ONLY' })).toBe(true);
    expect(isReadOnlyRejection({ code: 'SOMETHING_ELSE' })).toBe(false);
    expect(isReadOnlyRejection(null)).toBe(false);
    expect(isReadOnlyRejection(undefined)).toBe(false);
  });

  it('reports whether an impersonation is in progress', () => {
    expect(isImpersonating()).toBe(false);

    localStorage.setItem('impersonating', '1');
    expect(isImpersonating()).toBe(true);
  });
});
