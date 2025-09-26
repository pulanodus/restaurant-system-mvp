'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ShoppingCart, Menu, Receipt, Bell } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';

interface GlobalNavigationProps {
  sessionId?: string;
  className?: string;
}

export default function GlobalNavigation({ sessionId, className = '' }: GlobalNavigationProps) {
  const { state } = useCart();
  const searchParams = useSearchParams();
  const [showWaiterOptions, setShowWaiterOptions] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  
  // Get sessionId from props, searchParams, or cart context
  const currentSessionId = sessionId || searchParams.get('sessionId') || state.sessionId;
  // Get dinerName from cart context or URL parameters as fallback
  const currentDinerName = state.dinerName || searchParams.get('dinerName');
  const itemCount = state.items?.length || 0;

  // Don't render if no sessionId is available
  if (!currentSessionId) {
    return null;
  }

  const handleWaiterRequest = async (requestType: 'bill' | 'help') => {
    setIsRequesting(true);
    try {
      const response = await fetch('/api/waiter/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: currentSessionId,
          requestType,
          timestamp: new Date().toISOString()
        }),
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        alert(`${requestType === 'bill' ? 'Bill request' : 'Help request'} sent to staff!`);
      } else {
        alert('Failed to send request. Please try again.');
      }
    } catch (error) {
      console.error('Error sending waiter request:', error);
      alert('Failed to send request. Please try again.');
    } finally {
      setIsRequesting(false);
      setShowWaiterOptions(false);
    }
  };

  return (
    <div className={`fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 ${className}`}>
      <div className="max-w-[480px] mx-auto">
        <div className="flex items-center justify-around py-2">
          {/* Menu Button */}
          <Link
            href={`/session/${currentSessionId}${currentDinerName ? `?dinerName=${encodeURIComponent(currentDinerName)}` : ''}`}
            className="flex flex-col items-center py-2 px-3 text-gray-600 hover:text-[#00d9ff] transition-colors"
          >
            <Menu className="w-6 h-6 mb-1" />
            <span className="text-xs font-medium">Menu</span>
          </Link>

          {/* Live Bill Button */}
          <Link
            href={`/live-bill?sessionId=${currentSessionId}${currentDinerName ? `&dinerName=${encodeURIComponent(currentDinerName)}` : ''}`}
            className="flex flex-col items-center py-2 px-3 text-gray-600 hover:text-[#00d9ff] transition-colors"
          >
            <Receipt className="w-6 h-6 mb-1" />
            <span className="text-xs font-medium">Live Bill</span>
          </Link>

          {/* Cart Button */}
          <Link
            href={`/cart-review?sessionId=${currentSessionId}${currentDinerName ? `&dinerName=${encodeURIComponent(currentDinerName)}` : ''}`}
            className="flex flex-col items-center py-2 px-3 text-gray-600 hover:text-[#00d9ff] transition-colors relative"
          >
            <ShoppingCart className="w-6 h-6 mb-1" />
            <span className="text-xs font-medium">Cart</span>
            {itemCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-[#00d9ff] text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
                {itemCount}
              </span>
            )}
          </Link>

          {/* Call Waiter Button */}
          <div className="relative">
            <button
              onClick={() => setShowWaiterOptions(!showWaiterOptions)}
              disabled={isRequesting}
              className="flex flex-col items-center py-2 px-3 text-gray-600 hover:text-[#00d9ff] transition-colors disabled:opacity-50"
            >
              <Bell className="w-6 h-6 mb-1" />
              <span className="text-xs font-medium">Call Waiter</span>
            </button>

            {/* Waiter Options Dropdown */}
            {showWaiterOptions && (
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[140px]">
                <button
                  onClick={() => handleWaiterRequest('bill')}
                  disabled={isRequesting}
                  className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 first:rounded-t-lg disabled:opacity-50"
                >
                  📋 Request Bill
                </button>
                <button
                  onClick={() => handleWaiterRequest('help')}
                  disabled={isRequesting}
                  className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 last:rounded-b-lg disabled:opacity-50"
                >
                  ❓ Need Help
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
