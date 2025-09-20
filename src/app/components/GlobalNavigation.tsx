'use client';

import React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ShoppingCart, Menu, Receipt, Phone } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';

interface GlobalNavigationProps {
  sessionId?: string;
  className?: string;
}

export default function GlobalNavigation({ sessionId, className = '' }: GlobalNavigationProps) {
  const { state } = useCart();
  const searchParams = useSearchParams();
  
  // Get sessionId from props, searchParams, or cart context
  const currentSessionId = sessionId || searchParams.get('sessionId') || state.sessionId;
  const itemCount = state.items?.length || 0;

  // Don't render if no sessionId is available
  if (!currentSessionId) {
    return null;
  }

  return (
    <div className={`fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 ${className}`}>
      <div className="max-w-[480px] mx-auto">
        <div className="flex items-center justify-around py-2">
          {/* Menu Button */}
          <Link
            href={`/session/${currentSessionId}`}
            className="flex flex-col items-center py-2 px-3 text-gray-600 hover:text-[#00d9ff] transition-colors"
          >
            <Menu className="w-6 h-6 mb-1" />
            <span className="text-xs font-medium">Menu</span>
          </Link>

          {/* Live Bill Button */}
          <Link
            href={`/live-bill?sessionId=${currentSessionId}`}
            className="flex flex-col items-center py-2 px-3 text-gray-600 hover:text-[#00d9ff] transition-colors"
          >
            <Receipt className="w-6 h-6 mb-1" />
            <span className="text-xs font-medium">Live Bill</span>
          </Link>

          {/* Cart Button */}
          <Link
            href={`/cart-review?sessionId=${currentSessionId}`}
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
          <button
            onClick={() => {
              // TODO: Implement call waiter functionality
              alert('Calling waiter...');
            }}
            className="flex flex-col items-center py-2 px-3 text-gray-600 hover:text-[#00d9ff] transition-colors"
          >
            <Phone className="w-6 h-6 mb-1" />
            <span className="text-xs font-medium">Call Waiter</span>
          </button>
        </div>
      </div>
    </div>
  );
}
