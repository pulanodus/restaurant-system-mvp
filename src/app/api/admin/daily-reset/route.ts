import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseUrl, getSupabaseServiceKey } from '@/lib/secure-env';
import { withAdminAuth } from '@/lib/api-auth';

// POST /api/admin/daily-reset - Reset all sessions and clear daily data
export const POST = withAdminAuth(async (request: NextRequest, adminUser) => {
  try {
    if (!adminUser) {
      return NextResponse.json(
        { error: 'Admin authentication required' },
        { status: 401 }
      );
    }

    console.log('🔄 Admin daily reset initiated by:', adminUser.email);

    const supabaseUrl = getSupabaseUrl();
    const supabaseServiceKey = getSupabaseServiceKey();
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      db: {
        schema: 'public'
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Get current active sessions count for logging
    const { data: activeSessions, error: sessionCountError } = await supabase
      .from('sessions')
      .select('id, started_by_name, diners')
      .eq('status', 'active');

    if (sessionCountError) {
      console.error('❌ Error counting sessions:', sessionCountError);
    } else {
      console.log('📊 Sessions to be reset:', activeSessions?.length || 0);
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
      console.error('❌ Error updating sessions:', sessionUpdateError);
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
      console.error('❌ Error updating tables:', tableUpdateError);
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
      console.warn('⚠️ Warning: Failed to cleanup old cart items:', cartCleanupError.message);
      // Don't fail the whole operation for this
    }

    // 4. Log the daily reset action
    const { error: logError } = await supabase
      .from('audit_logs')
      .insert([{
        action: 'daily_reset',
        description: `Daily reset performed by ${adminUser.email}. Reset ${activeSessions?.length || 0} active sessions.`,
        user_id: adminUser.id,
        metadata: {
          sessions_reset: activeSessions?.length || 0,
          reset_time: new Date().toISOString()
        }
      }]);

    if (logError) {
      console.warn('⚠️ Warning: Failed to log daily reset:', logError.message);
      // Don't fail the whole operation for this
    }

    console.log('✅ Daily reset completed successfully');

    return NextResponse.json({
      success: true,
      message: 'Daily reset completed successfully',
      data: {
        sessions_reset: activeSessions?.length || 0,
        reset_time: new Date().toISOString(),
        performed_by: adminUser.email
      }
    });

  } catch (error) {
    console.error('❌ Daily reset error:', error);
    return NextResponse.json(
      { error: 'Failed to perform daily reset' },
      { status: 500 }
    );
  }
});
