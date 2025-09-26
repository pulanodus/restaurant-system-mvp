'use client';

// React imports
import { useState, useEffect } from 'react';

// Supabase imports
import { supabase } from '@/lib/supabase';

// Error handling imports
import { handleError } from '@/lib/error-handling';

interface OrderItem {
  id: string;
  menu_item_id: string;
  session_id: string;
  notes?: string;
  is_shared: boolean;
  is_takeaway: boolean;
  quantity: number;
  status: string;
  created_at: string;
  menu_items?: {
    id: string;
    name: string;
    description?: string;
    price: number;
    image_url?: string;
    category: string;
    rating?: number;
    preparation_time?: string;
  };
}

interface OrderReviewProps {
  sessionId: string;
  onOrderUpdate?: () => void;
}

export default function OrderReview({ sessionId, onOrderUpdate }: OrderReviewProps) {
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [error, setError] = useState<string | null>(null);

  // Fetch order items
  const fetchOrderItems = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          menu_items (
            id,
            name,
            description,
            price,
            image_url,
            category,
            rating,
            preparation_time
          )
        `)
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setOrderItems(data || []);
    } catch (error) {
      console.error('Error fetching order items:', error);
      setError('Failed to fetch order items');
    } finally {
      setIsLoading(false);
    }
  };

  // Remove item from order
  const removeOrderItem = async (orderId: string) => {
    if (!confirm('Are you sure you want to remove this item from your order?')) return;
    
    try {
      const { error } = await supabase
        .from('orders')
        .delete()
        .eq('id', orderId);

      if (error) throw error;
      
      setOrderItems(prev => prev.filter(item => item.id !== orderId));
      onOrderUpdate?.();
    } catch (error) {
      console.error('Error removing order item:', error);
      setError('Failed to remove item from order');
    }
  };

  // Update item quantity
  const updateQuantity = async (orderId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeOrderItem(orderId);
      return;
    }

    try {
      const { error } = await supabase
        .from('orders')
        .update({ quantity: newQuantity })
        .eq('id', orderId);

      if (error) throw error;
      
      setOrderItems(prev => prev.map(item => 
        item.id === orderId ? { ...item, quantity: newQuantity } : item
      ));
      onOrderUpdate?.();
    } catch (error) {
      console.error('Error updating quantity:', error);
      setError('Failed to update quantity');
    }
  };

  // Submit order
  const submitOrder = async () => {
    if (orderItems.length === 0) {
      setError('Your order is empty');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Update orders to waiting status
      const { error: updateError } = await supabase
        .from('orders')
        .update({ status: 'waiting' })
        .eq('session_id', sessionId)
        .eq('status', 'cart');

      if (updateError) throw updateError;
      
      // Clear the cart after successful submission
      const { error: clearError } = await supabase
        .from('orders')
        .delete()
        .eq('session_id', sessionId)
        .eq('status', 'waiting');

      if (clearError) throw clearError;
      
      // Clear local state
      setOrderItems([]);
      onOrderUpdate?.();
      
      // Show success message
      alert('Order submitted successfully! Your cart has been cleared.');
    } catch (error) {
      console.error('Error submitting order:', error);
      setError('Failed to submit order');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate totals
  const subtotal = orderItems.reduce((sum, item) => {
    return sum + (item.menu_items?.price || 0) * item.quantity;
  }, 0);

  const tax = subtotal * 0.14; // 14% tax
  const total = subtotal + tax;

  useEffect(() => {
    fetchOrderItems();
  }, [sessionId, fetchOrderItems]);

  if (isLoading) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-gray-600">Loading your order...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Order Review</h1>
        <p className="text-gray-600">Review your order items and make any necessary changes.</p>
      </div>

      {orderItems.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-500 text-lg mb-4">Your order is empty</div>
          <p className="text-gray-400">Add some items from the menu to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Order Items */}
          <div className="lg:col-span-2">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Order Items</h2>
            <div className="space-y-4">
              {orderItems.map((item) => (
                <div key={item.id} className="bg-white border rounded-lg p-4 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {item.menu_items?.name}
                      </h3>
                      
                      {item.menu_items?.description && (
                        <p className="text-gray-600 text-sm mt-1 leading-relaxed">
                          {item.menu_items.description}
                        </p>
                      )}
                      
                      <div className="flex items-center space-x-4 mt-2">
                        <span className="text-sm text-gray-500">
                          {item.menu_items?.category}
                        </span>
                        {item.menu_items?.rating && (
                          <span className="text-xs text-yellow-600 bg-yellow-50 px-2 py-1 rounded-full">
                            ⭐ {item.menu_items.rating}
                          </span>
                        )}
                        {item.menu_items?.preparation_time && (
                          <span className="text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded-full">
                            ⏱ {item.menu_items.preparation_time}
                          </span>
                        )}
                      </div>
                      
                      {item.notes && (
                        <div className="mt-2 p-2 bg-[#00d9ff]/10 rounded-md">
                          <p className="text-sm text-[#00d9ff]">
                            <span className="font-medium">Special Instructions:</span> {item.notes}
                          </p>
                        </div>
                      )}
                      
                      <div className="flex items-center space-x-2 mt-2">
                        {item.is_shared && (
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                            Shared
                          </span>
                        )}
                        {item.is_takeaway && (
                          <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-full">
                            Takeaway
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4 ml-4">
                      {/* Quantity Controls */}
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="w-8 h-8 flex items-center justify-center bg-gray-200 rounded-full text-gray-800 font-bold hover:bg-gray-300"
                        >
                          -
                        </button>
                        <span className="w-8 text-center font-medium">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="w-8 h-8 flex items-center justify-center bg-gray-200 rounded-full text-gray-800 font-bold hover:bg-gray-300"
                        >
                          +
                        </button>
                      </div>
                      
                      {/* Price */}
                      <div className="text-right">
                        <div className="text-lg font-bold text-green-600">
                          P {((item.menu_items?.price || 0) * item.quantity).toFixed(2)}
                        </div>
                        <div className="text-sm text-gray-500">
                          P {item.menu_items?.price.toFixed(2)} each
                        </div>
                      </div>
                      
                      {/* Remove Button */}
                      <button
                        onClick={() => removeOrderItem(item.id)}
                        className="text-red-600 hover:text-red-800 text-sm font-medium"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white border rounded-lg p-6 shadow-sm sticky top-4">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Order Summary</h2>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium">P {subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tax (14%)</span>
                  <span className="font-medium">P {tax.toFixed(2)}</span>
                </div>
                <div className="border-t pt-3">
                  <div className="flex justify-between">
                    <span className="text-lg font-semibold text-gray-900">Total</span>
                    <span className="text-lg font-bold text-green-600">P {total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
              
              <button
                onClick={submitOrder}
                disabled={isSubmitting || orderItems.length === 0}
                className="w-full mt-6 bg-[#00d9ff] text-white py-3 px-4 rounded-md font-medium hover:bg-[#00c4e6] disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? 'Submitting Order...' : 'Submit Order'}
              </button>
              
              <p className="text-xs text-gray-500 mt-3 text-center">
                By submitting this order, you agree to our terms and conditions.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
