'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

interface PaymentNotificationListenerProps {
  sessionId: string;
}

export default function PaymentNotificationListener({ sessionId }: PaymentNotificationListenerProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isListening, setIsListening] = useState(false);

  useEffect(() => {
    if (!sessionId) return;

    console.log('🔔 Starting payment notification listener for session:', sessionId);
    setIsListening(true);

    // Poll for payment completion notifications
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/notifications/payment-complete?sessionId=${sessionId}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });

        if (response.ok) {
          const data = await response.json();
          
          if (data.hasNotification && data.notification) {
            console.log('🔔 Payment completion notification received:', data.notification);
            
            // Check if this is a table payment completion
            if (data.notification.metadata?.payment_type === 'table') {
              console.log('🧹 TABLE PAYMENT DETECTED: Redirecting to receipt page');
              
              // Redirect to receipt page
              const redirectUrl = data.notification.metadata?.redirect_url || `/payment-receipt?sessionId=${sessionId}`;
              router.push(redirectUrl);
              
              // Stop listening after redirect
              setIsListening(false);
              clearInterval(pollInterval);
            }
          }
        }
      } catch (error) {
        console.error('❌ Error polling for payment notifications:', error);
      }
    }, 2000); // Poll every 2 seconds

    // Cleanup on unmount
    return () => {
      console.log('🔔 Stopping payment notification listener');
      clearInterval(pollInterval);
      setIsListening(false);
    };
  }, [sessionId, router]);

  // Don't render anything visible
  return null;
}
