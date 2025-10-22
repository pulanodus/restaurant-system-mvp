import { NextRequest, NextResponse } from 'next/server';

// Auto-cleanup system that runs on every request
// This ensures stale users are cleaned up automatically without manual intervention

let lastCleanupTime = 0;
const CLEANUP_INTERVAL = 10 * 60 * 1000; // 10 minutes (reduced frequency)

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // TEMPORARILY DISABLED - Server issues
  return NextResponse.next();
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
