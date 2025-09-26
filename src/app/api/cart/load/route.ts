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

  console.log('📋 Loaded cart items for session:', sessionId, 'dinerName:', dinerName, 'Count:', cartItems?.length || 0);
  
  // Debug: Log all cart items
  cartItems?.forEach((item, index) => {
    console.log(`🔍 Cart Item ${index + 1} Debug:`, {
      itemId: item.id,
      menuItemId: item.menu_item_id,
      dinerName: item.diner_name,
      isShared: item.is_shared,
      splitBillId: item.split_bill_id,
      menuItemData: item.menu_items,
      splitBillData: item.split_bills
    });
  });

  // CRITICAL FIX: Check for existing split bills and apply them to cart items
  console.log('🔍 Checking for existing split bills for session:', sessionId);
  
  // Query for split bills for this session
  const { data: splitBills, error: splitBillsError } = await supabase
    .from('split_bills')
    .select('*')
    .eq('session_id', sessionId)
    .eq('status', 'active');

  if (splitBillsError) {
    console.error('❌ Error fetching split bills:', splitBillsError);
  } else {
    console.log('🔍 Found split bills:', splitBills?.length || 0);
    if (splitBills && splitBills.length > 0) {
      splitBills.forEach(splitBill => {
        console.log('🔍 Split bill details:', {
          id: splitBill.id,
          menu_item_id: splitBill.menu_item_id,
          original_price: splitBill.original_price,
          split_price: splitBill.split_price,
          split_count: splitBill.split_count,
          participants: splitBill.participants
        });
      });
    }
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
      console.log('🔍 Order has split_bill_id:', item.split_bill_id, 'for item:', menuItemName);
      
      // Find the specific split bill for this order
      if (splitBills && splitBills.length > 0) {
        currentSplitBill = splitBills.find(sb => sb.id === item.split_bill_id && sb.status === 'active');
        
        if (currentSplitBill) {
          console.log('🔍 Found matching split bill for order:', {
            splitBillId: currentSplitBill.id,
            splitCount: currentSplitBill.split_count,
            splitPrice: currentSplitBill.split_price,
            participants: currentSplitBill.participants
          });
          isSplit = true;
        } else {
          console.log('⚠️ Order has split_bill_id but split bill not found or inactive:', item.split_bill_id);
        }
      }
    } else {
      // No split_bill_id - this is a regular individual order, not part of a split
      console.log('🔍 Order has no split_bill_id - treating as individual order:', menuItemName);
      isSplit = false;
      currentSplitBill = null;
    }
    
    // Debug logging for split bill data
    if (currentSplitBill) {
      console.log('🔍 Final Split Bill Data for item:', menuItemName, {
        id: currentSplitBill.id,
        original_price: currentSplitBill.original_price,
        split_price: currentSplitBill.split_price,
        split_count: currentSplitBill.split_count,
        participants: currentSplitBill.participants,
        status: currentSplitBill.status,
        calculation: {
          expectedSplitPrice: currentSplitBill.original_price / currentSplitBill.split_count,
          actualSplitPrice: currentSplitBill.split_price,
          isCorrect: Math.abs((currentSplitBill.original_price / currentSplitBill.split_count) - currentSplitBill.split_price) < 0.01
        }
      });
    } else {
      console.log('🔍 No split bill data found for item:', menuItemName);
    }
    
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

  console.log('📤 Returning processed cart items:', processedCartItems.map(item => ({
    name: item.name,
    isSplit: item.isSplit,
    splitPrice: item.splitPrice,
    originalPrice: item.originalPrice,
    splitCount: item.splitCount,
    participants: item.participants,
    price: item.price,
    quantity: item.quantity,
    calculation: item.isSplit ? {
      expectedTotal: item.price * item.quantity,
      expectedSplitPrice: (item.price * item.quantity) / (item.splitCount || 1),
      actualSplitPrice: item.splitPrice,
      actualOriginalPrice: item.originalPrice
    } : null
  })));

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
