import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { handleError } from '@/lib/error-handling';

export const POST = async (request: NextRequest) => {
  try {
    const { sessionId, staffId } = await request.json();
    
    if (!sessionId || !staffId) {
      return NextResponse.json(
        { error: 'Session ID and Staff ID are required' },
        { status: 400 }
      );
    }

    console.log('👤 Assigning staff to session:', { sessionId, staffId });

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

    // Verify session exists and get table info
    const { data: session, error: sessionError } = await supabaseServer
      .from('sessions')
      .select(`
        id,
        table_id,
        status,
        served_by,
        tables!sessions_table_id_fkey (
          table_number
        )
      `)
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      console.error('❌ Session not found:', sessionError);
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Check if session is already assigned to someone else
    if (session.served_by && session.served_by !== staffId) {
      return NextResponse.json(
        { error: 'This table is already assigned to another staff member' },
        { status: 409 }
      );
    }

    // Assign staff to session
    const { data: updatedSession, error: assignmentError } = await supabaseServer
      .from('sessions')
      .update({ served_by: staffId })
      .eq('id', sessionId)
      .select(`
        id,
        table_id,
        status,
        served_by,
        tables!sessions_table_id_fkey (
          table_number
        )
      `)
      .single();

    if (assignmentError) {
      console.error('❌ Failed to assign staff to session:', assignmentError);
      return NextResponse.json(
        { error: 'Failed to assign staff to table' },
        { status: 500 }
      );
    }

    console.log('✅ Staff assigned to table successfully:', { 
      staffName: staff.name,
      staffId: staff.staff_id,
      tableNumber: Array.isArray(session.tables) ? session.tables[0]?.table_number : (session.tables as any)?.table_number,
      sessionId
    });

    return NextResponse.json({
      success: true,
      assignment: {
        sessionId,
        tableNumber: Array.isArray(session.tables) ? session.tables[0]?.table_number : (session.tables as any)?.table_number,
        staff: {
          id: staff.id,
          staffId: staff.staff_id,
          name: staff.name,
          role: staff.role
        }
      },
      message: `${staff.name} has been assigned to Table ${Array.isArray(session.tables) ? session.tables[0]?.table_number : (session.tables as any)?.table_number}`
    });

  } catch (error) {
    console.error('🔍 Staff assignment exception:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
};
