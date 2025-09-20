'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ShoppingCart, Menu, Receipt, Phone } from 'lucide-react';
import MenuDisplay from '@/app/components/MenuDisplay';
import PinCopyButton from '@/app/components/PinCopyButton';
import { heroBannerPlaceholder } from '@/lib/placeholder-images';
import { CartProvider, useCart } from '@/contexts/CartContext';

interface SessionData {
  id: string;
  started_by_name: string;
  tables: {
    table_number: string;
    current_pin: string;
  };
}

interface MenuCategories {
  [key: string]: Array<{
    id: string;
    name: string;
    price: number;
    category: string;
    description: string;
    rating: number | null;
    preparation_time: string;
  }>;
}

interface SessionPageClientProps {
  session: SessionData;
  categories: MenuCategories;
  restaurantName?: string;
}

function SessionContent({ session, categories, restaurantName }: SessionPageClientProps) {
  const { state } = useCart();
  const [isClient, setIsClient] = useState(false);
  const itemCount = state.items?.length || 0;

  useEffect(() => {
    setIsClient(true);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[480px] mx-auto bg-white min-h-screen">
        {/* Restaurant Name - At the very top - More Prominent */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-3">
          <h1 className="text-2xl font-bold text-center text-gray-800 mb-3">
            {restaurantName || 'Restaurant'}
          </h1>
        </div>

        {/* Customer Info - Above Banner - Reduced Size */}
        <div className="bg-white rounded-xl shadow-sm p-3 mb-3">
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-500">
              Table {session.tables?.table_number} • {session.started_by_name}
            </div>
            {session.tables?.current_pin && (
              <div className="flex items-center space-x-2">
                <span className="text-xs text-gray-500">PIN:</span>
                <div className="flex items-center space-x-1">
                  <span className="text-sm font-bold text-blue-600 font-mono bg-blue-50 px-2 py-1 rounded">
                    {session.tables.current_pin}
                  </span>
                  <PinCopyButton pin={session.tables.current_pin} />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Hero Banner with Promotional Overlay */}
        <div className="relative mb-4 rounded-xl overflow-hidden shadow-sm">
          {/* Background Image */}
          <div className="h-32 relative">
            <img 
              src={heroBannerPlaceholder} 
              alt="Restaurant Special" 
              className="w-full h-full object-cover"
            />
            {/* Promotional Text Overlay */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4 bg-black bg-opacity-30">
              <h2 className="text-white text-lg font-bold mb-1">Special Offer!</h2>
              <p className="text-white text-sm opacity-90">20% off all desserts today</p>
            </div>
          </div>
        </div>
        
        <div className="px-4 pb-20">
          <MenuDisplay 
            categories={categories} 
            sessionId={session.id} 
          />
        </div>

        {/* Original Bottom Navigation Bar */}
        {isClient && (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
            <div className="max-w-[480px] mx-auto">
              <div className="flex items-center justify-around py-2">
                {/* Menu Button */}
                <Link
                  href={`/session/${session.id}`}
                  className="flex flex-col items-center py-2 px-3 text-gray-600 hover:text-[#00d9ff] transition-colors"
                >
                  <Menu className="w-6 h-6 mb-1" />
                  <span className="text-xs font-medium">Menu</span>
                </Link>

                {/* Live Bill Button */}
                <Link
                  href={`/live-bill?sessionId=${session.id}`}
                  className="flex flex-col items-center py-2 px-3 text-gray-600 hover:text-[#00d9ff] transition-colors"
                >
                  <Receipt className="w-6 h-6 mb-1" />
                  <span className="text-xs font-medium">Live Bill</span>
                </Link>

                {/* Cart Button */}
                <Link
                  href={`/cart-review?sessionId=${session.id}`}
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
        )}
      </div>
    </div>
  );
}

export default function SessionPageClient({ session, categories, restaurantName }: SessionPageClientProps) {
  return (
    <CartProvider sessionId={session.id}>
      <SessionContent 
        session={session} 
        categories={categories} 
        restaurantName={restaurantName} 
      />
    </CartProvider>
  );
}
