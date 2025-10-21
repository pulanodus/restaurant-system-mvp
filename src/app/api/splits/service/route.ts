import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const requestBody = await request.json();
    const { sessionId, menuItemId, originalPrice, splitCount, participants } = requestBody;
    
    // 🚨 CRITICAL DEBUG: Log exactly what we received
    // Debug logging removed for production security

    // Check if a split bill already exists for this specific item
    const { data: existingSplitBill } = await supabase
      .from('split_bills')
      .select('*')
      .eq('session_id', sessionId)
      .eq('menu_item_id', menuItemId)
      .eq('status', 'active')
      .single();

    if (existingSplitBill) {
      // Debug logging removed for production security
      
      // Check if the existing split bill has the correct pricing AND split details
      const hasCorrectPricing = existingSplitBill.original_price === originalPrice;
      const hasCorrectSplitCount = existingSplitBill.split_count === splitCount;
      const hasCorrectParticipants = JSON.stringify(existingSplitBill.participants?.sort()) === JSON.stringify((participants || []).sort());
      
      // Debug logging removed for production security
      
      if (hasCorrectPricing && hasCorrectSplitCount && hasCorrectParticipants) {
        // Debug logging removed for production security
        
        // CRITICAL: Even if split bill exists, we need to ensure the order is linked to it
        // Debug logging removed for production security
        
        // Check if order is already linked
        const { data: existingOrders, error: checkError } = await supabase
          .from('orders')
          .select('id, split_bill_id')
          .eq('session_id', sessionId)
          .eq('menu_item_id', menuItemId)
          .in('status', ['cart', 'placed']);
        
        if (checkError) {
          console.error('❌ Error checking existing orders:', checkError);
          return NextResponse.json({ error: 'Failed to check existing orders' }, { status: 500 });
        }
        
        // Debug logging removed for production security
        
        // Check if any shared order needs to be linked
        const needsLinking = existingOrders?.some(order => order.split_bill_id !== existingSplitBill.id);
        
        if (needsLinking) {
          // Debug logging removed for production security
          
        const { data: updatedOrders, error: orderError } = await supabase
          .from('orders')
          .update({ split_bill_id: existingSplitBill.id })
          .eq('session_id', sessionId)
          .eq('menu_item_id', menuItemId)
          .eq('is_shared', true)  // CRITICAL: Only link orders that are explicitly marked as shared
          .in('status', ['cart', 'placed'])
          .select('id, split_bill_id, is_shared');
          
          if (orderError) {
            console.error('❌ Error updating order with split bill:', orderError);
            return NextResponse.json({ error: 'Failed to link split bill to orders' }, { status: 500 });
          } else {
            // Debug logging removed for production security
          }
        } else {
          // Debug logging removed for production security
        }
        
        return NextResponse.json({ 
          success: true, 
          splitBill: existingSplitBill,
          message: 'Split bill already exists and is properly linked' 
        });
      } else {
        // Debug logging removed for production security
        
        // CRITICAL: Instead of updating the existing split bill (which would affect confirmed orders),
        // we create a NEW split bill for the current request. This preserves the original split bill
        // for any confirmed orders that are already linked to it.
        
        // Calculate split price using corrected values
        const splitPrice = originalPrice / splitCount;
        
        // Create NEW split bill record
        const newSplitBillData = {
          session_id: sessionId,
          menu_item_id: menuItemId,
          original_price: originalPrice,
          split_count: splitCount,
          split_price: splitPrice,
          participants: participants || []
        };
        
        // Debug logging removed for production security
        
        const { data: newSplitBill, error: createError } = await supabase
          .from('split_bills')
          .insert(newSplitBillData)
          .select()
          .single();
          
        if (createError) {
          console.error('❌ Error creating new split bill:', createError);
          return NextResponse.json({ error: 'Failed to create new split bill' }, { status: 500 });
        }
        
        // Debug logging removed for production security
        
        // CRITICAL: Link ONLY orders that are explicitly marked as shared to the new split bill
        // This prevents individual orders from being automatically converted to split items
        // Debug logging removed for production security
        
        const { data: updatedOrders, error: orderError } = await supabase
          .from('orders')
          .update({ split_bill_id: newSplitBill.id })
          .eq('session_id', sessionId)
          .eq('menu_item_id', menuItemId)
          .eq('is_shared', true)  // CRITICAL: Only link orders that are explicitly marked as shared
          .in('status', ['cart', 'placed'])  // CRITICAL: Only update pending orders, not confirmed ones
          .select('id, split_bill_id, status, is_shared');
        
        if (orderError) {
          console.error('❌ Error linking pending orders to new split bill:', orderError);
          return NextResponse.json({ error: 'Failed to link new split bill to pending orders' }, { status: 500 });
        }
        
        // Debug logging removed for production security
        // Debug logging removed for production security
        
        return NextResponse.json({ 
          success: true, 
          splitBill: newSplitBill,
          message: 'New split bill created for pending orders, confirmed orders preserved' 
        });
      }
    }

    // Debug logging removed for production security

    // Enhanced debugging to match your code structure
    // Debug logging removed for production security

    // Use the values received from the frontend
    const correctedOriginalPrice = originalPrice;
    const correctedSplitCount = splitCount;
    
    // CRITICAL VALIDATION: Ensure we're storing the correct total price
    if (correctedOriginalPrice <= 0) {
      console.error('❌ CRITICAL ERROR: correctedOriginalPrice is not positive:', correctedOriginalPrice);
      return NextResponse.json({ error: 'Invalid original price' }, { status: 400 });
    }

    if (correctedSplitCount <= 0) {
      console.error('❌ CRITICAL ERROR: correctedSplitCount is not positive:', correctedSplitCount);
      return NextResponse.json({ error: 'Invalid split count' }, { status: 400 });
    }

    const expectedSplitPrice = correctedOriginalPrice / correctedSplitCount;
    // Debug logging removed for production security

    // Note: We cleaned up all existing split bills above, so we'll always create a new one

    // Calculate split price using corrected values
    const splitPrice = correctedOriginalPrice / correctedSplitCount;

    // Create split bill record with corrected values
    const splitBillData = {
      session_id: sessionId,
      menu_item_id: menuItemId,
      original_price: correctedOriginalPrice,  // CRITICAL: Store corrected total price
      split_count: correctedSplitCount,
      split_price: splitPrice,        // Per-person price
      participants: participants || [],
      status: 'active'
    };

    // Debug logging removed for production security

    const { data: splitBill, error: splitError } = await supabase
      .from('split_bills')
      .insert(splitBillData)
      .select()
      .single();

    if (splitError) {
      console.error('Error creating split bill:', splitError);
      return NextResponse.json({ error: 'Failed to create split bill' }, { status: 500 });
    }

    // Debug logging removed for production security

    // CRITICAL: Update ALL orders for this menu item to reference the split bill
    // Debug logging removed for production security
    // Debug logging removed for production security
    
    // First, let's check what orders exist for this criteria
    const { data: existingOrders, error: checkError } = await supabase
      .from('orders')
      .select('id, split_bill_id')
      .eq('session_id', sessionId)
      .eq('menu_item_id', menuItemId)
      .in('status', ['cart', 'placed']);
    
    if (checkError) {
      console.error('❌ Error checking existing orders:', checkError);
      return NextResponse.json({ error: 'Failed to check existing orders' }, { status: 500 });
    }
    
    // Debug logging removed for production security
    
    if (!existingOrders || existingOrders.length === 0) {
      console.warn('⚠️ No orders found to update with split bill ID');
      return NextResponse.json({ 
        success: true, 
        splitBill: splitBill,
        message: 'Split bill created but no orders found to link' 
      });
    }
    
    // Now update only the shared orders
    const { data: updatedOrders, error: orderError } = await supabase
      .from('orders')
      .update({ split_bill_id: splitBill.id })
      .eq('session_id', sessionId)
      .eq('menu_item_id', menuItemId)
      .eq('is_shared', true)  // CRITICAL: Only link orders that are explicitly marked as shared
      .in('status', ['cart', 'placed'])
      .select('id, split_bill_id, is_shared');

    if (orderError) {
      console.error('❌ Error updating order with split bill:', orderError);
      console.error('❌ Error details:', {
        message: orderError.message,
        details: orderError.details,
        hint: orderError.hint,
        code: orderError.code
      });
      return NextResponse.json({ error: 'Failed to link split bill to orders' }, { status: 500 });
    } else {
      // Debug logging removed for production security
      // Debug logging removed for production security
      // Debug logging removed for production security
    }

    return NextResponse.json({ 
      success: true, 
      splitBill: splitBill,
      message: 'Split bill created and linked to order successfully' 
    });

  } catch (error) {
    console.error('Split bill service error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
