import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { withApiErrorHandling } from '@/lib/error-handling'wrappers';

export const GET = withApiErrorHandling(async (request: NextRequest) => {
  try {
    console.log('🔧 API: Fetching all tables');
    
    // Get all tables with their current status
    const { data: tables, error } = await supabaseServer
      .from('tables')
      .select(`
        id,
        table_number,
        capacity,
        occupied,
        is_active,
        current_session_id,
        current_pin
      `)
      .eq('is_active', true)
      .order('table_number');
    
    if (error) {
      console.error('❌ Database error:', error);
      return NextResponse.json(
        { error: `Failed to fetch tables: ${error.message}` },
        { status: 500 }
      );
    }
    
    console.log('✅ Tables fetched:', tables?.length || 0);
    
    return NextResponse.json({
      success: true,
      data: tables || [],
      count: tables?.length || 0
    });
    
  } catch (error) {
    console.error('🔍 API: Tables exception:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}, 'TABLES');