import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseUrl, getSupabaseServiceKey } from '@/lib/secure-env';

export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json();
    
    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    const supabaseUrl = getSupabaseUrl();
    const supabaseServiceKey = getSupabaseServiceKey();
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      db: {
        schema: 'public'
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // First, get all orders for this session to clean up split bills
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id, split_bill_id')
      .eq('session_id', sessionId)
      .eq('status', 'placed');

    if (ordersError) {
      console.error('Error fetching orders for cleanup:', ordersError);
      return NextResponse.json({ error: 'Failed to fetch orders for cleanup' }, { status: 500 });
    }

    // Get unique split bill IDs that need to be cleaned up
    const splitBillIds = [...new Set(orders?.map(order => order.split_bill_id).filter(Boolean))];
    
    if (splitBillIds.length > 0) {
      // Delete split bills that are no longer referenced
      const { error: splitBillError } = await supabase
        .from('split_bills')
        .delete()
        .in('id', splitBillIds);

      if (splitBillError) {
        console.error('Error deleting split bills:', splitBillError);
        // Don't fail the request, just log the error
      }
    }

    // Delete all orders for this session
    const { error: deleteError } = await supabase
      .from('orders')
      .delete()
      .eq('session_id', sessionId)
      .eq('status', 'placed');

    if (deleteError) {
      console.error('Error deleting orders:', deleteError);
      return NextResponse.json({ error: 'Failed to clear cart' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Cart cleared successfully',
      deletedOrders: orders?.length || 0,
      deletedSplitBills: splitBillIds.length
    });

  } catch (error) {
    console.error('Error clearing cart:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}