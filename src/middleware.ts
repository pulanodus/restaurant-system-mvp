import { NextRequest, NextResponse } from 'next/server';

// Auto-cleanup system that runs on every request
// This ensures stale users are cleaned up automatically without manual intervention

let lastCleanupTime = 0;
const CLEANUP_INTERVAL = 10 * 60 * 1000; // 10 minutes (reduced frequency)

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // TEMPORARILY DISABLED - Server issues
  console.log('🤖 MIDDLEWARE-CLEANUP - Temporarily disabled due to server issues');
  return NextResponse.next();
  
  // Only run cleanup on key user-facing pages to avoid excessive API calls
  const shouldRunCleanup = (
    pathname.startsWith('/scan/') ||
    pathname.startsWith('/session/') ||
    pathname.startsWith('/cart-review') ||
    pathname.startsWith('/admin/')
  );
  
  if (shouldRunCleanup) {
    const now = Date.now();
    
    // Only run cleanup every 10 minutes to avoid excessive API calls
    if (now - lastCleanupTime >= CLEANUP_INTERVAL) {
      lastCleanupTime = now;
      
      // Trigger cleanup in the background (don't await to avoid slowing down requests)
      fetch(`${request.nextUrl.origin}/api/auto-cleanup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      }).catch(error => {
        // Silently fail - cleanup shouldn't break user experience
        console.error('❌ Middleware auto-cleanup failed:', error);
      });
    }
  }
  
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
