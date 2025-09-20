'use client';

// React imports
import { useState, useEffect } from 'react';
import Link from 'next/link';

// Supabase imports
import { supabase } from '@/lib/supabase';

interface CartButtonProps {
  sessionId: string;
}

export default function CartButton({ sessionId }: CartButtonProps) {
  const [itemCount, setItemCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchOrderCount = async () => {
      try {
        const { data, error } = await supabase
          .from('orders')
          .select('id')
          .eq('session_id', sessionId)
          .eq('status', 'placed');

        if (error) throw error;
        
        setItemCount(data?.length || 0);
      } catch (error) {
        console.error('Error fetching order count:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrderCount();

    // Set up real-time subscription
    const channel = supabase
      .channel('orders_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `session_id=eq.${sessionId}`
        },
        () => {
          fetchOrderCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  if (isLoading) {
    return (
      <div className="fixed bottom-6 right-6 z-40">
        <div className="w-14 h-14 bg-[#00d9ff] rounded-full flex items-center justify-center shadow-lg">
          <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <Link
      href={`/order-review?sessionId=${sessionId}`}
      className="fixed bottom-6 right-6 z-40 group"
    >
      <div className="relative">
        <div className="w-14 h-14 bg-[#00d9ff] rounded-full flex items-center justify-center shadow-lg hover:bg-[#00c4e6] transition-colors">
          <span className="text-white text-xl">🛒</span>
        </div>
        {itemCount > 0 && (
          <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
            {itemCount > 99 ? '99+' : itemCount}
          </div>
        )}
      </div>
    </Link>
  );
}
