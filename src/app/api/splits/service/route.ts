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
    console.log('🚨 RECEIVED REQUEST BODY:', JSON.stringify(requestBody, null, 2));
    console.log('🚨 PARSED VALUES:', {
      sessionId,
      menuItemId,
      originalPrice,
      splitCount,
      participants,
      originalPriceType: typeof originalPrice,
      originalPriceValue: originalPrice
    });

    // Check if a split bill already exists for this specific item
    const { data: existingSplitBill } = await supabase
      .from('split_bills')
      .select('*')
      .eq('session_id', sessionId)
      .eq('menu_item_id', menuItemId)
      .eq('status', 'active')
      .single();

    if (existingSplitBill) {
      console.log('⚠️ Split bill already exists for this item:', {
        id: existingSplitBill.id,
        existingOriginalPrice: existingSplitBill.original_price,
        newOriginalPrice: originalPrice,
        existingSplitPrice: existingSplitBill.split_price,
        newSplitPrice: originalPrice / splitCount
      });
      
      // Check if the existing split bill has the correct pricing AND split details
      const hasCorrectPricing = existingSplitBill.original_price === originalPrice;
      const hasCorrectSplitCount = existingSplitBill.split_count === splitCount;
      const hasCorrectParticipants = JSON.stringify(existingSplitBill.participants?.sort()) === JSON.stringify((participants || []).sort());
      
      console.log('🔍 Split Bill Comparison:', {
        existing: {
          originalPrice: existingSplitBill.original_price,
          splitCount: existingSplitBill.split_count,
          participants: existingSplitBill.participants
        },
        new: {
          originalPrice: originalPrice,
          splitCount: splitCount,
          participants: participants
        },
        comparison: {
          hasCorrectPricing,
          hasCorrectSplitCount,
          hasCorrectParticipants,
          allMatch: hasCorrectPricing && hasCorrectSplitCount && hasCorrectParticipants
        }
      });
      
      if (hasCorrectPricing && hasCorrectSplitCount && hasCorrectParticipants) {
        console.log('✅ Existing split bill has correct pricing, but need to ensure order is linked');
        
        // CRITICAL: Even if split bill exists, we need to ensure the order is linked to it
        console.log('🔄 Ensuring order is linked to existing split bill:', existingSplitBill.id);
        
        // Check if order is already linked
        const { data: existingOrders, error: checkError } = await supabase
          .from('orders')
          .select('id, split_bill_id')
          .eq('session_id', sessionId)
          .eq('menu_item_id', menuItemId)
          .eq('status', 'placed');
        
        if (checkError) {
          console.error('❌ Error checking existing orders:', checkError);
          return NextResponse.json({ error: 'Failed to check existing orders' }, { status: 500 });
        }
        
        console.log('📋 Found orders to check:', existingOrders);
        
        // Check if any order needs to be linked
        const needsLinking = existingOrders?.some(order => order.split_bill_id !== existingSplitBill.id);
        
        if (needsLinking) {
          console.log('🔗 Order needs to be linked to split bill, updating...');
          
          const { data: updatedOrders, error: orderError } = await supabase
            .from('orders')
            .update({ split_bill_id: existingSplitBill.id })
            .eq('session_id', sessionId)
            .eq('menu_item_id', menuItemId)
            .eq('status', 'placed')
            .select('id, split_bill_id');
          
          if (orderError) {
            console.error('❌ Error updating order with split bill:', orderError);
            return NextResponse.json({ error: 'Failed to link split bill to orders' }, { status: 500 });
          } else {
            console.log('✅ Successfully linked existing split bill to orders:', updatedOrders);
          }
        } else {
          console.log('✅ Order is already properly linked to split bill');
        }
        
        return NextResponse.json({ 
          success: true, 
          splitBill: existingSplitBill,
          message: 'Split bill already exists and is properly linked' 
        });
      } else {
        console.log('🔄 Existing split bill has incorrect pricing, creating NEW split bill to preserve confirmed orders');
        
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
        
        console.log('🆕 Creating NEW split bill to avoid affecting confirmed orders:', newSplitBillData);
        
        const { data: newSplitBill, error: createError } = await supabase
          .from('split_bills')
          .insert(newSplitBillData)
          .select()
          .single();
          
        if (createError) {
          console.error('❌ Error creating new split bill:', createError);
          return NextResponse.json({ error: 'Failed to create new split bill' }, { status: 500 });
        }
        
        console.log('✅ New split bill created successfully:', newSplitBill);
        
        // CRITICAL: Link ONLY the current pending orders to the new split bill
        // This ensures confirmed orders keep their original split bill data
        console.log('🔗 Linking ONLY pending orders to new split bill:', newSplitBill.id);
        
        const { data: updatedOrders, error: orderError } = await supabase
          .from('orders')
          .update({ split_bill_id: newSplitBill.id })
          .eq('session_id', sessionId)
          .eq('menu_item_id', menuItemId)
          .eq('status', 'placed')  // CRITICAL: Only update pending orders, not confirmed ones
          .select('id, split_bill_id, status');
        
        if (orderError) {
          console.error('❌ Error linking pending orders to new split bill:', orderError);
          return NextResponse.json({ error: 'Failed to link new split bill to pending orders' }, { status: 500 });
        }
        
        console.log('✅ Successfully linked pending orders to new split bill:', updatedOrders);
        console.log('🛡️ Confirmed orders remain untouched with their original split bill data');
        
        return NextResponse.json({ 
          success: true, 
          splitBill: newSplitBill,
          message: 'New split bill created for pending orders, confirmed orders preserved' 
        });
      }
    }

    console.log('🔄 Split Bill Creation Request:', {
      sessionId,
      menuItemId,
      originalPrice,
      splitCount,
      participants,
      calculatedSplitPrice: originalPrice / splitCount
    });

    // Enhanced debugging to match your code structure
    console.log('🔍 Split Bill Creation Debug:', {
      menuItemId: menuItemId,
      originalPrice: originalPrice,        // Should be total price (e.g., 135)
      splitCount: splitCount,             // Number of people splitting
      calculatedSplitPrice: originalPrice / splitCount, // Per person price (e.g., 27)
      participants: participants,
      validation: {
        originalPriceIsPositive: originalPrice > 0,
        splitCountIsPositive: splitCount > 0,
        calculatedSplitPriceIsPositive: (originalPrice / splitCount) > 0,
        originalPriceGreaterThanSplit: originalPrice > (originalPrice / splitCount)
      }
    });

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
    console.log('✅ Price validation passed with corrected values:', {
      totalOriginalPrice: correctedOriginalPrice,
      perPersonPrice: expectedSplitPrice,
      participantCount: correctedSplitCount,
      calculation: `${correctedOriginalPrice} ÷ ${correctedSplitCount} = ${expectedSplitPrice}`
    });

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

    console.log('💾 Storing Split Bill Data:', {
      ...splitBillData,
      validation: {
        originalPriceIsTotal: correctedOriginalPrice > splitPrice,
        splitPriceIsPerPerson: splitPrice === expectedSplitPrice,
        calculationCorrect: Math.abs(splitPrice - expectedSplitPrice) < 0.01,
        forcedValues: {
          originalPrice: correctedOriginalPrice,
          splitCount: correctedSplitCount,
          splitPrice: splitPrice
        }
      }
    });

    const { data: splitBill, error: splitError } = await supabase
      .from('split_bills')
      .insert(splitBillData)
      .select()
      .single();

    if (splitError) {
      console.error('Error creating split bill:', splitError);
      return NextResponse.json({ error: 'Failed to create split bill' }, { status: 500 });
    }

    console.log('✅ Split Bill Created Successfully:', {
      id: splitBill.id,
      original_price: splitBill.original_price,
      split_price: splitBill.split_price,
      split_count: splitBill.split_count,
      participants: splitBill.participants,
      verification: {
        storedCorrectly: splitBill.original_price === originalPrice,
        splitPriceCorrect: Math.abs(splitBill.split_price - splitPrice) < 0.01,
        totalPrice: splitBill.original_price,
        perPersonPrice: splitBill.split_price,
        calculation: `${splitBill.original_price} ÷ ${splitBill.split_count} = ${splitBill.split_price}`
      }
    });

    // CRITICAL: Update ALL orders for this menu item to reference the split bill
    console.log('🔄 Updating orders with split bill ID:', splitBill.id);
    console.log('🔍 Update criteria:', {
      sessionId,
      menuItemId,
      status: 'placed'
    });
    
    // First, let's check what orders exist for this criteria
    const { data: existingOrders, error: checkError } = await supabase
      .from('orders')
      .select('id, split_bill_id')
      .eq('session_id', sessionId)
      .eq('menu_item_id', menuItemId)
      .eq('status', 'placed');
    
    if (checkError) {
      console.error('❌ Error checking existing orders:', checkError);
      return NextResponse.json({ error: 'Failed to check existing orders' }, { status: 500 });
    }
    
    console.log('📋 Found orders to update:', existingOrders);
    
    if (!existingOrders || existingOrders.length === 0) {
      console.warn('⚠️ No orders found to update with split bill ID');
      return NextResponse.json({ 
        success: true, 
        splitBill: splitBill,
        message: 'Split bill created but no orders found to link' 
      });
    }
    
    // Now update the orders
    const { data: updatedOrders, error: orderError } = await supabase
      .from('orders')
      .update({ split_bill_id: splitBill.id })
      .eq('session_id', sessionId)
      .eq('menu_item_id', menuItemId)
      .eq('status', 'placed')
      .select('id, split_bill_id');

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
      console.log('✅ Successfully updated orders with split bill ID:', splitBill.id);
      console.log('📋 Updated orders:', updatedOrders);
      console.log('📊 Number of orders updated:', updatedOrders?.length || 0);
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
