'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ArrowLeft, Edit3, CreditCard, CheckCircle, AlertCircle, LogOut } from 'lucide-react';
import TippingModal from '@/app/components/TippingModal';
import GlobalNavigation from '@/app/components/GlobalNavigation';
import { CartProvider } from '@/contexts/CartContext';

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  total: number;
  isSplit?: boolean;
  splitPrice?: number;
  splitCount?: number;
  originalPrice?: number;
}

interface PaymentConfirmationData {
  subtotal: number;
  vat: number;
  tipAmount: number;
  finalTotal: number;
  orderItems: OrderItem[];
}

function PaymentConfirmationPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const sessionId = searchParams.get('sessionId');
  const dinerName = searchParams.get('dinerName');
  const subtotal = parseFloat(searchParams.get('subtotal') || '0');
  const vat = parseFloat(searchParams.get('vat') || '0');
  const tipAmount = parseFloat(searchParams.get('tipAmount') || '0');
  const finalTotal = parseFloat(searchParams.get('finalTotal') || '0');
  const paymentType = searchParams.get('paymentType') || 'individual'; // individual or table

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [showTippingModal, setShowTippingModal] = useState(false);
  const [currentTipAmount, setCurrentTipAmount] = useState(tipAmount);
  const [currentFinalTotal, setCurrentFinalTotal] = useState(finalTotal);

  // Show tipping modal on first load if no tip amount is set
  useEffect(() => {
    if (tipAmount === 0 && subtotal > 0) {
      setShowTippingModal(true);
    }
  }, [tipAmount, subtotal]);

  // Load order items from the session
  useEffect(() => {
    const loadOrderItems = async () => {
      if (!sessionId) {
        setError('Session ID is required');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // Fetch confirmed orders for this session
        const response = await fetch(`/api/orders/confirm?sessionId=${sessionId}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
          throw new Error('Failed to load order items');
        }

        const data = await response.json();
        const confirmedOrders = data.confirmedOrders || [];

        // Transform orders to order items format
        const items: OrderItem[] = confirmedOrders.map((order: any) => {
          const menuItem = Array.isArray(order.menu_items) ? order.menu_items[0] : order.menu_items;
          const splitBill = Array.isArray(order.split_bills) ? order.split_bills[0] : order.split_bills;
          const itemName = menuItem?.name || 'Unknown Item';
          const itemPrice = menuItem?.price || 0;
          const isSplit = !!order.split_bill_id && !!splitBill;
          const splitPrice = splitBill?.split_price || 0;
          const splitCount = splitBill?.split_count || 1;
          const originalPrice = splitBill?.original_price || (itemPrice * order.quantity);
          
          return {
            id: order.id,
            name: itemName,
            quantity: order.quantity,
            price: itemPrice,
            total: isSplit ? splitPrice : (itemPrice * order.quantity),
            isSplit,
            splitPrice,
            splitCount,
            originalPrice
          };
        });

        setOrderItems(items);
      } catch (error) {
        console.error('Error loading order items:', error);
        setError('Failed to load order items');
      } finally {
        setIsLoading(false);
      }
    };

    loadOrderItems();
  }, [sessionId]);

  // Handle tip modification
  const handleModifyTip = () => {
    setShowTippingModal(true);
  };

  // Handle tip update from modal
  const handleTipUpdate = (newTipAmount: number, newFinalTotal: number) => {
    setCurrentTipAmount(newTipAmount);
    setCurrentFinalTotal(newFinalTotal);
    setShowTippingModal(false);
  };

  // Handle final logout - permanent session end
  const handleFinalLogout = async () => {
    if (confirm('Are you sure you want to end your session permanently? This will clear all your data and you won\'t be able to resume this session.')) {
      try {
        console.log('🚪 Final logout - ending session permanently');
        
        // Clear all local storage and session data
        if (typeof window !== 'undefined') {
          localStorage.clear();
          sessionStorage.clear();
        }
        
        // TODO: In the future, we could also mark the session as ended in the database
        // For now, we just clear local data
        
        // Redirect to home page
        router.push('/');
        
        console.log('✅ Final logout successful, session ended permanently');
      } catch (error) {
        console.error('❌ Error during final logout:', error);
        // Still redirect even if there's an error
        router.push('/');
      }
    }
  };

  // Handle payment request submission
  const handleSubmitPaymentRequest = async () => {
    if (!sessionId) {
      setError('Session ID is required');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Call the payment request API
      const response = await fetch('/api/payment/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          tipAmount: currentTipAmount,
          finalTotal: currentFinalTotal,
          paymentType: paymentType, // Pass payment type to API
          subtotal: currentSubtotal, // Pass subtotal for individual payments
          vat: currentVat // Pass VAT for individual payments
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit payment request');
      }

      const result = await response.json();
      console.log('Payment request submitted successfully:', result);

      // Navigate to payment processing page or show success
      const dinerNameParam = dinerName ? `&dinerName=${encodeURIComponent(dinerName)}` : '';
      router.push(`/payment-processing?sessionId=${sessionId}&notificationId=${result.notification_id}${dinerNameParam}`);
    } catch (error) {
      console.error('Error submitting payment request:', error);
      setError(error instanceof Error ? error.message : 'Failed to submit payment request');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return `P${amount.toFixed(2)}`;
  };

  // Use totals passed from Live Bill (URL parameters) instead of recalculating
  // This ensures consistency between Live Bill and Payment Confirmation
  const currentSubtotal = subtotal; // Use subtotal from URL params
  const currentVat = vat; // Use VAT from URL params  
  const currentTotal = currentSubtotal + currentVat + currentTipAmount;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00d9ff] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading payment confirmation...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl p-6 max-w-md w-full text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
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
    <CartProvider sessionId={sessionId || ''} dinerName={dinerName || undefined}>
      <div className="min-h-screen bg-green-50">
        <div className="max-w-[480px] mx-auto bg-white min-h-screen shadow-lg">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-4 z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => router.back()}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Confirm Your Payment Request</h1>
                  <p className="text-sm text-gray-600">Review your order and payment details</p>
                </div>
              </div>
              {/* Final Logout Button */}
              <button
                onClick={handleFinalLogout}
                className="flex items-center space-x-1 px-3 py-2 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="End session permanently - cannot resume"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">End Session</span>
              </button>
            </div>
          </div>

        {/* Content */}
        <div className="px-4 py-6 space-y-6 pb-24">
          {/* Order Items */}
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Order</h2>
            {orderItems.length > 0 ? (
              <div className="space-y-3">
                {orderItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 bg-green-100 rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{item.name}</div>
                      <div className="text-sm text-gray-600">
                        {item.isSplit ? (
                          <>
                            {formatCurrency(item.originalPrice || 0)} total
                            <br />
                            <span className="text-purple-600">Split {item.splitCount} ways: {formatCurrency(item.splitPrice || 0)} per person</span>
                          </>
                        ) : (
                          <>Qty: {item.quantity} × {formatCurrency(item.price)}</>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-gray-900">
                        {formatCurrency(item.total)}
                      </div>
                      {item.isSplit && (
                        <div className="text-xs text-purple-600">Split</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>No order items found</p>
              </div>
            )}
          </div>

          {/* Payment Breakdown */}
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Breakdown</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-medium text-gray-900">{formatCurrency(currentSubtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">VAT (14%):</span>
                <span className="font-medium text-gray-900">{formatCurrency(currentVat)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Tip:</span>
                <div className="flex items-center space-x-2">
                  <span className="font-medium text-gray-900">{formatCurrency(currentTipAmount)}</span>
                  <button
                    onClick={handleModifyTip}
                    className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                    title="Modify tip amount"
                  >
                    <Edit3 className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
              </div>
              <div className="border-t border-gray-300 pt-3">
                <div className="flex justify-between text-lg font-bold">
                  <span className="text-gray-900">Final Total:</span>
                  <span className="text-[#00d9ff]">{formatCurrency(currentTotal)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Method Info */}
          <div className="rounded-xl p-4 border" style={{ backgroundColor: '#f0fdff', borderColor: '#00d9ff' }}>
            <div className="flex items-start space-x-3">
              <CreditCard className="w-5 h-5 mt-0.5" style={{ color: '#00d9ff' }} />
              <div>
                <h3 className="font-medium mb-1" style={{ color: '#00d9ff' }}>Payment Method</h3>
                <p className="text-sm" style={{ color: '#00d9ff' }}>
                  A staff member will come to your table to process the payment. 
                  You can pay with cash, card, or QR code.
                </p>
              </div>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                <div>
                  <h3 className="font-medium text-red-900 mb-1">Error</h3>
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sticky Submit Button */}
        <div className="fixed bottom-16 left-0 right-0 max-w-[480px] mx-auto px-4 z-20">
          <button
            onClick={handleSubmitPaymentRequest}
            disabled={isSubmitting || orderItems.length === 0}
            className={`w-full py-4 px-4 rounded-xl font-semibold transition-colors flex items-center justify-center space-x-2 shadow-lg ${
              isSubmitting || orderItems.length === 0
                ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Sending Payment Request...</span>
              </>
            ) : (
              <>
                <CreditCard className="w-5 h-5" />
                <span>Send Payment Request - {formatCurrency(currentTotal)}</span>
              </>
            )}
          </button>
        </div>

          {/* Global Navigation Bar */}
          <GlobalNavigation sessionId={sessionId || undefined} />
        </div>

        {/* Tipping Modal */}
        <TippingModal
          isOpen={showTippingModal}
          onClose={() => {
            setShowTippingModal(false);
            router.back();
          }}
          onContinue={handleTipUpdate}
          subtotal={currentSubtotal}
          vat={currentVat}
          sessionId={sessionId || ''}
        />
      </div>
    </CartProvider>
  );
}

export default function PaymentConfirmationPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Loading...</h1>
          <p className="text-gray-600">Preparing payment confirmation...</p>
        </div>
      </div>
    }>
      <PaymentConfirmationPageContent />
    </Suspense>
  );
}
