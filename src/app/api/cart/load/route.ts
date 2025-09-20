import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseUrl, getSupabaseServiceKey } from '@/lib/secure-env';

async function loadCartItems(sessionId: string) {
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

  // First, check if the session is still active
  const { data: session, error: sessionError } = await supabase
    .from('sessions')
    .select('id, status, created_at')
    .eq('id', sessionId)
    .single();

  if (sessionError || !session) {
    console.error('Session not found or error:', sessionError);
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  if (session.status !== 'active') {
    console.log('Session is not active, returning empty cart');
    return NextResponse.json({ items: [] });
  }

  // Only clean up very old orders (older than 24 hours) to avoid clearing recent items
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { error: cleanupError } = await supabase
    .from('orders')
    .delete()
    .eq('session_id', sessionId)
    .lt('created_at', twentyFourHoursAgo);

  if (cleanupError) {
    console.warn('Warning: Failed to cleanup old orders:', cleanupError.message);
  } else {
    console.log('✅ Cleaned up very old orders (24h+) for session:', sessionId);
  }

  // Load all active orders for this session with split bill data
  const { data: orders, error } = await supabase
    .from('orders')
    .select(`
      id,
      menu_item_id,
      quantity,
      notes,
      is_shared,
      is_takeaway,
      customizations,
      created_at,
      split_bill_id,
      menu_items!inner (
        name,
        price
      ),
      split_bills (
        id,
        original_price,
        split_count,
        split_price,
        participants,
        status
      )
    `)
    .eq('session_id', sessionId)
    .eq('status', 'placed')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Supabase error in loadCartItems:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!orders) {
    return NextResponse.json({ items: [] });
  }

  console.log('📋 Loaded orders for session:', sessionId, 'Count:', orders?.length || 0);
  
  // Debug: Log all orders with their split bill data
  orders?.forEach((order, index) => {
    console.log(`🔍 Order ${index + 1} Debug:`, {
      orderId: order.id,
      menuItemId: order.menu_item_id,
      isShared: order.is_shared,
      splitBillId: order.split_bill_id,
      hasSplitBillId: !!order.split_bill_id,
      splitBillData: order.split_bills,
      menuItemData: order.menu_items
    });
  });

  const cartItems = orders.map(order => {
    const menuItem = Array.isArray(order.menu_items) ? order.menu_items[0] : order.menu_items;
    const menuItemName = menuItem?.name || 'Unknown Item';
    const menuItemPrice = menuItem?.price || 0;
    
    // Check if this order has split bill data
    const splitBill = Array.isArray(order.split_bills) ? order.split_bills[0] : order.split_bills;
    const isSplit = !!splitBill && splitBill.status === 'active';
    
    // Enhanced debugging for split bill data
    if (order.is_shared) {
      console.log('🔍 Split Bill Debug for Order:', order.id, {
        hasSplitBillId: !!order.split_bill_id,
        splitBillId: order.split_bill_id,
        splitBillData: splitBill,
        isSplit: isSplit,
        splitBillStatus: splitBill?.status,
        rawSplitBills: order.split_bills
      });
    }
    
    console.log(`🔍 Processing Order ${order.id}:`, {
      hasSplitBill: !!splitBill,
      splitBillData: splitBill,
      isSplit: isSplit,
      menuItemPrice: menuItemPrice,
      quantity: order.quantity
    });
    
    // Debug logging for split items
    if (order.is_shared) {
      console.log('🔄 Cart Load - Split Item Debug:', {
        orderId: order.id,
        menuItemId: order.menu_item_id,
        itemName: menuItemName,
        isShared: order.is_shared,
        hasSplitBill: !!splitBill,
        splitBill: splitBill,
        isSplit: isSplit,
        menuItemPrice: menuItemPrice, // Individual item price from menu
        splitBillOriginalPrice: isSplit ? splitBill.original_price : 'N/A', // Total original price from split bill
        splitPrice: isSplit ? splitBill.split_price : 'N/A',
        splitCount: isSplit ? splitBill.split_count : 'N/A',
        participants: isSplit ? splitBill.participants : 'N/A',
        quantity: order.quantity,
        calculatedTotalOriginal: menuItemPrice * order.quantity, // What we calculate
        storedTotalOriginal: isSplit ? splitBill.original_price : 'N/A' // What's stored in split bill
      });
    }
    
    return {
      id: order.id,
      menu_item_id: order.menu_item_id,
      name: menuItemName,
      price: isSplit ? splitBill.split_price : menuItemPrice,
      originalPrice: isSplit ? splitBill.original_price : menuItemPrice, // Use split bill's original price for split items
      quantity: order.quantity,
      notes: order.notes || undefined,
      isShared: order.is_shared || false,
      isTakeaway: order.is_takeaway || false,
      customizations: order.customizations || [], // Include customizations
      // Split bill properties
      isSplit: isSplit,
      splitPrice: isSplit ? splitBill.split_price : undefined,
      splitCount: isSplit ? splitBill.split_count : undefined,
      splitBillId: splitBill?.id,
      participants: isSplit ? splitBill.participants : [],
      hasSplitData: isSplit
    };
  });

  return NextResponse.json({ items: cartItems });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    
    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    return await loadCartItems(sessionId);
  } catch (error) {
    console.error('Error loading cart items (GET):', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json();
    
    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    return await loadCartItems(sessionId);
  } catch (error) {
    console.error('Error loading cart items (POST):', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
