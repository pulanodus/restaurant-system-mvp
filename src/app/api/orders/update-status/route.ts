import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { handleError } from '@/lib/error-handling';

export const POST = async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { orderItemId, status } = body;

    if (!orderItemId || !status) {
      return NextResponse.json(
        { error: 'Missing required fields: orderItemId and status' },
        { status: 400 }
      );
    }

    if (!['preparing', 'ready', 'served'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be one of: preparing, ready, served' },
        { status: 400 }
      );
    }

    // Update the order item status
    const { data, error } = await supabaseServer
      .from('orders')
      .update({ 
        status: status
      })
      .eq('id', orderItemId)
      .select(`
        *,
        menu_items!orders_menu_item_id_fkey (
          id,
          name,
          price
        )
      `)
      .single();

    if (error) {
      console.error('❌ Database error:', error);
      return NextResponse.json(
        { error: `Failed to update order status: ${error.message}` },
        { status: 500 }
      );
    }

    // Create notification when order is marked as ready
    if (status === 'ready') {
      try {
        // Get session and table information
        const { data: sessionData, error: sessionError } = await supabaseServer
          .from('sessions')
          .select(`
            id,
            table_id,
            started_by_name,
            tables!sessions_table_id_fkey(
              table_number
            )
          `)
          .eq('id', data.session_id)
          .single();

        if (!sessionError && sessionData) {
          // Create kitchen ready notification
          const { error: notificationError } = await supabaseServer
            .from('notifications')
            .insert({
              session_id: data.session_id,
              type: 'kitchen_ready',
              title: 'Order Ready',
              message: `Table ${Array.isArray(sessionData.tables) ? sessionData.tables[0]?.table_number : (sessionData.tables as any)?.table_number} - ${data.menu_items?.name || 'Unknown Item'} (Qty: ${data.quantity}) is ready for pickup - Assigned to: ${sessionData.started_by_name}`,
              priority: 'high',
              status: 'pending',
              metadata: {
                order_id: data.id,
                menu_item_name: data.menu_items?.name || 'Unknown Item',
                quantity: data.quantity,
                assigned_waitstaff: sessionData.started_by_name
              }
            });

          if (notificationError) {
            console.error('⚠️ Failed to create kitchen ready notification:', notificationError);
          }
        }
      } catch (notificationError) {
        console.error('⚠️ Error creating kitchen ready notification:', notificationError);
        // Don't fail the main operation if notification creation fails
      }
    }

    // Note: We don't mark the session as completed when all items are served
    // The session should remain active until payment is actually processed
    // This allows customers to see their served items and request payment

    return NextResponse.json({
      success: true,
      orderItem: data,
      message: `Order item status updated to ${status}`
    });

  } catch (error) {
    console.error('🔍 API: Update order status exception:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
};
