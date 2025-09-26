import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { handleError } from '@/lib/error-handling';

export const GET = async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    console.log('🔧 API: Fetching order history for session:', sessionId);

    // Fetch all orders for this session regardless of status
    const { data: orders, error: ordersError } = await supabaseServer
      .from('orders')
      .select(`
        id,
        menu_item_id,
        quantity,
        status,
        diner_name,
        notes,
        split_bill_id,
        is_shared,
        created_at,
        menu_items (
          id,
          name,
          price,
          description
        ),
        split_bills (
          id,
          original_price,
          split_price,
          split_count,
          participants,
          status
        )
      `)
      .eq('session_id', sessionId)
      .in('status', ['confirmed', 'waiting', 'preparing', 'ready', 'served', 'completed'])
      .order('created_at', { ascending: true });

    if (ordersError) {
      console.error('❌ Error fetching order history:', ordersError);
      return NextResponse.json(
        { error: 'Failed to fetch order history' },
        { status: 500 }
      );
    }

    console.log(`✅ Order history fetched: ${orders?.length || 0} orders`);

    return NextResponse.json({
      success: true,
      orders: orders || [],
      count: orders?.length || 0
    });

  } catch (error) {
    console.error('🔍 API: Order history exception:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
};
