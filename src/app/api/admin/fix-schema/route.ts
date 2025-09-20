import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseUrl, getSupabaseServiceKey } from '@/lib/secure-env';

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = getSupabaseUrl();
    const supabaseServiceKey = getSupabaseServiceKey();
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('🔧 Fixing database schema - adding unit_price column');

    // First, let's check what columns exist in the orders table
    const { data: columns, error: columnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_name', 'orders')
      .eq('table_schema', 'public');

    if (columnsError) {
      console.error('❌ Error checking columns:', columnsError);
      return NextResponse.json({ error: columnsError.message }, { status: 500 });
    }

    console.log('📋 Existing columns in orders table:', columns?.map(c => c.column_name));

    // Check if unit_price already exists
    const hasUnitPrice = columns?.some(col => col.column_name === 'unit_price');
    
    if (hasUnitPrice) {
      console.log('✅ unit_price column already exists');
      return NextResponse.json({ 
        success: true,
        message: 'unit_price column already exists',
        columns: columns?.map(c => c.column_name)
      });
    }

    // Add unit_price column
    const { error: alterError } = await supabase.rpc('exec', {
      sql: 'ALTER TABLE orders ADD COLUMN unit_price DECIMAL(10,2);'
    });

    if (alterError) {
      console.error('❌ Error adding unit_price column:', alterError);
      return NextResponse.json({ error: alterError.message }, { status: 500 });
    }

    // Update existing orders to have unit_price from menu_items
    const { error: updateError } = await supabase.rpc('exec', {
      sql: `
        UPDATE orders 
        SET unit_price = mi.price
        FROM menu_items mi
        WHERE orders.menu_item_id = mi.id 
        AND orders.unit_price IS NULL;
      `
    });

    if (updateError) {
      console.error('❌ Error updating unit_price values:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Make unit_price NOT NULL
    const { error: notNullError } = await supabase.rpc('exec', {
      sql: 'ALTER TABLE orders ALTER COLUMN unit_price SET NOT NULL;'
    });

    if (notNullError) {
      console.error('❌ Error setting unit_price NOT NULL:', notNullError);
      return NextResponse.json({ error: notNullError.message }, { status: 500 });
    }

    console.log('✅ Successfully added unit_price column');

    return NextResponse.json({ 
      success: true,
      message: 'unit_price column added successfully',
      columns: columns?.map(c => c.column_name)
    });

  } catch (error) {
    console.error('❌ Error in fix-schema API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
