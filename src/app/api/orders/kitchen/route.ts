import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { handleError } from '@/lib/error-handling';

// Retry wrapper for database operations
async function withRetry<T>(
  operation: () => Promise<T>,
  operationName: string,
  maxRetries: number = 3
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      // Check if it's a network/connection error
      const isNetworkError = error && (
        (error as any).message?.includes('fetch failed') ||
        (error as any).message?.includes('ECONNRESET') ||
        (error as any).message?.includes('ETIMEDOUT')
      );
      
      if (isNetworkError && attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        console.warn(`🔄 Retrying ${operationName} in ${delay}ms (attempt ${attempt}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      throw error;
    }
  }
  
  throw lastError;
}

export const GET = async (request: NextRequest) => {
  try {
    console.log('🔧 API: Fetching daily kitchen orders');
    
    // Get orders from the last 24 hours (more flexible than just today)
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    console.log('📅 Fetching orders from last 24 hours:', last24Hours.toISOString(), 'to:', now.toISOString());


    // Get all orders from the last 24 hours (including completed ones) with retry logic
    const result = await withRetry(
      async () => await supabaseServer
        .from('orders')
        .select(`
          id,
          session_id,
          menu_item_id,
          quantity,
          status,
          created_at,
          notes,
          is_shared,
          is_takeaway,
          menu_items (
            id,
            name,
            price
          ),
          sessions!orders_session_id_fkey (
            id,
            table_id,
            started_by_name,
            created_at,
            tables!sessions_table_id_fkey (
              id,
              table_number,
              capacity
            )
          )
        `)
        .gte('created_at', last24Hours.toISOString())
        .in('status', ['waiting', 'preparing', 'ready', 'served'])
        .order('created_at', { ascending: true }),
      'fetch kitchen orders'
    );
    
    const { data: orders, error } = result as any;

    if (error) {
      console.error('❌ Database error:', error);
      return NextResponse.json(
        { error: `Failed to fetch kitchen orders: ${error.message}` },
        { status: 500 }
      );
    }

    console.log('✅ Daily kitchen orders fetched:', orders?.length || 0);

    // Group orders by session and transform the data
    const sessionMap = new Map();
    
    orders?.forEach((order: any) => {
      const sessionId = order.session_id;
      const tableNumber = (order.sessions as any)?.tables?.table_number || 'Unknown';
      
      if (!sessionMap.has(sessionId)) {
        sessionMap.set(sessionId, {
          id: order.id,
          session_id: sessionId,
          table_number: tableNumber,
          status: order.status,
          created_at: order.created_at,
          order_items: [],
          session: {
            id: (order.sessions as any)?.id,
            table_id: (order.sessions as any)?.table_id,
            started_by_name: (order.sessions as any)?.started_by_name,
            created_at: (order.sessions as any)?.created_at
          }
        });
      }
      
      // Add order item to the session
      sessionMap.get(sessionId).order_items.push({
        id: order.id,
        menu_item_id: order.menu_item_id,
        quantity: order.quantity,
        status: order.status,
        created_at: order.created_at,
        special_instructions: order.notes,
        menu_item: order.menu_items
      });
    });

    const transformedOrders = Array.from(sessionMap.values());

    return NextResponse.json({
      success: true,
      confirmedOrders: transformedOrders,
      count: transformedOrders.length
    });

  } catch (error) {
    console.error('🔍 API: Kitchen orders exception:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
};
