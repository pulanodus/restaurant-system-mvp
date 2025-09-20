import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { withApiErrorHandling } from '@/lib/error-handling'wrappers';
import { logDetailedError } from '@/lib/error-handling';

export const GET = withApiErrorHandling(async (request: NextRequest) => {
  try {
    console.log('🔧 API: Fetching all staff assignments');

    // Get all active sessions (served_by column may not exist yet)
    const { data: sessions, error: sessionsError } = await supabaseServer
      .from('sessions')
      .select(`
        id,
        started_by_name
      `)
      .eq('status', 'active');

    if (sessionsError) {
      logDetailedError('Failed to fetch staff assignments', sessionsError);
      return NextResponse.json(
        { error: 'Failed to fetch staff assignments' },
        { status: 500 }
      );
    }

    // Get all staff members (fallback if staff table doesn't exist)
    let staff = null;
    try {
      const { data: staffData, error: staffError } = await supabaseServer
        .from('staff')
        .select('staff_id, name')
        .eq('is_active', true);
      
      if (!staffError) {
        staff = staffData;
      } else {
        console.warn('⚠️ Staff table not found, using mock data');
      }
    } catch (error) {
      console.warn('⚠️ Staff table not available, using mock data');
    }

    // Create a map of staff assignments
    const assignments: Record<string, string> = {};
    
    if (sessions) {
      sessions.forEach(session => {
        if (session.started_by_name) {
          // Use started_by_name as the staff identifier for now
          assignments[session.started_by_name] = session.started_by_name;
        }
      });
    }

    // If no staff table exists, return empty assignments but don't fail
    if (!staff && Object.keys(assignments).length === 0) {
      console.log('ℹ️ No staff assignments found (staff table may not exist yet)');
    }

    console.log('✅ Staff assignments fetched successfully:', Object.keys(assignments).length, 'staff members');

    return NextResponse.json({
      success: true,
      assignments: assignments,
      count: Object.keys(assignments).length
    });

  } catch (error) {
    console.error('🔍 API: Fetch all staff assignments exception:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});
