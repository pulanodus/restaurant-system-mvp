'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useCart, CartItem, CartProvider } from '@/contexts/CartContext';
import { ShoppingCart, ArrowLeft, Trash2, Edit3, Users } from 'lucide-react';
import GlobalNavigation from '@/app/components/GlobalNavigation';

function CartReviewContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('sessionId');
  const { state, removeItem, updateQuantity, loadCartItems, clearCart } = useCart();
  const items = state.items;
  const isLoading = state.isLoading;

  useEffect(() => {
    console.log('🛒 Cart Review - useEffect triggered:', { sessionId, hasLoadCartItems: !!loadCartItems });
    if (sessionId) {
      console.log('🛒 Cart Review - Loading cart items for session:', sessionId);
      loadCartItems();
    } else {
      console.log('🛒 Cart Review - No sessionId found in URL params');
    }
  }, [sessionId, loadCartItems]);

  // Debug cart data
  useEffect(() => {
    console.log('🛒 Cart Review - Cart data updated:', {
      items: items,
      itemsLength: items?.length,
      isLoading,
      sessionId,
      hasItems: !!items,
      itemsType: typeof items,
      itemsIsArray: Array.isArray(items)
    });
    
    // Debug split bill data specifically
    if (items && items.length > 0) {
      items.forEach((item, index) => {
        if (item.isSplit) {
          console.log(`🔍 Split Item ${index + 1} Debug:`, {
            name: item.name,
            menuItemId: item.menu_item_id,
            isSplit: item.isSplit,
            originalPrice: item.originalPrice,
            splitPrice: item.splitPrice,
            splitCount: item.splitCount,
            participants: item.participants,
            hasSplitData: item.hasSplitData,
            splitBillId: item.splitBillId,
            quantity: item.quantity,
            price: item.price,
            calculation: {
              expectedOriginalPrice: item.price * item.quantity,
              actualOriginalPrice: item.originalPrice,
              expectedSplitPrice: item.originalPrice && item.splitCount ? item.originalPrice / item.splitCount : 'N/A',
              actualSplitPrice: item.splitPrice
            }
          });
        }
      });
    }
  }, [items, isLoading, sessionId]);

  const calculateItemPrice = (item: CartItem) => {
    if (item.isSplit && item.splitPrice) {
      return item.splitPrice;
    }
    return item.price;
  };

  const calculateTotal = (items: CartItem[]) => {
    if (!items || !Array.isArray(items)) {
      return { subtotal: 0, vat: 0, total: 0 };
    }
    
    let subtotal = 0;
    items.forEach(item => {
      if (item.isSplit) {
        // For split items, the split price is already per-person, so don't multiply by quantity
        subtotal += calculateItemPrice(item);
      } else {
        // For regular items, multiply by quantity
        subtotal += calculateItemPrice(item) * item.quantity;
      }
    });
    const vat = subtotal * 0.14;
    const total = subtotal + vat;
    return { subtotal, vat, total };
  };

  const handleRemoveItem = (itemId: string) => {
    removeItem(itemId);
  };

  const handleQuantityChange = async (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      handleRemoveItem(itemId);
    } else {
      await updateQuantity(itemId, newQuantity);
      // CRITICAL: Reload cart data after quantity change to get updated split bill info
      if (sessionId) {
        console.log('🔄 Reloading cart data after quantity change...');
        await loadCartItems();
      }
    }
  };

  // Diagnostic function to check split bill data
  const runSplitBillDiagnostics = async () => {
    if (!sessionId) return;
    
    console.log('🔍 Running Split Bill Diagnostics...');
    
    try {
      // Check split bills in database
      const response = await fetch(`/api/splits/diagnostics?sessionId=${sessionId}`);
      if (response.ok) {
        const data = await response.json();
        console.log('📊 Split Bill Diagnostics Results:', data);
      } else {
        console.log('❌ Diagnostics API not available, checking cart data only');
      }
      
      // Check cart data
      console.log('🛒 Current Cart Data:', {
        sessionId,
        itemsCount: items?.length || 0,
        splitItems: items?.filter(item => item.isSplit) || [],
        regularItems: items?.filter(item => !item.isSplit) || []
      });
      
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00d9ff] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading cart...</p>
        </div>
      </div>
    );
  }

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
              <h2 className="text-xl font-semibold text-gray-600 mb-2">Your cart is empty</h2>
              <p className="text-gray-500 mb-6">Add some delicious items to get started!</p>
              <Link 
                href="/"
                className="inline-flex items-center px-6 py-3 bg-[#00d9ff] text-white rounded-lg hover:bg-[#00c7e6] transition-colors"
              >
                Browse Menu
              </Link>
            </div>
          ) : (
            <>
              {items && items.map((item) => (
                <div key={item.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                  <div className="mb-2">
                    <h3 className="font-semibold text-gray-900">{item.name}</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      P{item.price.toFixed(2)} each
                    </p>
                  </div>

                  {/* Split Bill Info */}
                  {item.isSplit && (
                    <div className="mb-3 p-3 bg-blue-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-blue-900">
                            Full price P{(item.originalPrice || (item.price * item.quantity)).toFixed(2)}
                          </p>
                          <p className="text-xs text-blue-700 italic">
                            Split {item.splitCount} ways with {item.participants && item.participants.length > 10 
                              ? item.participants.map(p => p.length >= 2 ? p.substring(0, 2).toUpperCase() : p.charAt(0).toUpperCase()).join(', ')
                              : item.participants?.join(', ') || 'others'}
                          </p>
                          <p className="text-xs text-blue-600 font-medium">
                            Your share: P{(item.splitPrice || item.price).toFixed(2)}
                          </p>
                        </div>
                        <Link
                          href={`/split-bill?sessionId=${sessionId}&itemId=${item.menu_item_id}`}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center space-x-1"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Edit Split</span>
                        </Link>
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

                  {/* Quantity Controls */}
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                        className="w-8 h-8 rounded-full bg-[#00d9ff] text-white flex items-center justify-center hover:bg-[#00c7e6] transition-colors"
                      >
                        <span className="font-medium">-</span>
                      </button>
                      <span className="w-8 text-center font-medium text-gray-900">{item.quantity}</span>
                      <button
                        onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                        className="w-8 h-8 rounded-full bg-[#00d9ff] text-white flex items-center justify-center hover:bg-[#00c7e6] transition-colors"
                      >
                        <span className="font-medium">+</span>
                      </button>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900 text-lg">
                        P{item.isSplit ? calculateItemPrice(item).toFixed(2) : (calculateItemPrice(item) * item.quantity).toFixed(2)}
                      </p>
                    </div>
                  </div>
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
                    console.log('🍽️ Confirming orders from cart review...');
                    
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
                    console.log('✅ Cart Review - Orders confirmed successfully:', result);
                    console.log('✅ Cart Review - Confirmed orders count:', result.confirmedOrders?.length || 0);
                    
                    // Small delay to ensure database consistency
                    await new Promise(resolve => setTimeout(resolve, 500));
                    
                    // Show success message and redirect to live bill
                    alert('Orders confirmed and sent to kitchen!');
                    window.location.href = `/live-bill?sessionId=${sessionId}&from=confirmation`;
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

export default function CartReviewPage() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('sessionId');

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
    <CartProvider sessionId={sessionId}>
      <CartReviewContent />
    </CartProvider>
  );
}
