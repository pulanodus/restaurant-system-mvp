import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { withApiErrorHandling } from '@/lib/error-handling'wrappers';

export const GET = withApiErrorHandling(async (request: NextRequest, { params }: { params: Promise<{ sessionId: string }> }) => {
  try {
    const { sessionId } = await params;

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    console.log('🔧 API: Fetching session details', { sessionId });

    // Get session with table information
    const { data: session, error: sessionError } = await supabaseServer
      .from('sessions')
      .select(`
        id,
        table_id,
        status,
        started_by_name,
        created_at,
        payment_status,
        final_total,
        tables!sessions_table_id_fkey (
          id,
          table_number,
          capacity,
          current_pin
        )
      `)
      .eq('id', sessionId)
      .single();

    if (sessionError) {
      console.error('❌ Database error:', sessionError);
      return NextResponse.json(
        { error: `Failed to fetch session: ${sessionError.message}` },
        { status: 500 }
      );
    }

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    console.log('✅ Session details fetched:', session);

    return NextResponse.json({
      success: true,
      session
    });

  } catch (error) {
    console.error('🔍 API: Session details exception:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});