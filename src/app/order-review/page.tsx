'use client';

import { useSearchParams } from 'next/navigation';
import { useCart, CartProvider } from '@/contexts/CartContext';
import { useEffect, useState } from 'react';
import Link from 'next/link';

function OrderReviewContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('sessionId');
  const { state, removeItem, updateQuantity, loadCartItems, clearCart } = useCart();
  const [isLoading, setIsLoading] = useState(false);
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [isClearing, setIsClearing] = useState(false);

  // Load cart items when component mounts
  useEffect(() => {
    if (sessionId) {
      loadCartItems().finally(() => setIsPageLoading(false));
    } else {
      setIsPageLoading(false);
    }
  }, [sessionId, loadCartItems]);

  // Calculate totals
  const subtotal = state.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const vatRate = 0.14; // 14% VAT
  const vatAmount = subtotal * vatRate;
  const total = subtotal + vatAmount;

  const handleRemoveItem = async (itemId: string) => {
    setIsLoading(true);
    try {
      await removeItem(itemId);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateQuantity = async (itemId: string, newQuantity: number) => {
    if (newQuantity === 0) {
      await handleRemoveItem(itemId);
      return;
    }
    
    setIsLoading(true);
    try {
      await updateQuantity(itemId, newQuantity);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmptyCart = async () => {
    if (!confirm('Are you sure you want to empty your cart? This action cannot be undone.')) {
      return;
    }
    
    setIsClearing(true);
    try {
      await clearCart();
      // Reload cart items to refresh the UI
      await loadCartItems();
    } catch (error) {
      console.error('Error clearing cart:', error);
      alert('Failed to clear cart. Please try again.');
    } finally {
      setIsClearing(false);
    }
  };

  if (isPageLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00d9ff] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your order...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-[480px]">
      {/* Mobile-optimized Header */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
        <h1 className="text-xl font-bold mb-2 text-gray-800">Order Review</h1>
        <p className="text-gray-600 text-sm">Review your order before confirming</p>
      </div>

        {/* Mobile-optimized Cart Items */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
          <h2 className="text-lg font-bold mb-3 text-gray-800">Your Order</h2>
          
          {state.items.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-gray-500 mb-3 text-sm">Your cart is empty</p>
              <Link 
                href={`/session/${sessionId}`}
                className="text-[#00d9ff] hover:underline text-sm"
              >
                Browse Menu
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {state.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-grow min-w-0">
                    <h3 className="font-semibold text-gray-900 text-sm truncate">{item.name}</h3>
                    {item.notes && (
                      <p className="text-xs text-gray-600 mt-1 truncate">Note: {item.notes}</p>
                    )}
                    <div className="flex items-center mt-1 space-x-2">
                      {item.isShared && (
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                          Shared
                        </span>
                      )}
                      {item.isTakeaway && (
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                          Takeaway
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-2">
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                        disabled={isLoading}
                        className="w-8 h-8 flex items-center justify-center bg-gray-200 text-gray-700 rounded-full hover:bg-gray-300 transition-colors disabled:opacity-50 text-sm"
                      >
                        -
                      </button>
                      <span className="w-6 text-center font-medium text-gray-900 text-sm">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                        disabled={isLoading}
                        className="w-8 h-8 flex items-center justify-center bg-[#00d9ff] text-white rounded-full hover:bg-[#00c4e6] transition-colors disabled:opacity-50 text-sm"
                      >
                        +
                      </button>
                    </div>
                    
                    <div className="text-right">
                      <p className="font-bold text-gray-900 text-sm">
                        P{(item.price * item.quantity).toFixed(2)}
                      </p>
                      <p className="text-xs text-gray-600">
                        P{item.price.toFixed(2)} each
                      </p>
                    </div>
                    
                    <button
                      onClick={() => handleRemoveItem(item.id)}
                      disabled={isLoading}
                      className="text-red-500 hover:text-red-700 transition-colors disabled:opacity-50 text-xs"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Mobile-optimized Order Summary */}
        {state.items.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
            <h2 className="text-lg font-bold mb-3 text-gray-800">Order Summary</h2>
            
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600 text-sm">Subtotal</span>
                <span className="font-medium text-sm">P{subtotal.toFixed(2)}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600 text-sm">VAT (14%)</span>
                <span className="font-medium text-sm">P{vatAmount.toFixed(2)}</span>
              </div>
              
              <div className="border-t pt-2">
                <div className="flex justify-between">
                  <span className="text-base font-bold text-gray-800">Total</span>
                  <span className="text-base font-bold text-[#00d9ff]">P{total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Mobile-optimized Action Buttons */}
        <div className="space-y-3">
          {/* Primary Action Buttons */}
          <div className="flex space-x-3">
            <Link
              href={`/session/${sessionId}`}
              className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-center font-medium text-sm min-h-[44px] flex items-center justify-center"
            >
              Continue Shopping
            </Link>
            
            {state.items.length > 0 && (
              <button
                className="flex-1 px-4 py-3 bg-[#00d9ff] text-white rounded-lg hover:bg-[#00c4e6] transition-colors font-medium text-sm min-h-[44px] flex items-center justify-center"
              >
                Place Order
              </button>
            )}
          </div>
          
          {/* Empty Cart Button */}
          {state.items.length > 0 && (
            <button
              onClick={handleEmptyCart}
              disabled={isClearing || isLoading}
              className="w-full px-4 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium text-sm min-h-[44px] flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isClearing ? 'Clearing...' : '🗑️ Empty Cart'}
            </button>
          )}
        </div>
    </div>
  );
}

export default function OrderReviewPage() {
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
      <OrderReviewContent />
    </CartProvider>
  );
}