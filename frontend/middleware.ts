import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  // Set default active-company cookie if not set
  if (!request.cookies.get('active-company')?.value) {
    response.cookies.set('active-company', 'SMRIDHI SPONGE LIMITED - (from 1-Apr-24) - (from 1-Apr-25)', { path: '/', maxAge: 86400 });
  }
  return response;
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
