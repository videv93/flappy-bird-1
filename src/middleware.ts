import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const publicRoutes = ['/', '/login', '/api/auth'];
const protectedRoutes = ['/home', '/library', '/profile', '/activity', '/search'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if public route
  if (publicRoutes.some((route) => pathname === route || pathname.startsWith(route + '/'))) {
    return NextResponse.next();
  }

  // Check session (Better Auth stores in cookie)
  const sessionToken = request.cookies.get('better-auth.session_token');

  if (!sessionToken && protectedRoutes.some((route) => pathname === route || pathname.startsWith(route + '/'))) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
