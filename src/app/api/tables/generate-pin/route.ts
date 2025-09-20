import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { handleError } from '@/lib/error-handling';

export const POST = async (request: NextRequest) => {
  try {
    const { tableId, staffId } = await request.json();
    
    if (!tableId || !staffId) {
      return NextResponse.json(
        { error: 'Table ID and Staff ID are required' },
        { status: 400 }
      );
    }

    console.log('🔑 Generating PIN for table:', { tableId, staffId });

    // Verify staff exists and is active
    const { data: staff, error: staffError } = await supabaseServer
      .from('staff')
      .select('*')
      .eq('id', staffId)
      .eq('is_active', true)
      .single();

    if (staffError || !staff) {
      console.error('❌ Staff not found:', staffError);
      return NextResponse.json(
        { error: 'Invalid staff ID or staff member is inactive' },
        { status: 404 }
      );
    }

    // Verify table exists and is available
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

    // Check if table is already occupied
    if (table.occupied) {
      return NextResponse.json(
        { error: 'Table is already occupied' },
        { status: 409 }
      );
    }

    // Generate a 4-digit PIN
    const pin = Math.floor(1000 + Math.random() * 9000).toString();
    
    // Update table with PIN and mark as occupied
    const { data: updatedTable, error: updateError } = await supabaseServer
      .from('tables')
      .update({ 
        current_pin: pin,
        occupied: true
      })
      .eq('id', tableId)
      .select('*')
      .single();

    if (updateError) {
      console.error('❌ Failed to update table:', updateError);
      return NextResponse.json(
        { error: 'Failed to update table with PIN' },
        { status: 500 }
      );
    }

    // Create session with staff assignment
    const { data: session, error: sessionError } = await supabaseServer
      .from('sessions')
      .insert({
        table_id: tableId,
        status: 'active',
        started_by_name: staff.name,
        served_by: staffId
      })
      .select(`
        id,
        table_id,
        status,
        served_by,
        started_by_name,
        created_at
      `)
      .single();

    if (sessionError) {
      console.error('❌ Failed to create session:', sessionError);
      // Rollback table update
      await supabaseServer
        .from('tables')
        .update({ 
          current_pin: null,
          occupied: false
        })
        .eq('id', tableId);
      
      return NextResponse.json(
        { error: 'Failed to create session' },
        { status: 500 }
      );
    }

    console.log('✅ PIN generated and table assigned successfully:', { 
      tableNumber: table.table_number,
      pin,
      staffName: staff.name,
      sessionId: session.id
    });

    return NextResponse.json({
      success: true,
      pin,
      table: {
        id: table.id,
        table_number: table.table_number,
        capacity: table.capacity
      },
      session: {
        id: session.id,
        status: session.status
      },
      staff: {
        id: staff.id,
        staffId: staff.staff_id,
        name: staff.name,
        role: staff.role
      },
      message: `PIN ${pin} generated for Table ${table.table_number}. ${staff.name} is now assigned to this table.`
    });

  } catch (error) {
    console.error('🔍 PIN generation exception:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});
