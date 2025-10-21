import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { sessionId, menuItemId, originalPrice, splitCount, participants } = await request.json();

    // Calculate split price
    const splitPrice = originalPrice / splitCount;

    // Create split bill record
    const { data, error } = await supabase
      .from('split_bills')
      .insert({
        session_id: sessionId,
        menu_item_id: menuItemId,
        original_price: originalPrice,
        split_count: splitCount,
        split_price: splitPrice,
        participants: participants || [],
        status: 'active'
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error creating split bill:', error);
      return NextResponse.json({ error: `Failed to create split bill: ${error.message}` }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      splitBill: data,
      message: 'Split bill created successfully' 
    });

  } catch (error) {
    console.error('Split bill creation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
