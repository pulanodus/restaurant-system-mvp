import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { handleError } from '@/lib/error-handling';

// GET /api/orders/confirm - Get confirmed orders for a session
export const GET = async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('sessionId');

  if (!sessionId) {
    return NextResponse.json({
      error: 'Session ID is required'
    }, { status: 400 });
  }

    // Check if this is a request from the Live Bill component (which should filter out paid orders)
    // vs a normal order confirmation request
    const isLiveBillRequest = searchParams.get('isLiveBillRequest') === 'true';
    
    if (isLiveBillRequest) {
      // First, check if the session is still active
      const { data: sessionData, error: sessionError } = await supabaseServer
        .from('sessions')
        .select('status')
        .eq('id', sessionId)
        .single();

      if (sessionError) {
        console.error('❌ Error fetching session data:', sessionError);
        return NextResponse.json({ 
          error: 'Failed to fetch session data',
          details: sessionError.message
        }, { status: 500 });
      }

      // If session is cancelled, return empty array (no orders to show in Live Bill)
      // If session is completed, we still want to show served orders for payment
      if (sessionData?.status === 'cancelled') {
        return NextResponse.json({
          success: true,
          confirmedOrders: []
        });
      }
      
      }

    // Get all confirmed orders (preparing, ready, served) for this session
    // EXCLUDE orders that have already been paid for (status = 'paid')
    // Only show orders that are currently being prepared or ready to serve
    const { data: confirmedOrders, error } = await supabaseServer
      .from('orders')
      .select(`
        id,
        menu_item_id,
        quantity,
        notes,
        is_shared,
        is_takeaway,
        status,
        created_at,
        split_bill_id,
        menu_items (
          id,
          name,
          price
        ),
        split_bills (
          id,
          original_price,
          split_price,
          split_count,
          participants
        )
      `)
      .eq('session_id', sessionId)
      .in('status', ['waiting', 'preparing', 'ready', 'served'])  // Include waiting orders and active kitchen orders
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching confirmed orders:', error);
      console.error('❌ Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      return NextResponse.json({ 
        error: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      }, { status: 500 });
    }

    // Debug: Log all order statuses to see what we're getting
    if (confirmedOrders && confirmedOrders.length > 0) {
      const statusCounts = confirmedOrders.reduce((acc, order) => {
        acc[order.status] = (acc[order.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      }

    return NextResponse.json({
      success: true,
      confirmedOrders: confirmedOrders || []
    });
});

export const POST = async (request: NextRequest) => {
  const body = await request.json();
    const { sessionId } = body;
    
    console.log('  - sessionId:', sessionId);
    console.log('  - sessionId type:', typeof sessionId);
    console.log('  - sessionId length:', sessionId?.length);

    // Validate input
    if (!sessionId) {
      return NextResponse.json({ 
        success: false, 
        error: 'SessionId is required',
        debug: { sessionId }
      }, { status: 400 });
    }

    // Use supabaseServer for database operations

    const { data: existingOrders, error: checkError } = await supabaseServer
      .from('orders')
      .select('*')
      .eq('session_id', sessionId);
      
    if (checkError) {
      return NextResponse.json({ error: checkError.message }, { status: 500 });
    }

    const { data: placedOrders, error: placedError } = await supabaseServer
      .from('orders')
      .select('*')
      .eq('session_id', sessionId)
      .eq('status', 'placed');
      
    if (placedError) {
      return NextResponse.json({ error: placedError.message }, { status: 500 });
    }

    if (!placedOrders || placedOrders.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No orders to confirm',
        confirmedOrders: [],
        debug: {
          sessionId,
          totalOrders: existingOrders?.length || 0,
          placedOrders: 0
        }
      });
    }

    // Update all cart items to 'waiting' status (confirmed orders waiting for kitchen)
    const { data: updatedOrders, error: updateError } = await supabaseServer
      .from('orders')
      .update({ 
        status: 'waiting'
      })
      .eq('session_id', sessionId)
      .eq('status', 'placed')
      .select(`
        id,
        menu_item_id,
        quantity,
        notes,
        is_shared,
        is_takeaway,
        status,
        created_at,
        split_bill_id,
        menu_items (
          id,
          name,
          price
        ),
        split_bills (
          id,
          original_price,
          split_price,
          split_count,
          participants
        )
      `);

    if (updateError) {
      console.error('❌ Error updating orders to preparing:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Final verification
    const { data: finalOrders, error: finalError } = await supabaseServer
      .from('orders')
      .select('*')
      .eq('session_id', sessionId);
      
    if (finalError) {
      } else {
      }

    // Add a small delay to ensure database consistency
    await new Promise(resolve => setTimeout(resolve, 100));

    return NextResponse.json({
      success: true,
      message: 'Orders confirmed and sent to kitchen',
      confirmedOrders: updatedOrders || [],
      debug: {
        sessionId,
        placedOrdersFound: placedOrders?.length || 0,
        ordersUpdated: updatedOrders?.length || 0,
        finalOrdersInDB: finalOrders?.length || 0
      }
    });
});