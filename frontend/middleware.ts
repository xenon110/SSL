// @ts-ignore
import { NextResponse } from 'next/server';
// @ts-ignore
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const authToken = request.cookies.get('auth-token')?.value;
  const { pathname } = request.nextUrl;

  const isPublicPage = pathname === '/' || pathname === '/portal' || pathname === '/login';
  const isApiRoute = pathname.startsWith('/api/');
  const isStaticFile = pathname.startsWith('/_next/') || pathname.includes('.');

  // Allow access to API routes and static files without redirection loops
  if (isApiRoute || isStaticFile) {
    return NextResponse.next();
  }

  // If user is not authenticated and trying to access a protected route
  if (!authToken && !isPublicPage) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // If user is authenticated and trying to access the login page
  if (authToken && pathname === '/login') {
    const dashboardUrl = new URL('/dashboard', request.url);
    const response = NextResponse.redirect(dashboardUrl);
    response.cookies.set('active-company', 'SMRIDHI SPONGE LIMITED - (from 1-Apr-24) - (from 1-Apr-25)', { path: '/', maxAge: 86400 });
    return response;
  }

  const response = NextResponse.next();
  if (authToken && request.cookies.get('active-company')?.value !== 'SMRIDHI SPONGE LIMITED - (from 1-Apr-24) - (from 1-Apr-25)') {
    response.cookies.set('active-company', 'SMRIDHI SPONGE LIMITED - (from 1-Apr-24) - (from 1-Apr-25)', { path: '/', maxAge: 86400 });
  }
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
