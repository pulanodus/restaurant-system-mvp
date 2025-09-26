import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// POST /api/test/daily-reset - Test daily reset without authentication
export async function POST(request: NextRequest) {
  try {
    console.log('🧪 TEST - Starting test daily reset...');

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ TEST - Missing required environment variables');
      return NextResponse.json({ 
        error: 'Missing required environment variables for daily reset'
      }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      db: { schema: 'public' },
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Get current active sessions count for logging
    const { data: activeSessions, error: sessionCountError } = await supabase
      .from('sessions')
      .select('id, started_by_name, diners')
      .eq('status', 'active');

    if (sessionCountError) {
      console.error('❌ TEST - Error counting sessions:', sessionCountError);
    } else {
      console.log('📊 TEST - Sessions to be reset:', activeSessions?.length || 0);
    }

    // 1. Mark all active sessions as 'completed'
    const { error: sessionUpdateError } = await supabase
      .from('sessions')
      .update({ 
        status: 'completed',
        ended_at: new Date().toISOString()
      })
      .eq('status', 'active');

    if (sessionUpdateError) {
      console.error('❌ TEST - Error updating sessions:', sessionUpdateError);
      return NextResponse.json(
        { error: `Failed to update sessions: ${sessionUpdateError.message}` },
        { status: 500 }
      );
    }

    // 2. Mark all tables as unoccupied and clear their session data
    const { error: tableUpdateError } = await supabase
      .from('tables')
      .update({ 
        occupied: false,
        current_session_id: null,
        current_pin: null
      })
      .eq('occupied', true);

    if (tableUpdateError) {
      console.error('❌ TEST - Error updating tables:', tableUpdateError);
      return NextResponse.json(
        { error: `Failed to update tables: ${tableUpdateError.message}` },
        { status: 500 }
      );
    }

    // 3. Clean up old cart items (orders with status 'cart' older than 24 hours)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { error: cartCleanupError } = await supabase
      .from('orders')
      .delete()
      .eq('status', 'cart')
      .lt('created_at', twentyFourHoursAgo);

    if (cartCleanupError) {
      console.warn('⚠️ TEST - Warning: Failed to cleanup old cart items:', cartCleanupError.message);
      // Don't fail the whole operation for this
    }

    // 4. Clean up all notifications (both pending and completed)
    const { error: notificationCleanupError } = await supabase
      .from('notifications')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all notifications

    if (notificationCleanupError) {
      console.warn('⚠️ TEST - Warning: Failed to cleanup notifications:', notificationCleanupError.message);
    } else {
      console.log('✅ All notifications cleared');
    }

    console.log('✅ TEST - Test daily reset completed successfully');

    return NextResponse.json({
      success: true,
      message: 'Test daily reset completed successfully',
      data: {
        sessions_reset: activeSessions?.length || 0,
        reset_time: new Date().toISOString(),
        trigger: 'test_manual'
      }
    });

  } catch (error) {
    console.error('❌ TEST - Daily reset error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
