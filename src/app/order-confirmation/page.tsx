'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, ArrowLeft, Clock } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';

export default function OrderConfirmationPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get('sessionId');
  const total = searchParams.get('total');
  const { clearCart } = useCart();
  
  const [orderNumber, setOrderNumber] = useState<string>('');
  const [estimatedTime, setEstimatedTime] = useState<string>('15-20 minutes');

  useEffect(() => {
    // Generate order number
    const orderNum = `ORD-${Date.now().toString().slice(-6)}`;
    setOrderNumber(orderNum);
    
    // Clear cart after successful confirmation
    const clearCartAfterConfirmation = async () => {
      try {
        console.log('🧹 Clearing cart after order confirmation...');
        await clearCart();
        console.log('✅ Cart cleared successfully');
      } catch (error) {
        console.error('❌ Error clearing cart:', error);
      }
    };
    
    clearCartAfterConfirmation();
  }, [sessionId, total, clearCart]);

  // Note: Cart is now cleared immediately when the page loads
  // since the confirmation happens in cart-review page

  if (!sessionId || !total) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Invalid Order</h1>
          <Link href="/" className="text-[#00d9ff] hover:underline">
            Return to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[480px] mx-auto bg-white min-h-screen">
        {/* Header Section */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-4 z-10">
          <div className="flex items-center justify-between">
            <Link 
              href={`/session/${sessionId}`}
              className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-gray-100 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <h1 className="text-lg font-semibold text-gray-900">Order Confirmation</h1>
            <div className="w-10"></div> {/* Spacer for centering */}
          </div>
        </div>

        {/* Content */}
        <div className="px-4 py-6 space-y-6">
          {/* Success Icon and Combined Message */}
          <div className="text-center py-8">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Order Confirmed!</h2>
            <p className="text-gray-600 mb-4">Your order has been sent to the kitchen and is being prepared. You can track your orders at the Live Bill section.</p>
            <div className="flex items-center justify-center space-x-2 text-orange-600">
              <Clock className="w-4 h-4" />
              <span className="text-sm font-medium">Estimated time: {estimatedTime}</span>
            </div>
          </div>


          {/* Order Summary */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-3">Order Summary</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Order Number:</span>
                <span className="font-semibold text-gray-900">{orderNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total Amount:</span>
                <span className="font-semibold text-[#00d9ff]">P{parseFloat(total).toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 space-y-3">
            <Link
              href={`/live-bill?sessionId=${sessionId}&from=confirmation`}
              className="w-full bg-green-600 text-white py-4 px-6 rounded-lg font-semibold text-lg hover:bg-green-700 transition-colors text-center block"
            >
              View Live Bill
            </Link>
            <Link
              href={`/session/${sessionId}`}
              className="w-full bg-[#00d9ff] text-white py-4 px-6 rounded-lg font-semibold text-lg hover:bg-[#00c4e6] transition-colors text-center block"
            >
              Order More Items
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
