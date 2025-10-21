'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckCircle, Home, Mail, Download } from 'lucide-react';
import DigitalReceiptModal from '@/app/components/DigitalReceiptModal';
import RatingModal from '@/app/components/RatingModal';

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

interface ReceiptData {
  orderItems: OrderItem[];
  subtotal: number;
  vat: number;
  tipAmount: number;
  finalTotal: number;
  tableNumber?: string;
  paymentMethod?: string;
  paymentCompletedAt?: string;
}

function PaymentReceiptPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const sessionId = searchParams.get('sessionId');

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);

  // Load receipt data
  useEffect(() => {
    const loadReceiptData = async () => {
      if (!sessionId) {
        setError('Session ID is required');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // Fetch session payment data
        const sessionResponse = await fetch(`/api/payment/status?sessionId=${sessionId}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });

        if (!sessionResponse.ok) {
          throw new Error('Failed to load payment data');
        }

        const sessionData = await sessionResponse.json();

        if (sessionData.payment_status !== 'completed') {
          throw new Error('Payment not completed yet');
        }

        // For completed payments, we need to get the order history from a different endpoint
        // or use the session's stored totals since orders are filtered out after payment
        
        let orderItems: OrderItem[] = [];
        let subtotal = 0;
        let vat = 0;
        let tipAmount = sessionData.tip_amount || 0;
        let finalTotal = sessionData.final_total || 0;
        
        // Try to fetch order items from a different endpoint that doesn't filter by payment status
        try {
          const ordersResponse = await fetch(`/api/orders/history?sessionId=${sessionId}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
          });

          if (ordersResponse.ok) {
            const ordersData = await ordersResponse.json();
            const confirmedOrders = ordersData.orders || [];

            // Transform orders to order items format
            orderItems = confirmedOrders.map((order: any) => {
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

            // Calculate totals from orders if available
            subtotal = orderItems.reduce((sum, item) => sum + item.total, 0);
            vat = subtotal * 0.14;
          }
        } catch (error) {
          // Error handling for order history fetch - using session totals as fallback
        }
        
        // If we couldn't get order details, use session totals
        if (orderItems.length === 0) {
          // Calculate subtotal from session data
          // final_total = subtotal + vat + tip
          // So: subtotal = (final_total - tip) / 1.14
          subtotal = (finalTotal - tipAmount) / 1.14;
          vat = subtotal * 0.14;
          
          // Create a generic order item for display
          orderItems = [{
            id: 'session-total',
            name: 'Order Total',
            quantity: 1,
            price: subtotal,
            total: subtotal,
            isSplit: false
          }];
        }

        setReceiptData({
          orderItems,
          subtotal,
          vat,
          tipAmount,
          finalTotal,
          tableNumber: sessionData.table_number,
          paymentMethod: sessionData.payment_method,
          paymentCompletedAt: sessionData.payment_completed_at
        });

        // Show receipt modal automatically
        setShowReceiptModal(true);
      } catch (error) {
        console.error('Error loading receipt data:', error);
        setError(error instanceof Error ? error.message : 'Failed to load receipt data');
      } finally {
        setIsLoading(false);
      }
    };

    loadReceiptData();
  }, [sessionId]);

  // Handle modal close
  const handleModalClose = () => {
    setShowReceiptModal(false);
  };

  // Handle modal skip
  const handleModalSkip = () => {
    setShowReceiptModal(false);
    // Show rating modal after receipt is skipped
    setShowRatingModal(true);
  };

  // Handle return to home
  const handleReturnHome = () => {
    router.push('/');
  };

  // Handle rating modal close
  const handleRatingModalClose = () => {
    setShowRatingModal(false);
  };

  // Handle rating modal skip
  const handleRatingModalSkip = () => {
    setShowRatingModal(false);
    // Return home after skipping rating
    handleReturnHome();
  };

  // Handle continue from receipt modal (after email is sent)
  const handleReceiptContinue = () => {
    setShowReceiptModal(false);
    // Show rating modal after receipt email is sent
    setShowRatingModal(true);
  };

  // Handle rating submission
  const handleSubmitRating = async (rating: number, comment: string) => {
    // Here you would typically save the rating to your database
    // Rating submission logic would go here
    
    // For now, we'll just simulate the submission
    return new Promise((resolve) => {
      setTimeout(resolve, 1000);
    });
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return `P${amount.toFixed(2)}`;
  };

  // Format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return new Date().toLocaleString();
    return new Date(dateString).toLocaleString();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00d9ff] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading receipt...</p>
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
            onClick={handleReturnHome}
            className="w-full bg-[#00d9ff] text-white py-2 px-4 rounded-lg font-medium hover:bg-[#00c4e6] transition-colors"
          >
            Return Home
          </button>
        </div>
      </div>
    );
  }

  if (!receiptData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl p-6 max-w-md w-full text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-2">No Receipt Data</h2>
          <p className="text-gray-600 mb-4">Unable to load receipt information</p>
          <button
            onClick={handleReturnHome}
            className="w-full bg-[#00d9ff] text-white py-2 px-4 rounded-lg font-medium hover:bg-[#00c4e6] transition-colors"
          >
            Return Home
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
              <h1 className="text-xl font-bold text-gray-900">Payment Complete</h1>
              <p className="text-sm text-gray-600">Thank you for dining with us!</p>
            </div>
            <button
              onClick={handleReturnHome}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              title="Return home"
            >
              <Home className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 py-6 space-y-6">
          {/* Success Message */}
          <div className="text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h2>
            <p className="text-gray-600">
              Your payment has been processed successfully.
            </p>
          </div>

          {/* Receipt Summary */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Receipt Summary</h3>
            
            {/* Restaurant Info */}
            <div className="text-center mb-6 pb-4 border-b border-gray-200">
              <h4 className="text-lg font-bold text-gray-900">PulaNodus Restaurant</h4>
              <p className="text-sm text-gray-600">Thank you for dining with us!</p>
              {receiptData.tableNumber && (
                <p className="text-sm text-gray-600">Table {receiptData.tableNumber}</p>
              )}
              <p className="text-xs text-gray-500 mt-2">
                Receipt Date: {formatDate(receiptData.paymentCompletedAt)}
              </p>
            </div>

            {/* Order Items */}
            <div className="mb-6">
              <h4 className="font-semibold text-gray-900 mb-3">Order Details</h4>
              <div className="space-y-3">
                {receiptData.orderItems.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{item.name}</div>
                      <div className="text-gray-600">
                        {item.isSplit ? (
                          <>
                            {formatCurrency(item.originalPrice || 0)} total
                            <br />
                            <span className="text-purple-600">Split {item.splitCount} ways</span>
                          </>
                        ) : (
                          `Qty: ${item.quantity} × ${formatCurrency(item.price)}`
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-gray-900">
                        {formatCurrency(item.total)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment Summary */}
            <div className="space-y-2 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-medium text-gray-900">{formatCurrency(receiptData.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">VAT (14%):</span>
                <span className="font-medium text-gray-900">{formatCurrency(receiptData.vat)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Tip:</span>
                <span className="font-medium text-gray-900">{formatCurrency(receiptData.tipAmount)}</span>
              </div>
              <div className="border-t border-gray-300 pt-2">
                <div className="flex justify-between text-lg font-bold">
                  <span className="text-gray-900">Total:</span>
                  <span className="text-[#00d9ff]">{formatCurrency(receiptData.finalTotal)}</span>
                </div>
              </div>
            </div>

            {/* Payment Method */}
            {receiptData.paymentMethod && (
              <div className="bg-gray-50 rounded-lg p-3 mb-6">
                <div className="text-sm">
                  <span className="text-gray-600">Payment Method: </span>
                  <span className="font-medium text-gray-900 capitalize">{receiptData.paymentMethod}</span>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={() => setShowReceiptModal(true)}
              className="w-full bg-[#00d9ff] text-white py-3 px-4 rounded-xl font-semibold hover:bg-[#00c4e6] transition-colors flex items-center justify-center space-x-2"
            >
              <Mail className="w-5 h-5" />
              <span>Email Receipt</span>
            </button>
            
            <button
              onClick={handleReturnHome}
              className="w-full border-2 border-gray-300 text-gray-700 py-3 px-4 rounded-xl font-medium hover:bg-gray-50 transition-colors flex items-center justify-center space-x-2"
            >
              <Home className="w-5 h-5" />
              <span>Return Home</span>
            </button>
          </div>
        </div>
      </div>

      {/* Digital Receipt Modal */}
      <DigitalReceiptModal
        isOpen={showReceiptModal}
        onClose={handleModalClose}
        onSkip={handleModalSkip}
        onContinue={handleReceiptContinue}
        orderItems={receiptData.orderItems}
        subtotal={receiptData.subtotal}
        vat={receiptData.vat}
        tipAmount={receiptData.tipAmount}
        finalTotal={receiptData.finalTotal}
        sessionId={sessionId || ''}
        {...(receiptData.tableNumber && { tableNumber: receiptData.tableNumber })}
        {...(receiptData.paymentMethod && { paymentMethod: receiptData.paymentMethod })}
        {...(receiptData.paymentCompletedAt && { paymentCompletedAt: receiptData.paymentCompletedAt })}
      />

      {/* Rating Modal */}
      <RatingModal
        isOpen={showRatingModal}
        onClose={handleRatingModalClose}
        onSkip={handleRatingModalSkip}
        onReturnHome={handleReturnHome}
        onSubmitRating={handleSubmitRating}
        sessionId={sessionId || ''}
        {...(receiptData?.tableNumber && { tableNumber: receiptData.tableNumber })}
      />
    </div>
  );
}

export default function PaymentReceiptPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00d9ff] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading receipt...</p>
        </div>
      </div>
    }>
      <PaymentReceiptPageContent />
    </Suspense>
  );
}
