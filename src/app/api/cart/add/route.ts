import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseUrl, getSupabaseServiceKey } from '@/lib/secure-env';

export async function POST(request: NextRequest) {
  try {
    const { sessionId, item, options, dinerName } = await request.json();
    
    if (!sessionId || !item || !dinerName) {
      return NextResponse.json({ error: 'Session ID, item, and diner name are required' }, { status: 400 });
    }

    // CRITICAL FIX: Prevent waitstaff from adding items to cart
    // First, get the session to check who the waitstaff is
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

    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('started_by_name')
      .eq('id', sessionId)
      .single();

    if (sessionError) {
      console.error('❌ Error fetching session:', sessionError);
      return NextResponse.json({ error: 'Failed to verify session' }, { status: 500 });
    }

    // Check if the diner name matches the waitstaff (session starter)
    if (session.started_by_name && dinerName.toLowerCase() === session.started_by_name.toLowerCase()) {
      return NextResponse.json({ 
        error: 'Waitstaff cannot add items to cart. Please use a different name.',
        waitstaff: session.started_by_name 
      }, { status: 400 });
    }

    // Check if item already exists in this diner's cart with same options AND customizations
    const customizations = item.customizations || [];
    const customizationsKey = JSON.stringify(customizations.sort());

    // Get all cart items for this session, menu item, and diner to check for exact matches
    const { data: allCartItems, error: fetchError } = await supabase
      .from('orders')
      .select('*')
      .eq('session_id', sessionId)
      .eq('menu_item_id', item.id)
      .eq('diner_name', dinerName)
      .eq('status', 'cart');  // Only check cart items, not confirmed orders

    if (fetchError) {
      console.error('❌ Error fetching existing cart items:', fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    // Find exact match including customizations
    const existingCartItem = allCartItems?.find(cartItem => {
      const cartItemCustomizations = cartItem.customizations || [];
      const cartItemCustomizationsKey = JSON.stringify(cartItemCustomizations.sort());
      
      const isExactMatch = 
        cartItem.notes === (options?.notes || null) &&
        cartItem.is_shared === (options?.isShared || false) &&
        cartItem.is_takeaway === (options?.isTakeaway || false) &&
        cartItemCustomizationsKey === customizationsKey;
      
      return isExactMatch;
    });

    let cartItem;
    let error;

    if (existingCartItem) {
      // Update existing item quantity
      const { data: updatedCartItem, error: updateError } = await supabase
        .from('orders')
        .update({ quantity: existingCartItem.quantity + 1 })
        .eq('id', existingCartItem.id)
        .select()
        .single();
      
      cartItem = updatedCartItem;
      error = updateError;
    } else {
      // Create new cart item
      const { data: newCartItem, error: insertError } = await supabase
        .from('orders')
        .insert({
          session_id: sessionId,
          menu_item_id: item.id,
          diner_name: dinerName,
          quantity: 1,
          status: 'cart',  // Set status to 'cart' for cart items
          notes: options?.notes || null,
          is_shared: options?.isShared || false,
          is_takeaway: options?.isTakeaway || false,
          customizations: customizations
        })
        .select()
        .single();
      
      cartItem = newCartItem;
      error = insertError;
    }

    if (error) {
      console.error('Supabase error in addItem:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Return the cart item data
    const responseCartItem = {
      id: cartItem.id,
      menu_item_id: item.id,
      name: item.name,
      price: item.price, // Store full price, frontend will calculate user portion
      quantity: cartItem.quantity, // Use actual quantity from database
      notes: options?.notes || undefined,
      isShared: options?.isShared || false,
      isTakeaway: options?.isTakeaway || false,
      customizations: cartItem.customizations || [], // Include customizations from database
      dinerName: cartItem.diner_name,
      addedAt: Date.now()
    };

    return NextResponse.json({ item: responseCartItem });

  } catch (error) {
    console.error('Error adding item to cart:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
