'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useCart } from '@/contexts/CartContext';
import { createClient } from '@supabase/supabase-js';
import {
  Users,
  User,
  Clock,
  CheckCircle,
  AlertCircle,
  ChefHat,
  Receipt,
  CreditCard,
  RefreshCw,
  Eye,
  EyeOff
} from 'lucide-react';



interface LiveBillProps {
  sessionId?: string | null;
  tableId?: string | null;
}

const LiveBill = ({ sessionId: propSessionId, tableId: propTableId }: LiveBillProps = {}) => {
  const searchParams = useSearchParams();
  const sessionId = propSessionId || searchParams.get('sessionId');
  const tableId = propTableId || searchParams.get('tableId');

  const [viewMode, setViewMode] = useState<'my-share' | 'table-bill'>('my-share');
  const [refreshing, setRefreshing] = useState(false);
  const [confirmedOrders, setConfirmedOrders] = useState<any[]>([]);
  const [loadingConfirmedOrders, setLoadingConfirmedOrders] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [sessionData, setSessionData] = useState<any>(null);
  const [loadingSession, setLoadingSession] = useState(false);
  
  // Use real cart context with sessionId
  const { state, clearCart, loadCartItems } = useCart();
  const cartItems = state.items;

  // Load session data
  const loadSessionData = async () => {
    if (!sessionId) {
      return;
    }
    
    setLoadingSession(true);
    try {
      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSessionData(data.session);
      } else {
        const errorData = await response.json();
        console.error('❌ LiveBill - Failed to load session data:', response.status, errorData);
      }
    } catch (error) {
      console.error('❌ LiveBill - Error loading session data:', error);
    } finally {
      setLoadingSession(false);
    }
  };

  // Load confirmed orders from database
  const loadConfirmedOrders = async () => {
    if (!sessionId) {
      return;
    }
    
    setLoadingConfirmedOrders(true);
    
    try {
      const url = `/api/orders/confirm?sessionId=${sessionId}&isLiveBillRequest=true`;
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        const data = await response.json();
        setConfirmedOrders(data.confirmedOrders || []);
        } else {
        console.error('❌ LiveBill - API error:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('❌ LiveBill - Error response:', errorText);
      }
    } catch (error) {
      console.error('❌ LiveBill - Fetch error:', error);
    } finally {
      setLoadingConfirmedOrders(false);
      }
  };

  // Silent load confirmed orders (no loading state)
  const loadConfirmedOrdersSilently = async () => {
    if (!sessionId) {
      return;
    }
    
    try {
      const response = await fetch(`/api/orders/confirm?sessionId=${sessionId}&isLiveBillRequest=true`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        const data = await response.json();
        setConfirmedOrders(data.confirmedOrders || []);
        } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ LiveBill - Silent load failed:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
      }
    } catch (error) {
      console.error('❌ LiveBill - Silent load error:', error);
      // Don't throw the error in silent mode to avoid disrupting the UI
    }
  };

  // Force load cart items, session data, and confirmed orders on mount
  useEffect(() => {
    if (sessionId) {
      loadCartItems();
      loadSessionData();
      loadConfirmedOrders();
    } else {
      }
  }, [sessionId, loadCartItems]);

  // Refresh confirmed orders when component becomes visible (user returns from cart review)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && sessionId) {
        loadConfirmedOrdersSilently();
      }
    };

    const handleFocus = () => {
      if (sessionId) {
        loadConfirmedOrdersSilently();
      }
    };

    // Listen for page visibility changes and window focus
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [sessionId]);

  // Force refresh when arriving from order confirmation
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const fromConfirmation = urlParams.get('from') === 'confirmation';
    
    if (fromConfirmation && sessionId) {
      // Add a small delay then fetch
      setTimeout(() => {
        loadConfirmedOrders();
      }, 1000);
    }
  }, [sessionId]);

  // Refresh confirmed orders when component mounts or when returning from other pages
  useEffect(() => {
    if (sessionId) {
      loadConfirmedOrders();
    }
  }, [sessionId]);

  // Calculate table totals from confirmed orders only - use original prices
  const tableSubtotal = confirmedOrders.reduce((sum, order) => {
    const menuItem = Array.isArray(order.menu_items) ? order.menu_items[0] : order.menu_items;
    const price = menuItem?.price || 0;
    return sum + (price * order.quantity);
  }, 0);
  const vat = tableSubtotal * 0.14;
  const tableTotal = tableSubtotal + vat;

  // Calculate individual shares from confirmed orders using the same logic as Table Bill
  const calculateUserShare = (userId: string) => {
    // The current user is represented as "You" in the participants array
    const currentUserName = 'You';
    
    let personalTotal = 0;
    let sharedTotal = 0;
    
    confirmedOrders.forEach(order => {
      const menuItem = Array.isArray(order.menu_items) ? order.menu_items[0] : order.menu_items;
      const splitBill = Array.isArray(order.split_bills) ? order.split_bills[0] : order.split_bills;
      const isShared = !!splitBill && splitBill.participants && splitBill.participants.length > 0;
      
      if (isShared && splitBill.participants && splitBill.participants.includes(currentUserName)) {
        // This is a shared item that includes the current user
        const itemPrice = (splitBill.split_price || 0) * order.quantity;
        sharedTotal += itemPrice;
        } else if (!isShared && order.diner_name === currentUserName) {
        // This is a personal item for the current user (only if diner_name matches)
        const itemPrice = (menuItem?.price || 0) * order.quantity;
        personalTotal += itemPrice;
        } else if (!isShared && !order.diner_name) {
        // For non-shared items without diner_name, we'll assume they belong to the current user
        // This is a fallback for items that haven't been assigned to specific people yet
        const itemPrice = (menuItem?.price || 0) * order.quantity;
        personalTotal += itemPrice;
        }
    });

    return {
      individualTotal: personalTotal,
      sharedTotal: sharedTotal,
      subtotal: personalTotal + sharedTotal
    };
  };

  // Calculate cart totals - handle split bills correctly
  const cartSubtotal = (cartItems || []).reduce((sum, item) => {
    if (item.isSplit && item.splitPrice) {
      // For split items, use the split price (per-person amount)
      return sum + item.splitPrice;
    } else {
      // For regular items, use price × quantity
      return sum + (item.price * item.quantity);
    }
  }, 0);

  // Note: Order confirmation is now handled in the cart-review page
  // This ensures a single, consistent confirmation flow

  // Function to simulate real-time status updates
  const updateOrderStatus = (orderId: string, newStatus: 'preparing' | 'ready' | 'served') => {
    setConfirmedOrders(prev => 
      prev.map(order => 
        order.id === orderId ? { ...order, status: newStatus } : order
      )
    );
  };

  // Simulate kitchen updates (in real app, this would come from Supabase real-time)
  useEffect(() => {
    const interval = setInterval(() => {
      // Randomly update some orders to simulate kitchen progress
      const preparingOrders = confirmedOrders.filter(order => order.status === 'preparing');
      if (preparingOrders.length > 0) {
        const randomOrder = preparingOrders[Math.floor(Math.random() * preparingOrders.length)];
        const statuses = ['preparing', 'ready', 'served'] as const;
        const currentIndex = statuses.indexOf(randomOrder.status);
        if (currentIndex < statuses.length - 1) {
          const nextStatus = statuses[currentIndex + 1];
          if (nextStatus) {
            updateOrderStatus(randomOrder.id, nextStatus);
          }
        }
      }
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [confirmedOrders]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'served':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'ready':
        return <AlertCircle className="w-4 h-4 text-orange-500" />;
      case 'preparing':
        return <ChefHat className="w-4 h-4 text-blue-500" />;
      case 'waiting':
        return <Clock className="w-4 h-4 text-pink-500" />;
      case 'confirmed':
        return <Clock className="w-4 h-4 text-blue-500" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-gray-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'served':
        return 'text-white bg-green-600'; // Changed to green to make served items more visible and positive
      case 'ready':
        return 'text-gray-800 bg-green-200';
      case 'preparing':
        return 'text-gray-800 bg-orange-200';
      case 'waiting':
        return 'text-gray-800 bg-pink-200';
      case 'confirmed':
        return 'text-gray-800 bg-blue-200';
      case 'pending':
        return 'text-gray-600 bg-gray-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      // Reload both cart items and confirmed orders
      await Promise.all([
        loadCartItems(),
        loadConfirmedOrders()
      ]);
      } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // Auto-refresh confirmed orders every 10 seconds to catch updates (silent refresh)
  useEffect(() => {
    if (!sessionId) return;

    const interval = setInterval(() => {
      // Silent refresh - don't show loading state
      loadConfirmedOrdersSilently();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [sessionId]);

  // Set up real-time subscription for order status changes
  useEffect(() => {
    if (!sessionId) return;

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const channel = supabase
      .channel(`orders-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          // If any order status changed, refresh the confirmed orders
          loadConfirmedOrdersSilently();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  const handleRequestPayment = async () => {
    if (!sessionId) {
      console.error('No session ID available for payment request');
      alert('No active session found. Please refresh the page.');
      return;
    }

    // Check if all orders are served before allowing payment request
    const allOrdersServed = confirmedOrders.every(order => order.status === 'served');
    if (!allOrdersServed) {
      const unservedOrders = confirmedOrders.filter(order => order.status !== 'served');
      const statusCounts = unservedOrders.reduce((acc, order) => {
        acc[order.status] = (acc[order.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const statusText = Object.entries(statusCounts)
        .map(([status, count]) => `${count} ${status}`)
        .join(', ');
      
      alert(`Cannot request payment yet. Please wait for all orders to be served.\n\nRemaining orders: ${statusText}`);
      return;
    }

    try {
      // Calculate totals
      const subtotal = currentDinerShare.subtotal + cartSubtotal;
      const vat = subtotal * 0.14;
      const finalTotal = subtotal + vat;

      // Calculate table total for comparison - use original prices
      const tableSubtotal = confirmedOrders.reduce((sum, order) => {
        const menuItem = Array.isArray(order.menu_items) ? order.menu_items[0] : order.menu_items;
        const price = menuItem?.price || 0;
        return sum + (price * order.quantity);
      }, 0);
      const tableVat = tableSubtotal * 0.14;
      const tableTotal = tableSubtotal + tableVat;

      // Determine payment type: if individual share equals table total, it's a table payment
      const isTablePayment = Math.abs(finalTotal - tableTotal) < 0.01; // Account for floating point precision

      // Navigate to payment confirmation page with initial values
      const params = new URLSearchParams({
        sessionId: sessionId,
        subtotal: subtotal.toString(),
        vat: vat.toString(),
        tipAmount: '0',
        finalTotal: finalTotal.toString(),
        paymentType: isTablePayment ? 'table' : 'individual' // Smart payment type detection
      });

      window.location.href = `/payment-confirmation?${params.toString()}`;
    } catch (error) {
      console.error('Error initiating payment request:', error);
      alert('Failed to initiate payment request. Please try again.');
    }
  };

  const currentDinerShare = calculateUserShare('You');
  
  // Check if all orders are served for payment eligibility
  const allOrdersServed = confirmedOrders.length > 0 && confirmedOrders.every(order => order.status === 'served');
  const hasOrders = confirmedOrders.length > 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[480px] mx-auto bg-white min-h-screen">
        {/* Header */}
        <div className="sticky top-0 bg-[#00d9ff] text-white px-4 py-4 z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center justify-center flex-1">
              <div className="flex items-center space-x-2">
                <Receipt className="w-5 h-5" />
                <h1 className="text-lg font-semibold">Live Bill</h1>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors disabled:opacity-50"
                title="Refresh Live Bill"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={() => {
                  loadConfirmedOrdersSilently();
                }}
                className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors"
                title="Refresh Confirmed Orders"
              >
                <ChefHat className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          {/* View Toggle */}
          <div className="flex bg-white rounded-lg p-1">
            <button
              onClick={() => setViewMode('my-share')}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                viewMode === 'my-share'
                  ? 'bg-[#00d9ff] text-white shadow-sm'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              My Share
            </button>
            <button
              onClick={() => setViewMode('table-bill')}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                viewMode === 'table-bill'
                  ? 'bg-[#00d9ff] text-white shadow-sm'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Table Bill
            </button>
          </div>
        </div>

        {/* Content Section */}
        <div className="px-4 py-6 pb-20 space-y-6">
          {viewMode === 'my-share' ? (
            /* My Share View */
            <div className="space-y-6">
              {/* My Share Header */}
              <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                
                {/* Confirmed Orders (In Kitchen) */}
                <div className="mb-6">
                  <div className="mb-4">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                      <h4 className="text-base font-bold text-gray-900">Confirmed Orders (In Kitchen)</h4>
                    </div>
                    <p className="text-sm text-gray-600">Orders being prepared by our kitchen team</p>
                  </div>

                  {/* Confirmed Orders Content */}
                  {loadingConfirmedOrders ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto mb-4"></div>
                      <p className="text-gray-600">Loading confirmed orders...</p>
                    </div>
                  ) : confirmedOrders.length > 0 ? (
                    <div className="space-y-3">
                      {confirmedOrders
                        .filter(order => ['waiting', 'preparing', 'ready', 'served'].includes(order.status))
                        .map((item) => {
                          const menuItem = Array.isArray(item.menu_items) ? item.menu_items[0] : item.menu_items;
                          const splitBill = Array.isArray(item.split_bills) ? item.split_bills[0] : item.split_bills;
                          const itemName = menuItem?.name || 'Unknown Item';
                          const itemPrice = menuItem?.price || 0;
                          const isSplit = !!item.split_bill_id && !!splitBill;
                          const splitPrice = splitBill?.split_price || 0;
                          const splitCount = splitBill?.split_count || 1;
                          const originalPrice = splitBill?.original_price || (itemPrice * item.quantity);
                          
                          return (
                            <div key={item.id} className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-1">
                                  <span className="font-semibold text-gray-900 text-base">{itemName}</span>
                                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(item.status)}`}>
                                    {item.status}
                                  </span>
                                  {item.status === 'served' && (
                                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                                      Ready for Payment
                                    </span>
                                  )}
                                  {item.is_shared && (
                                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                                      Shared
                                    </span>
                                  )}
                                  {isSplit && (
                                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
                                      Split
                                    </span>
                                  )}
                                  {item.is_takeaway && (
                                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-800">
                                      Takeaway
                                    </span>
                                  )}
                                </div>
                                <div className="text-sm text-gray-600">
                                  {isSplit ? (
                                    <>
                                      P{originalPrice.toFixed(2)} total
                                      <br />
                                      <span className="text-purple-600">Split {splitCount} ways: P{splitPrice.toFixed(2)} per person</span>
                                    </>
                                  ) : (
                                    <>P{itemPrice.toFixed(2)} × {item.quantity}</>
                                  )}
                                </div>
                                {item.notes && (
                                  <div className="text-xs text-gray-500 mt-1">
                                    Note: {item.notes}
                                  </div>
                                )}
                              </div>
                              <span className="font-bold text-gray-900 text-base">
                                P{isSplit ? splitPrice.toFixed(2) : (itemPrice * item.quantity).toFixed(2)}
                              </span>
                            </div>
                          );
                        })}
                    </div>
                  ) : (
                    <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                      <div className="text-gray-400 mb-2">
                        <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <p className="text-gray-500 text-lg mb-1">No confirmed orders yet</p>
                      <p className="text-gray-400 text-sm">Orders will appear here after confirmation</p>
                    </div>
                  )}
                </div>

                {/* Pending Orders (In Cart) */}
                <div className="mb-6">
                  <div className="mb-4">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                      <h4 className="text-base font-bold text-gray-900">Pending Orders (In Cart)</h4>
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-orange-500 text-white">
                        {(cartItems || []).length} items
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">Items waiting to be confirmed and sent to kitchen</p>
                  </div>
                  
                  {/* Real cart items */}
                  <div className="space-y-3 mb-4">
                    {(cartItems || []).length > 0 ? (
                      (cartItems || []).map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-4 bg-white rounded-lg border-2 border-dashed border-orange-400">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <span className="font-semibold text-gray-900 text-base">{item.name}</span>
                              <span className="px-2 py-1 text-xs font-medium rounded-full text-orange-800 bg-orange-200">
                                pending
                              </span>
                              {item.isSplit && (
                                <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                                  Split
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-gray-600">
                              {item.isSplit ? (
                                <>
                                  P{(item.originalPrice || (item.price * item.quantity)).toFixed(2)} total
                                  <br />
                                  <span className="text-blue-600">Split {item.splitCount} ways: P{item.splitPrice?.toFixed(2)} per person</span>
                                </>
                              ) : (
                                <>P{item.price.toFixed(2)} × {item.quantity}</>
                              )}
                            </div>
                          </div>
                          <span className="font-bold text-gray-900 text-base">
                            P{item.isSplit && item.splitPrice ? item.splitPrice.toFixed(2) : (item.price * item.quantity).toFixed(2)}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                        <div className="text-gray-400 mb-2">
                          <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <p className="text-gray-500 text-lg mb-1">No items in cart</p>
                        <p className="text-gray-400 text-sm">Add items from the menu to confirm them here</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <button 
                      onClick={async () => {
                        if (isConfirming) return;
                        
                        setIsConfirming(true);
                        try {
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
                          // Small delay to ensure database consistency
                          await new Promise(resolve => setTimeout(resolve, 500));
                          
                          // Refresh the confirmed orders to show the new items
                          await loadConfirmedOrders();
                          
                          // Clear the cart items from the UI
                          await loadCartItems();
                          
                          // Show success message
                          alert('Orders confirmed and sent to kitchen!');
                        } catch (error) {
                          console.error('❌ Error confirming orders:', error);
                          alert(`Failed to confirm orders: ${error instanceof Error ? error.message : 'Unknown error'}`);
                        } finally {
                          setIsConfirming(false);
                        }
                      }}
                      disabled={isConfirming || (cartItems || []).length === 0}
                      className={`w-full py-3 px-4 rounded-lg font-semibold transition-colors flex items-center justify-center space-x-2 ${
                        isConfirming || (cartItems || []).length === 0
                          ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                          : 'bg-orange-500 text-white hover:bg-orange-600'
                      }`}
                    >
                      {isConfirming ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          <span>Confirming...</span>
                        </>
                      ) : (
                        <span>Confirm & Send to Kitchen</span>
                      )}
                    </button>
                    
                    <button 
                      onClick={() => {
                        window.location.href = `/cart-review?sessionId=${sessionId}`;
                      }}
                      className="w-full border-2 border-orange-500 text-orange-600 py-2 px-4 rounded-lg font-medium hover:bg-orange-50 transition-colors"
                    >
                      Review Cart Details
                    </button>
                  </div>
                </div>

                {/* Summary */}
                <div className="bg-blue-50 rounded-lg p-4 mb-4">
                  <h4 className="text-sm font-semibold text-gray-800 mb-4">Payment Summary</h4>
                  
                  {/* Status Breakdown */}
                  <div className="space-y-3 mb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                        <span className="text-sm text-gray-700">Confirmed Orders:</span>
                      </div>
                      <span className="font-semibold text-gray-900">P{currentDinerShare.subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                        <span className="text-sm text-gray-700">Pending in Cart:</span>
                      </div>
                      <span className="font-semibold text-gray-900">P{cartSubtotal.toFixed(2)}</span>
                    </div>
                  </div>
                  
                  {/* Financial Breakdown */}
                  <div className="border-t border-gray-300 pt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 font-bold">Subtotal:</span>
                      <span className="font-bold text-gray-900">P{(currentDinerShare.subtotal + cartSubtotal).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span className="font-bold">VAT (14%):</span>
                      <span className="font-bold">P{((currentDinerShare.subtotal + cartSubtotal) * 0.14).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold mt-3 pt-2 border-t border-gray-200">
                      <span className="text-gray-900">Your Total:</span>
                      <span className="text-[#00d9ff]">P{((currentDinerShare.subtotal + cartSubtotal) * 1.14).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tip Message */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                <div className="flex items-center space-x-2">
                  <span className="text-yellow-600">💡</span>
                  <span className="text-sm text-yellow-800">
                    Tip: Your cart items are pending. Confirm your order to send them to the kitchen!
                  </span>
                </div>
              </div>

              {/* Payment Button */}
              <button
                onClick={handleRequestPayment}
                disabled={!allOrdersServed || !hasOrders}
                className={`w-full py-3 px-4 rounded-lg font-semibold transition-colors flex items-center justify-center space-x-2 shadow-sm ${
                  allOrdersServed && hasOrders
                    ? 'bg-[#00d9ff] text-white hover:bg-[#00c4e6] cursor-pointer'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
                title={
                  !hasOrders 
                    ? 'No orders to pay for' 
                    : !allOrdersServed 
                      ? 'Request payment after all orders are served'
                      : 'Request payment'
                }
              >
                <CreditCard className="w-4 h-4" />
                <span>
                  {!hasOrders 
                    ? 'No Orders' 
                    : !allOrdersServed 
                      ? 'Request Payment after all orders are served' 
                      : `Request Payment - P${((currentDinerShare.subtotal + cartSubtotal) * 1.14).toFixed(2)}`
                  }
                </span>
              </button>
            </div>
          ) : viewMode === 'table-bill' ? (
            /* Table Bill View */
            <div className="space-y-6">
              {/* Table Overview */}
              <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Table {sessionData?.tables?.table_number || (loadingSession ? 'Loading...' : 'Unknown')}
                  </h3>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <Users className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-600">
                        {confirmedOrders.length} orders
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Users className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-600">
                        {(() => {
                          if (confirmedOrders.length === 0) return '0 diners';
                          
                          // Create diner map to count unique diners
                          const dinerMap = new Map();
                          const allParticipants = new Set<string>();
                          
                          // Collect all unique participant names from shared items
                          confirmedOrders.forEach(order => {
                            const splitBill = Array.isArray(order.split_bills) ? order.split_bills[0] : order.split_bills;
                            if (splitBill && splitBill.participants) {
                              splitBill.participants.forEach((participantName: string) => {
                                if (participantName && typeof participantName === 'string' && participantName.trim()) {
                                  allParticipants.add(participantName.trim());
                                }
                              });
                            }
                          });
                          
                          // Add all participants to diner map
                          for (const participantName of allParticipants) {
                            if (participantName && typeof participantName === 'string' && participantName.trim()) {
                              const name = participantName.trim();
                              if (!dinerMap.has(name)) {
                                dinerMap.set(name, { name });
                              }
                            }
                          }
                          
                          // Add "You" for personal items
                          const hasPersonalItems = confirmedOrders.some(order => {
                            const splitBill = Array.isArray(order.split_bills) ? order.split_bills[0] : order.split_bills;
                            return !splitBill || !splitBill.participants || splitBill.participants.length === 0;
                          });
                          
                          if (hasPersonalItems && !dinerMap.has('You')) {
                            dinerMap.set('You', { name: 'You' });
                          }
                          
                          return `${dinerMap.size} diners`;
                        })()}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Payment Summary */}
                <div className="bg-blue-50 rounded-lg p-4 mb-4">
                  <h4 className="text-sm font-semibold text-gray-800 mb-3">Payment Summary</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Subtotal:</span>
                      <span className="text-gray-900">P{tableSubtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">VAT (14%):</span>
                      <span className="text-gray-900">P{(tableSubtotal * 0.14).toFixed(2)}</span>
                    </div>
                    <div className="border-t border-gray-200 pt-2">
                      <div className="flex justify-between text-lg font-semibold">
                        <span className="text-gray-900">Table Total:</span>
                        <span className="text-[#00d9ff]">P{tableTotal.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Request Full Payment Button */}
                  <button
                    onClick={handleRequestPayment}
                    disabled={!allOrdersServed || !hasOrders}
                    className={`w-full mt-4 py-3 px-4 rounded-lg font-semibold transition-colors flex items-center justify-center space-x-2 shadow-sm ${
                      allOrdersServed && hasOrders
                        ? 'bg-[#00d9ff] text-white hover:bg-[#00c4e6] cursor-pointer'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                    title={
                      !hasOrders 
                        ? 'No orders to pay for' 
                        : !allOrdersServed 
                          ? 'Request payment after all orders are served'
                          : 'Request full payment'
                    }
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>
                      {!hasOrders 
                        ? 'No Orders' 
                        : !allOrdersServed 
                          ? 'Request Payment after all orders are served' 
                          : `Request Full Payment - P${tableTotal.toFixed(2)}`
                      }
                    </span>
                  </button>
                </div>
              </div>

              {/* Diner Orders - Show each person's name and their orders */}
              {(() => {
                if (confirmedOrders.length === 0) {
                  return (
                    <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="text-gray-600 mb-2">No confirmed orders yet</p>
                      <p className="text-sm text-gray-500">Orders will appear here once confirmed to the kitchen</p>
                    </div>
                  );
                }
                // Process diners using the same logic as staff dashboard
                const dinerMap = new Map();
                
                // First, collect all unique participant names from shared items
                const allParticipants = new Set<string>();
                
                confirmedOrders.forEach(order => {
                  // Add all participants from shared items
                  if (order.split_bills && order.split_bills.participants) {
                    order.split_bills.participants.forEach((participant: string) => {
                      allParticipants.add(participant);
                    });
                  }
                  
                  // Also check shared_with array
                  if (order.shared_with && Array.isArray(order.shared_with)) {
                    order.shared_with.forEach((participant: string) => {
                      allParticipants.add(participant);
                    });
                  }
                });
                
                // Create diner entries for all participants
                for (const participantName of allParticipants) {
                  if (participantName && typeof participantName === 'string' && participantName.trim()) {
                    const name = participantName.trim();
                    if (!dinerMap.has(name)) {
                      dinerMap.set(name, {
                        name: name,
                        orders: [],
                        personalTotal: 0,
                        sharedTotal: 0,
                        total: 0
                      });
                    }
                  }
                }
                
                // Now process orders and assign them to the correct diners
                confirmedOrders.forEach(order => {
                  const menuItem = Array.isArray(order.menu_items) ? order.menu_items[0] : order.menu_items;
                  const splitBill = Array.isArray(order.split_bills) ? order.split_bills[0] : order.split_bills;
                  const isShared = !!splitBill && splitBill.participants && splitBill.participants.length > 0;
                  
                  if (isShared && splitBill.participants) {
                    // For shared items, add to all participants
                    splitBill.participants.forEach((participantName: string) => {
                      const diner = dinerMap.get(participantName);
                      if (diner) {
                        const itemPrice = (splitBill.split_price || 0) * order.quantity;
                        diner.orders.push({
                          ...order,
                          itemName: menuItem?.name || 'Unknown Item',
                          itemPrice,
                          isShared: true,
                          sharedWith: splitBill.participants,
                          splitCount: splitBill.split_count || 1
                        });
                        diner.sharedTotal += itemPrice;
                      }
                    });
                  } else {
                    // For personal items, assign them to "You" since we don't have diner_name
                    const diner = dinerMap.get('You');
                    if (diner) {
                      const itemPrice = (menuItem?.price || 0) * order.quantity;
                      diner.orders.push({
                        ...order,
                        itemName: menuItem?.name || 'Unknown Item',
                        itemPrice,
                        isShared: false
                      });
                      diner.personalTotal += itemPrice;
                    }
                  }
                });
                
                // Calculate totals for each diner (including VAT)
                dinerMap.forEach(diner => {
                  const subtotal = diner.personalTotal + diner.sharedTotal;
                  const vat = subtotal * 0.14; // 14% VAT
                  diner.total = subtotal + vat;
                });
                
                if (dinerMap.size === 0) {
                  return (
                    <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="text-gray-600 mb-2">No diners found</p>
                      <p className="text-sm text-gray-500">Orders will appear here once confirmed to the kitchen</p>
                    </div>
                  );
                }

                return Array.from(dinerMap.values()).map((diner, index) => (
                  <div key={index} className="bg-white border border-purple-200 rounded-lg p-4 shadow-sm">
                    {/* Diner Header - Purple styling */}
                    <div className="flex items-center justify-between mb-4 pb-3 border-b border-purple-200">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center text-white font-semibold text-lg">
                          {diner.name.charAt(0)}
                        </div>
                        <div>
                          <h5 className="font-semibold text-gray-900 text-lg">{diner.name}</h5>
                          <p className="text-sm text-gray-600">{diner.orders.length} order{diner.orders.length !== 1 ? 's' : ''}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-600">Total</div>
                        <div className="font-bold text-purple-600 text-xl">
                          P{diner.total.toFixed(2)}
                        </div>
                      </div>
                    </div>
                    
                    {/* Diner's Orders - Personal items first, then shared items */}
                    <div className="space-y-4">
                      {diner.orders.length > 0 ? (
                        (() => {
                          // Separate personal and shared orders
                          const personalOrders = diner.orders.filter((order: any) => !order.isShared);
                          const sharedOrders = diner.orders.filter((order: any) => order.isShared);
                          
                          return (
                            <>
                              {/* Personal Items Section */}
                              {personalOrders.length > 0 && (
                                <div className="space-y-3">
                                  <div className="flex items-center space-x-2 mb-2">
                                    <User className="w-4 h-4 text-green-600" />
                                    <h6 className="text-sm font-semibold text-green-700">Personal Items</h6>
                                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                                      {personalOrders.length}
                                    </span>
                                  </div>
                                  {personalOrders.map((order: any) => (
                                    <div key={order.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                                      <div className="flex-1">
                                        <div className="flex items-center space-x-2 mb-1">
                                          <span className="font-medium text-gray-900">{order.itemName}</span>
                                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(order.status)}`}>
                                            {order.status}
                                          </span>
                                          {order.status === 'served' && (
                                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                                              Ready for Payment
                                            </span>
                                          )}
                                          {order.is_takeaway && (
                                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-800">
                                              Takeaway
                                            </span>
                                          )}
                                        </div>
                                        <div className="text-sm text-gray-600">
                                          Personal order • P{order.itemPrice.toFixed(2)} total
                                        </div>
                                        {order.notes && (
                                          <div className="text-sm text-gray-500 mt-1">
                                            Note: {order.notes}
                                          </div>
                                        )}
                                      </div>
                                      <div className="text-right">
                                        <div className="font-semibold text-gray-900">
                                          P{order.itemPrice.toFixed(2)}
                                        </div>
                                        <div className="text-sm text-gray-500">total</div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                              
                              {/* Shared Items Section */}
                              {sharedOrders.length > 0 && (
                                <div className="space-y-3">
                                  <div className="flex items-center space-x-2 mb-2">
                                    <Users className="w-4 h-4 text-blue-600" />
                                    <h6 className="text-sm font-semibold text-blue-700">Shared Items</h6>
                                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                                      {sharedOrders.length}
                                    </span>
                                  </div>
                                  {sharedOrders.map((order: any) => (
                                    <div key={order.id} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                                      <div className="flex-1">
                                        <div className="flex items-center space-x-2 mb-1">
                                          <span className="font-medium text-gray-900">{order.itemName}</span>
                                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(order.status)}`}>
                                            {order.status}
                                          </span>
                                          {order.status === 'served' && (
                                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                                              Ready for Payment
                                            </span>
                                          )}
                                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                                            Shared
                                          </span>
                                          {order.is_takeaway && (
                                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-800">
                                              Takeaway
                                            </span>
                                          )}
                                        </div>
                                        <div className="text-sm text-gray-600">
                                          Shared by: {order.sharedWith ? order.sharedWith.join(', ') : 'Unknown'} • Split {order.splitCount} ways: P{order.itemPrice.toFixed(2)} per person
                                        </div>
                                        {order.notes && (
                                          <div className="text-sm text-gray-500 mt-1">
                                            Note: {order.notes}
                                          </div>
                                        )}
                                      </div>
                                      <div className="text-right">
                                        <div className="font-semibold text-gray-900">
                                          P{order.itemPrice.toFixed(2)}
                                        </div>
                                        <div className="text-sm text-gray-500">per person</div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </>
                          );
                        })()
                      ) : (
                        <div className="text-center py-4 text-gray-500">
                          <p>No orders yet</p>
                        </div>
                      )}
                    </div>
                  </div>
                ));
              })()}
              
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default LiveBill;

