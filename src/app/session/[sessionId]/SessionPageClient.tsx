'use client';

import React from 'react';
import Link from 'next/link';
import { ShoppingCart } from 'lucide-react';
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
  const itemCount = state.items?.length || 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[480px] mx-auto bg-white min-h-screen">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-4 z-10">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h1 className="text-lg font-semibold text-gray-900 text-center">
                {restaurantName || 'Restaurant'}
              </h1>
              <div className="text-xs text-gray-500 text-center mt-1">
                Table {session.tables?.table_number} • {session.started_by_name}
              </div>
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

        {/* Content */}
        <div className="px-4 py-6">
          {/* Hero Banner with Promotional Overlay */}
          <div className="relative mb-6 rounded-xl overflow-hidden shadow-sm">
            <div className="h-32 relative">
              <img 
                src={heroBannerPlaceholder} 
                alt="Restaurant Special" 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4 bg-black bg-opacity-30">
                <h2 className="text-white text-lg font-bold mb-1">Special Offer!</h2>
                <p className="text-white text-sm opacity-90">20% off all desserts today</p>
              </div>
            </div>
          </div>
          
          <MenuDisplay 
            categories={categories} 
            sessionId={session.id} 
          />
        </div>

        {/* Bottom Navigation */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 z-20">
          <div className="max-w-[480px] mx-auto flex items-center justify-between">
            <div className="flex-1">
              <Link
                href={`/cart-review?sessionId=${session.id}`}
                className="w-full bg-[#00d9ff] text-white py-3 px-6 rounded-lg font-semibold text-lg hover:bg-[#00c4e6] transition-colors flex items-center justify-center space-x-2"
              >
                <ShoppingCart className="w-5 h-5" />
                <span>View Cart</span>
                {itemCount > 0 && (
                  <span className="bg-white text-[#00d9ff] rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">
                    {itemCount}
                  </span>
                )}
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom padding to account for fixed navigation */}
        <div className="h-20"></div>
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
