'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import LiveBill from '@/app/components/LiveBill';
import { CartProvider } from '@/contexts/CartContext';

function LiveBillContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('sessionId');
  const tableId = searchParams.get('tableId');

  return <LiveBill sessionId={sessionId} tableId={tableId} />;
}

export default function LiveBillPage() {
  return (
    <CartProvider>
      <Suspense fallback={<div>Loading...</div>}>
        <LiveBillContent />
      </Suspense>
    </CartProvider>
  );
}
