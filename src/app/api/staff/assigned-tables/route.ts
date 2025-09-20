import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { withApiErrorHandling } from '@/lib/error-handling'wrappers';

export const GET = withApiErrorHandling(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const staffId = searchParams.get('staffId');

    if (!staffId) {
      return NextResponse.json(
        { error: 'Staff ID is required' },
        { status: 400 }
      );
    }

    console.log('📋 Fetching staff assigned tables:', { staffId });

    // Verify staff exists
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

    // Get staff assigned tables using the database function
    const { data: assignedTables, error: tablesError } = await supabaseServer
      .rpc('get_staff_assigned_tables', {
        p_staff_id: staffId
      });

    if (tablesError) {
      console.error('❌ Failed to fetch assigned tables:', tablesError);
      return NextResponse.json(
        { error: 'Failed to fetch assigned tables' },
        { status: 500 }
      );
    }

    // Transform tables to match expected format
    const transformedTables = (assignedTables || []).map(table => ({
      id: table.session_id,
      table_number: table.table_number,
      table_id: table.table_id,
      status: table.status,
      started_at: table.started_at,
      diners: table.diners || [],
      order_total: table.order_total || 0,
      // Add staff information
      assigned_staff: {
        id: staff.id,
        staffId: staff.staff_id,
        name: staff.name,
        role: staff.role
      }
    }));

    console.log('✅ Staff assigned tables fetched:', { 
      staffName: staff.name,
      assignedTablesCount: transformedTables.length
    });

    return NextResponse.json({
      success: true,
      tables: transformedTables,
      staff: {
        id: staff.id,
        staffId: staff.staff_id,
        name: staff.name,
        role: staff.role
      },
      summary: {
        total_assigned: transformedTables.length,
        active_tables: transformedTables.filter(t => t.status === 'active').length
      }
    });

  } catch (error) {
    console.error('🔍 Staff assigned tables exception:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}, 'STAFF_ASSIGNED_TABLES');
