'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
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
      <div className="max-w-[480px] mx-auto bg-gray-50 min-h-screen">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 py-4">
          <div className="flex items-center justify-between">
            <Link 
              href="/"
              className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-gray-100 transition-colors"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-lg font-semibold text-gray-900">Menu</h1>
            <div className="w-10"></div> {/* Spacer for centering */}
          </div>
        </div>

        {/* Session Info */}
        <div className="px-4 py-3">
          {/* Restaurant Name */}
          <div className="bg-white rounded-xl shadow-sm p-4 mb-3">
            <h1 className="text-2xl font-bold text-center text-gray-800 mb-3">
              {restaurantName || 'Restaurant'}
            </h1>
          </div>
          
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
      </div>
    </CartProvider>
  );
}
