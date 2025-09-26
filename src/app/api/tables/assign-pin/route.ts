import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { handleError } from '@/lib/error-handling';

export const POST = async (request: NextRequest) => {
  try {
    const { tableId } = await request.json();
    
    if (!tableId) {
      return NextResponse.json(
        { error: 'Table ID is required' },
        { status: 400 }
      );
    }

    console.log('🔑 Assigning PIN to occupied table:', { tableId });

    // Verify table exists
    const { data: table, error: tableError } = await supabaseServer
      .from('tables')
      .select('*')
      .eq('id', tableId)
      .eq('is_active', true)
      .single();

    if (tableError || !table) {
      console.error('❌ Table not found:', tableError);
      return NextResponse.json(
        { error: 'Table not found or inactive' },
        { status: 404 }
      );
    }

    // Check if table already has a PIN
    if (table.current_pin) {
      return NextResponse.json({
        success: true,
        pin: table.current_pin,
        table: {
          id: table.id,
          table_number: table.table_number,
          capacity: table.capacity
        },
        message: `Table ${table.table_number} already has PIN: ${table.current_pin}`
      });
    }

    // Generate a 4-digit PIN
    const pin = Math.floor(1000 + Math.random() * 9000).toString();
    
    // Update table with PIN
    const { data: updatedTable, error: updateError } = await supabaseServer
      .from('tables')
      .update({ 
        current_pin: pin
      })
      .eq('id', tableId)
      .select('*')
      .single();

    if (updateError) {
      console.error('❌ Failed to update table:', updateError);
      return NextResponse.json(
        { error: 'Failed to assign PIN to table' },
        { status: 500 }
      );
    }

    console.log('✅ PIN assigned successfully:', { 
      tableNumber: table.table_number,
      pin
    });

    return NextResponse.json({
      success: true,
      pin,
      table: {
        id: table.id,
        table_number: table.table_number,
        capacity: table.capacity
      },
      message: `PIN ${pin} assigned to Table ${table.table_number}`
    });

  } catch (error) {
    console.error('🔍 PIN assignment exception:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
};
