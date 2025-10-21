import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseUrl, getSupabaseServiceKey } from '@/lib/secure-env';

async function loadCartItems(sessionId: string, dinerName?: string | null) {
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
  }

  // Load cart items for this session
  // Cart items are orders with status 'cart' (not yet confirmed to kitchen)
  // Confirmed orders have status 'preparing', 'ready', etc.
  let query = supabase
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
      diner_name,
      split_bill_id,
      menu_items!inner (
        name,
        price
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
    .eq('status', 'cart')  // Only load cart items, not confirmed orders
    .order('created_at', { ascending: false });

  // Filter by diner name if provided
  if (dinerName) {
    query = query.eq('diner_name', dinerName);
  }

  const { data: cartItems, error } = await query;

  if (error) {
    console.error('Supabase error in loadCartItems:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!cartItems) {
    return NextResponse.json({ items: [] });
  }

  // CRITICAL FIX: Check for existing split bills and apply them to cart items
  
  // Query for split bills for this session
  const { data: splitBills, error: splitBillsError } = await supabase
    .from('split_bills')
    .select('*')
    .eq('session_id', sessionId)
    .eq('status', 'active');

  if (splitBillsError) {
    console.error('❌ Error fetching split bills:', splitBillsError);
  }

  const processedCartItems = cartItems.map(item => {
    const menuItem = Array.isArray(item.menu_items) ? item.menu_items[0] : item.menu_items;
    const menuItemName = menuItem?.name || 'Unknown Item';
    const menuItemPrice = menuItem?.price || 0;
    
    // CRITICAL FIX: Check for split bill data in multiple ways
    let isSplit = false;
    let currentSplitBill = null;
    
    // First, check if this specific order has a split_bill_id
    if (item.split_bill_id) {
      
      // Find the specific split bill for this order
      if (splitBills && splitBills.length > 0) {
        currentSplitBill = splitBills.find(sb => sb.id === item.split_bill_id && sb.status === 'active');
        
        if (currentSplitBill) {
          isSplit = true;
        }
      }
    } else {
      // No split_bill_id - this is a regular individual order, not part of a split
      isSplit = false;
      currentSplitBill = null;
    }
    
    // Debug logging for split bill data
    
    return {
      id: item.id,
      menu_item_id: item.menu_item_id,
      name: menuItemName,
      price: menuItemPrice, // Always use original menu item price for "each" display
      quantity: item.quantity,
      notes: item.notes || undefined,
      isShared: item.is_shared || false,
      isTakeaway: item.is_takeaway || false,
      customizations: item.customizations || [],
      dinerName: item.diner_name,
      // Split bill properties - always use the most current data
      isSplit: isSplit,
      splitPrice: isSplit ? currentSplitBill.split_price : undefined,
      originalPrice: isSplit ? currentSplitBill.original_price : undefined,
      splitCount: isSplit ? currentSplitBill.split_count : undefined,
      participants: isSplit ? currentSplitBill.participants || [] : undefined,
      splitBillId: isSplit ? currentSplitBill.id : undefined,
      hasSplitData: isSplit
    };
  });

  return NextResponse.json({ items: processedCartItems });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const dinerName = searchParams.get('dinerName');
    
    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    return await loadCartItems(sessionId, dinerName);
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
    const { sessionId, dinerName } = await request.json();
    
    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    return await loadCartItems(sessionId, dinerName);
  } catch (error) {
    console.error('Error loading cart items (POST):', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
