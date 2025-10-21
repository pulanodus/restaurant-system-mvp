import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// POST /api/test/daily-reset - Test daily reset without authentication
export async function POST() {
  try {
    
    // 1. Reset all active sessions to completed
    const { data: activeSessions, error: sessionsError } = await supabaseServer
      .from('sessions')
      .select('id')
      .eq('status', 'active');
    
    if (sessionsError) {
      console.error('❌ TEST - Error fetching active sessions:', sessionsError);
      return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
    }
    
    if (activeSessions && activeSessions.length > 0) {
      const { error: updateError } = await supabaseServer
        .from('sessions')
        .update({ 
          status: 'completed',
          ended_at: new Date().toISOString()
        })
        .in('id', activeSessions.map(s => s.id));
      
      if (updateError) {
        console.error('❌ TEST - Error resetting sessions:', updateError);
        return NextResponse.json({ error: 'Failed to reset sessions' }, { status: 500 });
      }
    }
    
    // 2. Clear all notifications
    const { error: notificationsError } = await supabaseServer
      .from('notifications')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Hack to delete all
    
    if (notificationsError) {
      console.error('❌ TEST - Error clearing notifications:', notificationsError);
      return NextResponse.json({ error: 'Failed to clear notifications' }, { status: 500 });
    }
    
    // 3. Reset all tables to unoccupied
    const { error: tablesError } = await supabaseServer
      .from('tables')
      .update({ 
        occupied: false,
        current_session_id: null,
        current_pin: null
      });
    
    if (tablesError) {
      console.error('❌ TEST - Error resetting tables:', tablesError);
      return NextResponse.json({ error: 'Failed to reset tables' }, { status: 500 });
    }
    
    return NextResponse.json({ 
      message: 'Test daily reset completed',
      sessionsReset: activeSessions?.length || 0
    });
    
  } catch (error) {
    console.error('❌ TEST - Exception during daily reset:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
