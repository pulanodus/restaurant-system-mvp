'use client';

import React from 'react';
import MenuDisplay from '@/app/components/MenuDisplay';
import PinCopyButton from '@/app/components/PinCopyButton';
import { heroBannerPlaceholder } from '@/lib/placeholder-images';
import { CartProvider } from '@/contexts/CartContext';

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

export default function SessionPageClient({ session, categories, restaurantName }: SessionPageClientProps) {
  return (
    <CartProvider sessionId={session.id}>
      <div className="w-full max-w-[480px] mx-auto px-4 py-4" style={{ minHeight: '100vh' }}>
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
        
        <MenuDisplay 
          categories={categories} 
          sessionId={session.id} 
        />
      </div>
    </CartProvider>
  );
}
