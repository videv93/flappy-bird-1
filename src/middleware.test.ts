import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { middleware } from './middleware';

describe('middleware', () => {
  function createMockRequest(pathname: string, cookies: Record<string, string> = {}) {
    const url = `http://localhost:3000${pathname}`;
    const request = new NextRequest(url);

    // Mock cookies
    vi.spyOn(request.cookies, 'get').mockImplementation((nameOrCookie) => {
      const name = typeof nameOrCookie === 'string' ? nameOrCookie : nameOrCookie.name;
      if (cookies[name]) {
        return { name, value: cookies[name] };
      }
      return undefined;
    });

    return request;
  }

  describe('public routes', () => {
    it('allows access to login page without session', () => {
      const request = createMockRequest('/login');
      const response = middleware(request);

      expect(response.status).toBe(200);
    });

    it('allows access to root page without session', () => {
      const request = createMockRequest('/');
      const response = middleware(request);

      expect(response.status).toBe(200);
    });

    it('allows access to auth API routes without session', () => {
      const request = createMockRequest('/api/auth/session');
      const response = middleware(request);

      expect(response.status).toBe(200);
    });
  });

  describe('protected routes', () => {
    it('redirects to login when accessing /home without session', () => {
      const request = createMockRequest('/home');
      const response = middleware(request);

      expect(response.status).toBe(307);
      expect(response.headers.get('location')).toContain('/login');
      expect(response.headers.get('location')).toContain('callbackUrl=%2Fhome');
    });

    it('redirects to login when accessing /library without session', () => {
      const request = createMockRequest('/library');
      const response = middleware(request);

      expect(response.status).toBe(307);
      expect(response.headers.get('location')).toContain('/login');
    });

    it('redirects to login when accessing /profile without session', () => {
      const request = createMockRequest('/profile');
      const response = middleware(request);

      expect(response.status).toBe(307);
      expect(response.headers.get('location')).toContain('/login');
    });

    it('allows access to /home with valid session', () => {
      const request = createMockRequest('/home', {
        'better-auth.session_token': 'valid-token',
      });
      const response = middleware(request);

      expect(response.status).toBe(200);
    });

    it('preserves callback URL for post-login redirect', () => {
      const request = createMockRequest('/library/my-books');
      const response = middleware(request);

      expect(response.status).toBe(307);
      const location = response.headers.get('location');
      expect(location).toContain('/login');
      expect(location).toContain('callbackUrl');
    });
  });
});
