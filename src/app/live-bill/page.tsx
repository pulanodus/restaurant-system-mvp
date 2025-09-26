'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import LiveBill from '@/app/components/LiveBill';
import GlobalNavigation from '@/app/components/GlobalNavigation';
import { CartProvider } from '@/contexts/CartContext';

function LiveBillContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('sessionId');
  const tableId = searchParams.get('tableId');

  return (
    <>
      <LiveBill sessionId={sessionId} tableId={tableId} />
      <GlobalNavigation sessionId={sessionId || undefined} />
    </>
  );
}

function LiveBillPageContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('sessionId');
  const dinerName = searchParams.get('dinerName'); // CRITICAL FIX: Extract diner name from URL
  
  return (
    <CartProvider sessionId={sessionId || ''} dinerName={dinerName || undefined}>
      <LiveBillContent />
    </CartProvider>
  );
}

export default function LiveBillPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Loading...</h1>
          <p className="text-gray-600">Preparing live bill...</p>
        </div>
      </div>
    }>
      <LiveBillPageContent />
    </Suspense>
  );
}
