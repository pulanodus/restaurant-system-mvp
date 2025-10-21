/**
 * Background Cleanup Service
 * 
 * This service automatically runs cleanup every few minutes without requiring
 * any user interaction or manual intervention.
 */

let cleanupInterval: NodeJS.Timeout | null = null;
let isRunning = false;

/**
 * Start the background cleanup service
 * This runs automatically and requires no manual intervention
 */
export function startBackgroundCleanup(): void {
  if (isRunning || typeof window === 'undefined') {
    return; // Don't run on server-side or if already running
  }
  
  // Temporarily disabled due to server issues
  return; // TEMPORARILY DISABLED - Server issues
  
  // Starting automatic cleanup service...
  
  isRunning = true;
  
  // Run cleanup every 30 minutes (reduced frequency for better performance)
  cleanupInterval = setInterval(async () => {
    try {
      // Running scheduled cleanup...
      
      const response = await fetch('/api/auto-cleanup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.summary.totalCleanedUsers > 0) {
          // Cleaned stale users automatically
        }
      } else {
        console.error('❌ BACKGROUND-CLEANUP - Cleanup failed:', await response.text());
      }
    } catch (error) {
      console.error('❌ BACKGROUND-CLEANUP - Error:', error);
      // Don't stop the service on individual failures
    }
  }, 30 * 60 * 1000); // 30 minutes
}

/**
 * Stop the background cleanup service
 */
export function stopBackgroundCleanup(): void {
  if (cleanupInterval) {
    // Stopping automatic cleanup service...
    clearInterval(cleanupInterval);
    cleanupInterval = null;
    isRunning = false;
  }
}

/**
 * Check if the background cleanup service is running
 */
export function isBackgroundCleanupRunning(): boolean {
  return isRunning;
}

/**
 * Run cleanup immediately (for testing or urgent needs)
 */
export async function runImmediateCleanup(): Promise<void> {
  try {
    // Running immediate cleanup...
    
    const response = await fetch('/api/auto-cleanup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const result = await response.json();
      // Immediate cleanup completed
    } else {
      console.error('❌ BACKGROUND-CLEANUP - Immediate cleanup failed:', await response.text());
    }
  } catch (error) {
    console.error('❌ BACKGROUND-CLEANUP - Immediate cleanup error:', error);
  }
}
