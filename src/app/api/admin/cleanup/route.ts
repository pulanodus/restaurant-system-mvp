import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { handleError } from '@/lib/error-handling';

export async function POST(request: NextRequest) {
  try {
    // Clear all orders
    const { error: ordersError } = await supabaseServer
      .from('orders')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all orders
    
    if (ordersError) {
      console.error('Error clearing orders:', ordersError);
      throw new Error(`Failed to clear orders: ${ordersError.message}`);
    }
    
    // Clear all cart items
    const { error: cartError } = await supabaseServer
      .from('cart_items')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all cart items
    
    if (cartError) {
      console.error('Error clearing cart items:', cartError);
      throw new Error(`Failed to clear cart items: ${cartError.message}`);
    }
    
    // Clear all sessions
    const { error: sessionsError } = await supabaseServer
      .from('sessions')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all sessions
    
    if (sessionsError) {
      console.error('Error clearing sessions:', sessionsError);
      throw new Error(`Failed to clear sessions: ${sessionsError.message}`);
    }
    
    // Clear all notifications
    const { error: notificationsError } = await supabaseServer
      .from('notifications')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all notifications
    
    if (notificationsError) {
      console.error('Error clearing notifications:', notificationsError);
      throw new Error(`Failed to clear notifications: ${notificationsError.message}`);
    }
    
    // Clear split bills if table exists
    try {
      const { error: splitBillsError } = await supabaseServer
        .from('split_bills')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      
      if (splitBillsError) {
        console.warn('Warning: Could not clear split_bills (table may not exist):', splitBillsError.message);
      }
    } catch (error) {
      console.warn('Warning: split_bills table may not exist');
    }
    
    // Reset all tables to available status
    const { error: tablesError } = await supabaseServer
      .from('tables')
      .update({
        occupied: false,
        current_session_id: null,
        current_pin: null
      })
      .neq('id', '00000000-0000-0000-0000-000000000000');
    
    if (tablesError) {
      console.error('Error resetting tables:', tablesError);
      throw new Error(`Failed to reset tables: ${tablesError.message}`);
    }
    
    return NextResponse.json({
      success: true,
      message: 'Database cleanup completed successfully',
      cleaned: {
        orders: 'All orders cleared',
        cart_items: 'All cart items cleared', 
        sessions: 'All sessions cleared',
        notifications: 'All notifications cleared',
        tables: 'All tables reset to available'
      }
    });
    
  } catch (error) {
    console.error('❌ Database cleanup failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred during cleanup'
    }, { status: 500 });
  }
}

// GET endpoint to check current state
export async function GET() {
  try {
    // Get counts of current data
    const [ordersCount, cartItemsCount, sessionsCount, notificationsCount, tablesCount] = await Promise.all([
      supabaseServer.from('orders').select('id', { count: 'exact', head: true }),
      supabaseServer.from('cart_items').select('id', { count: 'exact', head: true }),
      supabaseServer.from('sessions').select('id', { count: 'exact', head: true }),
      supabaseServer.from('notifications').select('id', { count: 'exact', head: true }),
      supabaseServer.from('tables').select('id', { count: 'exact', head: true })
    ]);
    
    return NextResponse.json({
      success: true,
      current_state: {
        orders: ordersCount.count || 0,
        cart_items: cartItemsCount.count || 0,
        sessions: sessionsCount.count || 0,
        notifications: notificationsCount.count || 0,
        tables: tablesCount.count || 0
      }
    });
    
  } catch (error) {
    console.error('Error checking database state:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
