'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useCart, CartItem, CartProvider } from '@/contexts/CartContext';
import { ShoppingCart, ArrowLeft, Trash2, Edit3, Users } from 'lucide-react';
import GlobalNavigation from '@/app/components/GlobalNavigation';

function CartReviewContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('sessionId');
  const { state, removeItem, updateQuantity, loadCartItems, clearCart } = useCart();
  const dinerName = state.dinerName;
  const items = state.items;
  const isLoading = state.isLoading;

  useEffect(() => {
    // Debug logging removed for production security
    if (sessionId) {
      // Debug logging removed for production security
      loadCartItems();
    } else {
      // Debug logging removed for production security
    }
  }, [sessionId, loadCartItems]);

  // Refresh cart data when user returns from edit split page
  useEffect(() => {
    const handleFocus = () => {
      if (sessionId && !isLoading) {
        // Debug logging removed for production security
        loadCartItems();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [sessionId, loadCartItems, isLoading]);

  // Debug cart data
  useEffect(() => {
    // Debug logging removed for production security
    
    // Debug split bill data specifically
    if (items && items.length > 0) {
      items.forEach((item, index) => {
        // Debug logging removed for production security
      });
    }
  }, [items, isLoading, sessionId]);

  const calculateItemPrice = (item: CartItem) => {
    if (item.isSplit && item.splitPrice && item.splitCount) {
      // CRITICAL FIX: Recalculate split price based on current quantity
      // The splitPrice from database might be stale, so we recalculate it
      const currentOriginalPrice = item.price * item.quantity;
      const recalculatedSplitPrice = currentOriginalPrice / item.splitCount;
      
      // Debug logging removed for production security
      
      return recalculatedSplitPrice;
    }
    return item.price * item.quantity;
  };

  const calculateTotal = (items: CartItem[]) => {
    if (!items || !Array.isArray(items)) {
      return { subtotal: 0, vat: 0, total: 0 };
    }
    
    let subtotal = 0;
    items.forEach(item => {
      const itemPrice = calculateItemPrice(item);
      subtotal += itemPrice;
      // Debug logging removed for production security
    });
    const vat = subtotal * 0.14;
    const total = subtotal + vat;
    
    // Debug logging removed for production security
    
    return { subtotal, vat, total };
  };

  const handleRemoveItem = (itemId: string) => {
    removeItem(itemId);
  };

  const handleQuantityChange = async (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      handleRemoveItem(itemId);
    } else {
      // Debug logging removed for production security
      await updateQuantity(itemId, newQuantity);
      
      // CRITICAL: Wait for split bill update to complete, then reload cart data
      if (sessionId) {
        // Debug logging removed for production security
        // Wait a bit longer to ensure the API has time to update split bills
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
        // Debug logging removed for production security
        await loadCartItems();
        // Debug logging removed for production security
      }
    }
  };

  // Diagnostic function to check split bill data
  const runSplitBillDiagnostics = async () => {
    if (!sessionId) return;
    
    // Debug logging removed for production security
    
    try {
      // Check split bills in database
      const response = await fetch(`/api/splits/diagnostics?sessionId=${sessionId}`);
      if (response.ok) {
        const data = await response.json();
        // Debug logging removed for production security
      } else {
        // Debug logging removed for production security
      }
      
      // Check cart data
      // Debug logging removed for production security
      
    } catch (error) {
      console.error('❌ Error running diagnostics:', error);
    }
  };

  // Add diagnostic function to window for console access
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).runSplitBillDiagnostics = runSplitBillDiagnostics;
    }
  }, [sessionId, items]);

  if (!sessionId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Session Not Found</h1>
          <Link href="/" className="text-[#00d9ff] hover:underline">
            Return to Home
          </Link>
        </div>
      </div>
    );
  }

  // Remove loading spinner - let the page render while data loads silently in background
  // if (isLoading) {
  //   return (
  //     <div className="min-h-screen bg-gray-50 flex items-center justify-center">
  //       <div className="text-center">
  //         <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00d9ff] mx-auto mb-4"></div>
  //         <p className="text-gray-600">Loading cart...</p>
  //       </div>
  //     </div>
  //   );
  // }

  const totals = calculateTotal(items);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[480px] mx-auto bg-white min-h-screen">
        {/* Header */}
        <div className="sticky top-0 bg-[#00d9ff] text-white px-4 py-4 z-10">
          <div className="flex items-center justify-between">
            <Link 
              href={`/session/${sessionId}`}
              className="flex items-center hover:opacity-80 transition-opacity"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-lg font-semibold absolute left-1/2 transform -translate-x-1/2">Cart Review</h1>
            <div className="w-5 h-5"></div>
          </div>
        </div>


        {/* Cart Items */}
        <div className="p-4 space-y-4 pb-20">
          {!items || items.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingCart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-600 mb-2">
                {isLoading ? 'Loading cart items...' : 'Your cart is empty'}
              </h2>
              <p className="text-gray-500 mb-6">
                {isLoading ? 'Please wait while we load your items' : 'Add some delicious items to get started!'}
              </p>
              {!isLoading && (
              <Link 
                href={`/session/${sessionId}`}
                className="inline-flex items-center px-6 py-3 bg-[#00d9ff] text-white rounded-lg hover:bg-[#00c7e6] transition-colors"
              >
                Browse Menu
              </Link>
              )}
            </div>
          ) : (
            <>
              {items && items.map((item) => (
                <div key={item.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                  {/* Item Header - Name and Final Cost */}
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="flex items-center space-x-2">
                    <h3 className="font-semibold text-gray-900">{item.name}</h3>
                        {item.isSplit && item.splitPrice && (
                          <span className="text-xs px-2 py-1 rounded-full font-medium text-white bg-purple-600">
                            Shared
                          </span>
                        )}
                      </div>
                    <p className="text-sm text-gray-600 mt-1">
                      P{item.price.toFixed(2)} each
                    </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900 text-lg">
                        P{calculateItemPrice(item).toFixed(2)}
                      </p>
                    </div>
                  </div>

                  {/* Split Bill Info */}
                  {item.isSplit && item.splitCount && (
                    <div className="mb-3">
                      <div className="space-y-1">
                      <div className="flex items-center justify-between">
                          <div className="text-xs text-purple-600">
                            <p><span className="font-medium">Full price:</span> P{(item.price * item.quantity).toFixed(2)}</p>
                            <p><span className="font-medium">Your share:</span> P{calculateItemPrice(item).toFixed(2)} (split {item.splitCount} ways)</p>
                            {item.participants && item.participants.length > 0 && (
                              <p><span className="font-medium">Shared with:</span> {item.participants.join(', ')}</p>
                            )}
                          </div>
                          <div className="flex items-center space-x-1">
                            <button
                              onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                              className="w-8 h-8 flex items-center justify-center rounded-full transition-colors text-white hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-medium"
                              style={{ backgroundColor: '#00d9ff' }}
                              aria-label={`Remove one ${item.name}`}
                            >
                              -
                            </button>
                            <span className="w-6 text-center font-medium text-gray-900 text-xs">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                              className="w-8 h-8 flex items-center justify-center text-white rounded-full hover:opacity-80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs font-medium"
                              style={{ backgroundColor: '#00d9ff' }}
                              aria-label={`Add one ${item.name}`}
                            >
                              +
                            </button>
                          </div>
                        </div>
                        
                        <div className="flex justify-start">
                        <Link
                          href={`/split-bill?sessionId=${sessionId}&itemId=${item.menu_item_id}`}
                            className="text-sm font-medium flex items-center space-x-1 hover:opacity-80 text-purple-600"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Edit Split</span>
                        </Link>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Regular Item Info */}
                  {!item.isSplit && item.notes && (
                    <div className="mb-3">
                      <p className="text-xs text-gray-500 italic">
                        Note: {item.notes}
                      </p>
                    </div>
                  )}

                  {/* Quantity Controls - Right aligned (only for non-split items) */}
                  {!item.isSplit && (
                    <div className="flex items-center justify-end mt-3">
                      <div className="flex items-center space-x-1">
                      <button
                        onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                          className="w-8 h-8 flex items-center justify-center rounded-full transition-colors bg-[#00d9ff] text-white hover:bg-[#00c4e6] disabled:opacity-50 disabled:cursor-not-allowed text-xs font-medium"
                          aria-label={`Remove one ${item.name}`}
                      >
                          -
                      </button>
                        <span className="w-6 text-center font-medium text-gray-900 text-xs">
                          {item.quantity}
                        </span>
                      <button
                        onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                          className="w-8 h-8 flex items-center justify-center bg-[#00d9ff] text-white rounded-full hover:bg-[#00c4e6] transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs font-medium"
                          aria-label={`Add one ${item.name}`}
                      >
                          +
                      </button>
                    </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Order Summary */}
              <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-3">Order Summary</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-gray-700">
                    <span>Subtotal</span>
                    <span>P{totals.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-700">
                    <span>VAT (14%)</span>
                    <span>P{totals.vat.toFixed(2)}</span>
                  </div>
                  <div className="border-t pt-2">
                    <div className="flex justify-between font-semibold text-gray-900">
                      <span>Total</span>
                      <span>P{totals.total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>


              {/* Confirm Order Button */}
              <button
                onClick={async () => {
                  if (!sessionId) {
                    alert('No active session found. Please refresh the page.');
                    return;
                  }

                  try {
                    // Debug logging removed for production security
                    
                    // Call the orders confirmation API
                    const response = await fetch('/api/orders/confirm', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        sessionId: sessionId
                      })
                    });

                    if (!response.ok) {
                      const errorData = await response.json();
                      throw new Error(errorData.error || 'Failed to confirm orders');
                    }

                    const result = await response.json();
                    // Debug logging removed for production security
                    // Debug logging removed for production security
                    
                    // Small delay to ensure database consistency
                    await new Promise(resolve => setTimeout(resolve, 500));
                    
                    // Show success message and redirect to live bill
                    alert('Orders confirmed and sent to kitchen!');
                    const dinerNameParam = dinerName ? `&dinerName=${encodeURIComponent(dinerName)}` : '';
                    window.location.href = `/live-bill?sessionId=${sessionId}&from=confirmation${dinerNameParam}`;
                  } catch (error) {
                    console.error('❌ Error confirming orders:', error);
                    alert(`Failed to confirm orders: ${error instanceof Error ? error.message : 'Unknown error'}`);
                  }
                }}
                disabled={!items || items.length === 0}
                className={`w-full py-4 rounded-lg font-semibold transition-colors text-center block ${
                  !items || items.length === 0
                    ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                    : 'bg-[#00d9ff] text-white hover:bg-[#00c7e6]'
                }`}
              >
                Confirm Order to Kitchen
              </button>
            </>
              )}
            </div>

            {/* Global Navigation Bar */}
            <GlobalNavigation sessionId={sessionId} />
          </div>
        </div>
      );
    }

function CartReviewPageContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('sessionId');
  const dinerName = searchParams.get('dinerName');

  if (!sessionId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Session Not Found</h1>
          <Link href="/" className="text-[#00d9ff] hover:underline">
            Return to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <CartProvider sessionId={sessionId} dinerName={dinerName}>
      <CartReviewContent />
    </CartProvider>
  );
}

export default function CartReviewPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Loading...</h1>
          <p className="text-gray-600">Preparing cart review...</p>
        </div>
      </div>
    }>
      <CartReviewPageContent />
    </Suspense>
  );
}
