import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { withApiErrorHandling } from '@/lib/error-handling'wrappers';
import { logDetailedError } from '@/lib/error-handling';

export const GET = withApiErrorHandling(async (request: NextRequest, { params }: { params: Promise<{ sessionId: string }> }) => {
  try {
    const { sessionId } = await params;
    console.log('🔧 API: Fetching orders for session:', sessionId);

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Fetch orders with menu item details
    const { data: orders, error: ordersError } = await supabaseServer
      .from('orders')
      .select(`
        id,
        quantity,
        status,
        created_at,
        menu_items!orders_menu_item_id_fkey(
          id,
          name,
          price
        )
      `)
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (ordersError) {
      logDetailedError('Failed to fetch session orders', ordersError);
      return NextResponse.json(
        { error: 'Failed to fetch orders' },
        { status: 500 }
      );
    }

    console.log('✅ Session orders fetched successfully:', orders?.length || 0, 'orders');

    return NextResponse.json({
      success: true,
      orders: orders || [],
      count: orders?.length || 0
    });

  } catch (error) {
    console.error('🔍 API: Fetch session orders exception:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});
