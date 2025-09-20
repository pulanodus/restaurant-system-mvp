import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseUrl, getSupabaseServiceKey } from '@/lib/secure-env';

export async function POST(request: NextRequest) {
  try {
    const { sessionId, item, options } = await request.json();
    
    console.log('🛠️ API /cart/add received request:', { sessionId, item, options });
    
    if (!sessionId || !item) {
      return NextResponse.json({ error: 'Session ID and item are required' }, { status: 400 });
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

    // Check if item already exists in cart with same options AND customizations
    const customizations = item.customizations || [];
    const customizationsKey = JSON.stringify(customizations.sort());
    
    console.log('🔍 Checking for existing item with full comparison:', {
      sessionId,
      menuItemId: item.id,
      notes: options?.notes || null,
      isShared: options?.isShared || false,
      isTakeaway: options?.isTakeaway || false,
      customizations: customizations,
      customizationsKey: customizationsKey
    });

    // Get all orders for this session and menu item to check for exact matches
    const { data: allOrders, error: fetchError } = await supabase
      .from('orders')
      .select('*')
      .eq('session_id', sessionId)
      .eq('menu_item_id', item.id)
      .eq('status', 'placed');

    if (fetchError) {
      console.error('❌ Error fetching existing orders:', fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    console.log('🔍 Found orders for this menu item:', allOrders?.length || 0);

    // Find exact match including customizations
    const existingOrder = allOrders?.find(order => {
      const orderCustomizations = order.customizations || [];
      const orderCustomizationsKey = JSON.stringify(orderCustomizations.sort());
      
      const isExactMatch = 
        order.notes === (options?.notes || null) &&
        order.is_shared === (options?.isShared || false) &&
        order.is_takeaway === (options?.isTakeaway || false) &&
        orderCustomizationsKey === customizationsKey;
      
      console.log('🔍 Comparing order:', {
        orderId: order.id,
        orderNotes: order.notes,
        orderIsShared: order.is_shared,
        orderIsTakeaway: order.is_takeaway,
        orderCustomizations: orderCustomizations,
        orderCustomizationsKey: orderCustomizationsKey,
        isExactMatch: isExactMatch
      });
      
      return isExactMatch;
    });

    console.log('🔍 Existing order found:', existingOrder);

    let order;
    let error;

    if (existingOrder) {
      // Update existing item quantity
      console.log('✅ Updating existing order:', existingOrder.id, 'from quantity', existingOrder.quantity, 'to', existingOrder.quantity + 1);
      const { data: updatedOrder, error: updateError } = await supabase
        .from('orders')
        .update({ quantity: existingOrder.quantity + 1 })
        .eq('id', existingOrder.id)
        .select()
        .single();
      
      order = updatedOrder;
      error = updateError;
      console.log('✅ Updated order result:', updatedOrder);
    } else {
      // Create new item
      console.log('➕ Creating new order for item:', item.id);
      const { data: newOrder, error: insertError } = await supabase
        .from('orders')
        .insert({
          session_id: sessionId,
          menu_item_id: item.id,
          quantity: 1,
          status: 'placed',
          notes: options?.notes || null,
          is_shared: options?.isShared || false,
          is_takeaway: options?.isTakeaway || false,
          customizations: customizations // Store customizations
        })
        .select()
        .single();
      
      order = newOrder;
      error = insertError;
      console.log('➕ New order created:', newOrder);
    }

    if (error) {
      console.error('Supabase error in addItem:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Handle split bill pricing logic
    let userPrice = item.price;
    let splitBill = false;
    let splitWith: string[] = [];
    let totalPeople = 1;
    
    // 🔍 SPLIT BILL DEBUG: Track API split operations
    if (options?.isShared) {
      console.log('🔄 API Split Operation:', {
        action: 'API_ADD_SHARED_ITEM',
        itemId: item.id,
        itemName: item.name,
        isShared: options.isShared,
        sessionId: sessionId,
        quantity: order.quantity
      });
    }
    
    // For now, we'll handle split bill pricing on the frontend
    // The API will store the full price, and the frontend will calculate the user's portion

    const cartItem = {
      id: order.id,
      menu_item_id: item.id,
      name: item.name,
      price: item.price, // Store full price, frontend will calculate user portion
      quantity: order.quantity, // Use actual quantity from database
      notes: options?.notes || undefined,
      isShared: options?.isShared || false,
      isTakeaway: options?.isTakeaway || false,
      customizations: order.customizations || [], // Include customizations from database
      addedAt: Date.now()
    };

    console.log('🛠️ API returning cart item:', cartItem);
    return NextResponse.json({ item: cartItem });

  } catch (error) {
    console.error('Error adding item to cart:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
