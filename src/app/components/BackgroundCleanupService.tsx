'use client';

import { useEffect } from 'react';
import { startBackgroundCleanup, stopBackgroundCleanup } from '@/lib/background-cleanup';

/**
 * Background Cleanup Service Component
 * 
 * This component automatically starts the background cleanup service
 * when the app loads, ensuring stale users are cleaned up without
 * any manual intervention.
 */
export default function BackgroundCleanupService() {
  useEffect(() => {
    // Start the background cleanup service when the component mounts
    startBackgroundCleanup();
    
    // Clean up when the component unmounts
    return () => {
      stopBackgroundCleanup();
    };
  }, []);

  // This component doesn't render anything visible
  return null;
}
