import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { withApiErrorHandling } from '@/lib/error-handling'wrappers';

export const GET = withApiErrorHandling(async (request: NextRequest, { params }: { params: Promise<{ sessionId: string }> }) => {
  try {
    const { sessionId } = await params;
    
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    console.log('🔧 API: Fetching session total for session:', sessionId);
    
    // Get all orders for this session with menu item prices
    const { data: orders, error } = await supabaseServer
      .from('orders')
      .select(`
        id,
        quantity,
        status,
        menu_items!orders_menu_item_id_fkey (
          id,
          price
        )
      `)
      .eq('session_id', sessionId)
      .in('status', ['placed', 'waiting', 'preparing', 'ready', 'served']);
    
    if (error) {
      console.error('❌ Database error:', error);
      return NextResponse.json(
        { error: `Failed to fetch orders: ${error.message}` },
        { status: 500 }
      );
    }
    
    // Calculate total
    const subtotal = orders?.reduce((sum, order) => {
      const price = order.menu_items?.price || 0;
      return sum + (price * order.quantity);
    }, 0) || 0;
    
    const tax = subtotal * 0.14; // 14% tax
    const total = subtotal + tax;
    
    console.log('✅ Session total calculated:', { sessionId, subtotal, tax, total });
    
    return NextResponse.json({
      success: true,
      total: {
        subtotal,
        tax,
        total,
        itemCount: orders?.length || 0
      }
    });
    
  } catch (error) {
    console.error('🔍 API: Session total exception:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}, 'SESSION_TOTAL');
