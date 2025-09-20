'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckCircle, Clock, CreditCard, Bell, RefreshCw } from 'lucide-react';

interface PaymentStatus {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  message: string;
  details?: string;
}

export default function PaymentProcessingPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const sessionId = searchParams.get('sessionId');
  const notificationId = searchParams.get('notificationId');

  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>({
    status: 'pending',
    message: 'Payment request sent to staff'
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Poll for payment status updates
  useEffect(() => {
    if (!sessionId) {
      setError('Session ID is required');
      setIsLoading(false);
      return;
    }

    const pollPaymentStatus = async () => {
      try {
        const response = await fetch(`/api/payment/status?sessionId=${sessionId}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
          throw new Error('Failed to check payment status');
        }

        const data = await response.json();
        setPaymentStatus({
          status: data.payment_status,
          message: data.message,
          details: data.details
        });

        // If payment is completed, redirect to receipt
        if (data.payment_status === 'completed') {
          setTimeout(() => {
            router.push(`/payment-receipt?sessionId=${sessionId}`);
          }, 2000);
        }
      } catch (error) {
        console.error('Error checking payment status:', error);
        setError('Failed to check payment status');
      } finally {
        setIsLoading(false);
      }
    };

    // Initial check
    pollPaymentStatus();

    // Poll every 10 seconds
    const interval = setInterval(pollPaymentStatus, 10000);

    return () => clearInterval(interval);
  }, [sessionId, router]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-16 h-16 text-green-500" />;
      case 'processing':
        return <CreditCard className="w-16 h-16 text-blue-500" />;
      case 'failed':
        return <CheckCircle className="w-16 h-16 text-red-500" />;
      default:
        return <Clock className="w-16 h-16 text-orange-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'processing':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'failed':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-orange-600 bg-orange-50 border-orange-200';
    }
  };

  const getStatusMessage = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Payment completed successfully! Redirecting to receipt...';
      case 'processing':
        return 'Staff is processing your payment...';
      case 'failed':
        return 'Payment failed. Please try again.';
      default:
        return 'Waiting for staff to process your payment...';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00d9ff] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading payment status...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl p-6 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => router.back()}
            className="w-full bg-[#00d9ff] text-white py-2 px-4 rounded-lg font-medium hover:bg-[#00c4e6] transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[480px] mx-auto bg-white min-h-screen">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-4 z-10">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Payment Processing</h1>
              <p className="text-sm text-gray-600">Your payment request is being processed</p>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              title="Refresh status"
            >
              <RefreshCw className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 py-8">
          <div className="text-center space-y-6">
            {/* Status Icon */}
            <div className="flex justify-center">
              {getStatusIcon(paymentStatus.status)}
            </div>

            {/* Status Message */}
            <div className={`border-2 rounded-xl p-6 ${getStatusColor(paymentStatus.status)}`}>
              <h2 className="text-xl font-bold mb-2">
                {getStatusMessage(paymentStatus.status)}
              </h2>
              {paymentStatus.details && (
                <p className="text-sm opacity-80">
                  {paymentStatus.details}
                </p>
              )}
            </div>

            {/* Progress Steps */}
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Progress</h3>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                    paymentStatus.status !== 'pending' ? 'bg-green-500' : 'bg-gray-300'
                  }`}>
                    <CheckCircle className="w-4 h-4 text-white" />
                  </div>
                  <span className={`text-sm ${
                    paymentStatus.status !== 'pending' ? 'text-gray-900' : 'text-gray-500'
                  }`}>
                    Payment request sent to staff
                  </span>
                </div>
                
                <div className="flex items-center space-x-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                    paymentStatus.status === 'processing' || paymentStatus.status === 'completed' 
                      ? 'bg-green-500' 
                      : 'bg-gray-300'
                  }`}>
                    <CheckCircle className="w-4 h-4 text-white" />
                  </div>
                  <span className={`text-sm ${
                    paymentStatus.status === 'processing' || paymentStatus.status === 'completed'
                      ? 'text-gray-900' 
                      : 'text-gray-500'
                  }`}>
                    Staff acknowledged request
                  </span>
                </div>
                
                <div className="flex items-center space-x-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                    paymentStatus.status === 'completed' ? 'bg-green-500' : 'bg-gray-300'
                  }`}>
                    <CheckCircle className="w-4 h-4 text-white" />
                  </div>
                  <span className={`text-sm ${
                    paymentStatus.status === 'completed' ? 'text-gray-900' : 'text-gray-500'
                  }`}>
                    Payment completed
                  </span>
                </div>
              </div>
            </div>

            {/* Instructions */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
              <div className="flex items-start space-x-3">
                <Bell className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <h3 className="font-medium text-blue-900 mb-2">What happens next?</h3>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• A staff member will come to your table</li>
                    <li>• They will process your payment (cash, card, or QR code)</li>
                    <li>• You'll receive a digital receipt</li>
                    <li>• This page will update automatically</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Session Info */}
            {sessionId && (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                <div className="text-center">
                  <p className="text-sm text-gray-600">Session ID</p>
                  <p className="text-xs font-mono text-gray-500 break-all">{sessionId}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
