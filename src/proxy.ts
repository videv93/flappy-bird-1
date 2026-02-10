import { NextRequest, NextResponse } from 'next/server';
import { getSessionCookie } from 'better-auth/cookies';

const protectedRoutes = ['/home', '/library', '/profile', '/activity', '/search', '/user', '/admin'];

export function proxy(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);
  const { pathname } = request.nextUrl;

  if (sessionCookie && pathname === '/login') {
    return NextResponse.redirect(new URL('/home', request.url));
  }

  if (
    !sessionCookie &&
    protectedRoutes.some((route) => pathname === route || pathname.startsWith(route + '/'))
  ) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/auth).*)'],
};
