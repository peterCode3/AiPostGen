import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PROTECTED_PREFIX = '/admin';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (!pathname.startsWith(PROTECTED_PREFIX)) return;

  // Read token from cookies (SSR-safe) or pass through and let pages fetch with localStorage.
  // Since your pages use localStorage, we'll just allow and rely on API 401s.
  // If you want cookie-based auth, set a cookie at login and check here.

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
