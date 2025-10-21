/**
 * Automatic Stale User Cleanup System
 * 
 * This system automatically cleans up stale users without requiring any manual intervention.
 * It runs cleanup checks at strategic points in the user journey.
 */

let lastCleanupTime = 0;
const CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes

/**
 * Trigger automatic cleanup if enough time has passed
 * This prevents excessive cleanup calls while ensuring regular maintenance
 */
export async function triggerAutoCleanup(): Promise<void> {
  // TEMPORARILY DISABLED - Server issues
  // Temporarily disabled due to server issues
  return;
  
  const now = Date.now();
  
  // Only run cleanup every 5 minutes to avoid excessive API calls
  if (now - lastCleanupTime < CLEANUP_INTERVAL) {
    return;
  }
  
  lastCleanupTime = now;
  
  try {
    // Triggering automatic cleanup...
    
    const response = await fetch('/api/auto-cleanup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const result = await response.json();
      if (result.summary && result.summary.totalCleanedUsers > 0) {
        // Automatically cleaned stale users
      } else {
        // No stale users found
      }
    } else {
      const errorText = await response.text();
      let errorDetails;
      try {
        errorDetails = JSON.parse(errorText);
      } catch {
        errorDetails = errorText;
      }
      
      console.error('❌ AUTO-CLEANUP - Failed:', errorDetails);
      
      // If it's a missing environment variable error, log it but don't spam
      if (errorDetails.error && errorDetails.error.includes('Missing required environment variables')) {
        console.warn('⚠️ AUTO-CLEANUP - Environment variables not configured. Auto-cleanup disabled.');
        console.warn('   To enable auto-cleanup, add SUPABASE_SERVICE_ROLE_KEY to your .env.local file');
      }
    }
  } catch (error) {
    console.error('❌ AUTO-CLEANUP - Error:', error);
    // Don't throw - cleanup failure shouldn't break user experience
  }
}

/**
 * Trigger cleanup on user actions that are likely to reveal stale users
 */
export function triggerCleanupOnUserAction(action: string): void {
  // User action detected
  
  // Trigger cleanup in the background (don't await)
  triggerAutoCleanup().catch(error => {
    console.error('❌ AUTO-CLEANUP - Background cleanup failed:', error);
  });
}

/**
 * Check if we should run cleanup based on user behavior patterns
 */
export function shouldRunCleanup(): boolean {
  const now = Date.now();
  return now - lastCleanupTime >= CLEANUP_INTERVAL;
}

/**
 * Force immediate cleanup (for critical moments)
 */
export async function forceImmediateCleanup(): Promise<void> {
  lastCleanupTime = 0; // Reset the timer
  await triggerAutoCleanup();
}
