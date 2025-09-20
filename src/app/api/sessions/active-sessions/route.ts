import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { withApiErrorHandling } from '@/lib/error-handling'wrappers';

export const GET = withApiErrorHandling(async (request: NextRequest) => {
  try {
    console.log('🔧 API: Fetching active sessions with totals');
    
    // Get all active sessions with table information and diners
    const { data: sessions, error } = await supabaseServer
      .from('sessions')
      .select(`
        id,
        table_id,
        status,
        started_by_name,
        created_at,
        payment_status,
        final_total,
        diners,
        tables!sessions_table_id_fkey (
          id,
          table_number,
          capacity
        )
      `)
      .eq('status', 'active')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('❌ Database error:', error);
      return NextResponse.json(
        { error: `Failed to fetch active sessions: ${error.message}` },
        { status: 500 }
      );
    }
    
    // Calculate order totals for each session
    const sessionsWithTotals = await Promise.all(
      (sessions || []).map(async (session) => {
        try {
          // Get orders for this session
          const { data: orders, error: ordersError } = await supabaseServer
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
            .eq('session_id', session.id)
            .in('status', ['waiting', 'preparing', 'ready', 'served']);
          
          if (ordersError) {
            console.warn(`Failed to fetch orders for session ${session.id}:`, ordersError);
            return { ...session, orderTotal: 0 };
          }
          
          // Calculate total
          const subtotal = orders?.reduce((sum, order) => {
            const price = (order.menu_items as any)?.price || 0;
            return sum + (price * order.quantity);
          }, 0) || 0;
          
          const tax = subtotal * 0.14; // 14% tax
          const total = subtotal + tax;
          
          return { 
            ...session, 
            orderTotal: total,
            orderSubtotal: subtotal,
            orderTax: tax,
            orderItemCount: orders?.length || 0
          };
        } catch (error) {
          console.warn(`Error calculating total for session ${session.id}:`, error);
          return { ...session, orderTotal: 0 };
        }
      })
    );
    
    console.log('✅ Active sessions with totals fetched:', sessionsWithTotals?.length || 0);
    
    return NextResponse.json({
      success: true,
      sessions: sessionsWithTotals || [],
      count: sessionsWithTotals?.length || 0
    });
    
  } catch (error) {
    console.error('🔍 API: Active sessions exception:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});
