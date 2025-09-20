'use client';

import { useState, useEffect, useContext } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CartContext } from '@/contexts/CartContextSimple';
import { ShoppingCart, ArrowLeft, Trash2, Edit3, Users } from 'lucide-react';

interface CartItem {
  id: string;
  menu_item_id: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
  isShared?: boolean;
  isTakeaway?: boolean;
  customizations?: string[];
  // Split bill properties
  isSplit?: boolean;
  splitPrice?: number;
  originalPrice?: number;
  splitCount?: number;
  participants?: string[];
  hasSplitData?: boolean;
}

export default function CartReviewPage() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('sessionId');
  const { items, removeItem, updateQuantity, loadCartItems } = useContext(CartContext);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (sessionId) {
      loadCartItems();
      setIsLoading(false);
    }
  }, [sessionId, loadCartItems]);

  const calculateItemPrice = (item: CartItem) => {
    if (item.isSplit && item.splitPrice) {
      return item.splitPrice;
    }
    return item.price;
  };

  const calculateTotal = (items: CartItem[]) => {
    let subtotal = 0;
    items.forEach(item => {
      subtotal += calculateItemPrice(item) * item.quantity;
    });
    const vat = subtotal * 0.14;
    const total = subtotal + vat;
    return { subtotal, vat, total };
  };

  const handleRemoveItem = (itemId: string) => {
    removeItem(itemId);
  };

  const handleQuantityChange = (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      handleRemoveItem(itemId);
    } else {
      updateQuantity(itemId, newQuantity);
    }
  };

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
              href="/"
              className="flex items-center space-x-2 hover:opacity-80 transition-opacity"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm font-medium">Back to Menu</span>
            </Link>
            <h1 className="text-lg font-semibold">Cart Review</h1>
            <div className="w-16"></div>
          </div>
        </div>

        {/* Cart Items */}
        <div className="p-4 space-y-4">
          {items.length === 0 ? (
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
              {items.map((item) => (
                <div key={item.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-gray-900">{item.name}</h3>
                    <button
                      onClick={() => handleRemoveItem(item.id)}
                      className="text-red-500 hover:text-red-700 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Split Bill Info */}
                  {item.isSplit && (
                    <div className="mb-3 p-3 bg-blue-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-blue-900">
                            Full price ₱{((item.originalPrice || item.price) * item.quantity).toFixed(2)}
                          </p>
                          <p className="text-xs text-blue-700 italic">
                            Split {item.splitCount} ways with {item.participants?.join(', ') || 'others'}
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
                  {!item.isSplit && (
                    <div className="mb-3">
                      <p className="text-sm text-gray-600">
                        ₱{item.price.toFixed(2)} each
                      </p>
                      {item.notes && (
                        <p className="text-xs text-gray-500 mt-1 italic">
                          Note: {item.notes}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Quantity Controls */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                        className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
                      >
                        <span className="text-gray-600">-</span>
                      </button>
                      <span className="w-8 text-center font-medium">{item.quantity}</span>
                      <button
                        onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                        className="w-8 h-8 rounded-full bg-[#00d9ff] text-white flex items-center justify-center hover:bg-[#00c7e6] transition-colors"
                      >
                        <span>+</span>
                      </button>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">
                        ₱{(calculateItemPrice(item) * item.quantity).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}

              {/* Order Summary */}
              <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-3">Order Summary</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal</span>
                    <span>₱{totals.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>VAT (14%)</span>
                    <span>₱{totals.vat.toFixed(2)}</span>
                  </div>
                  <div className="border-t pt-2">
                    <div className="flex justify-between font-semibold">
                      <span>Total</span>
                      <span>₱{totals.total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Checkout Button */}
              <button className="w-full bg-[#00d9ff] text-white py-4 rounded-lg font-semibold hover:bg-[#00c7e6] transition-colors">
                Proceed to Checkout
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
