import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseUrl, getSupabaseServiceKey } from '@/lib/secure-env';

export async function POST(request: NextRequest) {
  try {
    const { itemId, quantity, change, options } = await request.json();
    
    if (!itemId || (quantity === undefined && change === undefined)) {
      return NextResponse.json({ error: 'Item ID and quantity or change are required' }, { status: 400 });
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

    let finalQuantity = quantity;
    
    // If change is provided instead of quantity, calculate the new quantity
    if (change !== undefined) {
      // First get the current quantity
      const { data: currentOrder, error: fetchError } = await supabase
        .from('orders')
        .select('quantity')
        .eq('id', itemId)
        .single();
        
      if (fetchError) {
        console.error('❌ Error fetching current order:', fetchError);
        return NextResponse.json({ error: fetchError.message }, { status: 500 });
      }
      
      finalQuantity = Math.max(0, (currentOrder.quantity || 0) + change);
    }

    // Prepare update data
    const updateData: any = { quantity: finalQuantity };
    
    // Add options if provided
    if (options) {
      if (options.notes !== undefined) updateData.notes = options.notes;
      if (options.isShared !== undefined) updateData.is_shared = options.isShared;
      if (options.isTakeaway !== undefined) updateData.is_takeaway = options.isTakeaway;
      if (options.customizations !== undefined) updateData.customizations = options.customizations;
    }
    
    const { error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', itemId);

    if (error) {
      console.error('❌ Supabase error in updateQuantity:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    // CRITICAL: If this order has a split bill, update the split bill's original_price
    // First, get the order details to check if it has a split bill AND its status
    const { data: updatedOrder, error: fetchError } = await supabase
      .from('orders')
      .select(`
        id,
        quantity,
        split_bill_id,
        menu_item_id,
        status,
        menu_items!inner (price)
      `)
      .eq('id', itemId)
      .single();
    
    if (fetchError) {
      console.error('❌ Error fetching updated order:', fetchError);
      return NextResponse.json({ success: true }); // Still return success for the main update
    }
    
    if (updatedOrder.split_bill_id && updatedOrder.status === 'cart') {
      const menuItem = Array.isArray(updatedOrder.menu_items) ? updatedOrder.menu_items[0] : updatedOrder.menu_items;
      
      // Get the current split bill to calculate new split price
      const { data: splitBill, error: splitBillError } = await supabase
        .from('split_bills')
        .select('split_count, participants')
        .eq('id', updatedOrder.split_bill_id)
        .single();
      
      if (splitBillError) {
        console.error('❌ Error fetching split bill:', splitBillError);
        return NextResponse.json({ success: true }); // Still return success for the main update
      }
      
      // Calculate new original price and split price
      const newOriginalPrice = updatedOrder.quantity * (menuItem?.price || 0);
      const newSplitPrice = newOriginalPrice / splitBill.split_count;
      
      // Update the split bill with new pricing
      const { error: updateSplitBillError } = await supabase
        .from('split_bills')
        .update({
          original_price: newOriginalPrice,
          split_price: newSplitPrice
        })
        .eq('id', updatedOrder.split_bill_id);
      
      if (updateSplitBillError) {
        console.error('❌ Error updating split bill pricing:', updateSplitBillError);
        return NextResponse.json({ success: true }); // Still return success for the main update
      }
    } else if (updatedOrder.split_bill_id && updatedOrder.status !== 'cart') {
    } else {
    }
    
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error updating item quantity:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
