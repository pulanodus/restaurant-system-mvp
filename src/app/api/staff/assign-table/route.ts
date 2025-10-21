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

    // Verify session exists
    const { data: session, error: sessionError } = await supabaseServer
      .from('sessions')
      .select(`
        id,
        table_id,
        status,
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

    // Assign staff to session
    const { data: assignmentResult, error: assignmentError } = await supabaseServer
      .rpc('assign_staff_to_session', {
        p_session_id: sessionId,
        p_staff_id: staffId
      });

    if (assignmentError) {
      console.error('❌ Failed to assign staff to session:', assignmentError);
      return NextResponse.json(
        { error: 'Failed to assign staff to table' },
        { status: 500 }
      );
    }

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
