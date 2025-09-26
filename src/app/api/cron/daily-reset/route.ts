import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// POST /api/cron/daily-reset - Automatic daily reset at 3AM
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret for security
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
      console.error('❌ CRON - CRON_SECRET not configured');
      return NextResponse.json({ error: 'Cron secret not configured' }, { status: 500 });
    }

    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ') || authHeader.slice(7) !== cronSecret) {
      console.error('❌ CRON - Unauthorized cron attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🌅 CRON - Starting automatic daily reset at 3AM...');

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ CRON - Missing required environment variables');
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
      console.error('❌ CRON - Error counting sessions:', sessionCountError);
    } else {
      console.log('📊 CRON - Sessions to be reset:', activeSessions?.length || 0);
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
      console.error('❌ CRON - Error updating sessions:', sessionUpdateError);
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
      console.error('❌ CRON - Error updating tables:', tableUpdateError);
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
      console.warn('⚠️ CRON - Warning: Failed to cleanup old cart items:', cartCleanupError.message);
      // Don't fail the whole operation for this
    }

    // 4. Log the automatic daily reset action
    const { error: logError } = await supabase
      .from('audit_logs')
      .insert([{
        action: 'AUTO_DAILY_RESET',
        description: `Automatic daily reset performed at 3AM. Reset ${activeSessions?.length || 0} active sessions.`,
        metadata: {
          sessions_reset: activeSessions?.length || 0,
          reset_time: new Date().toISOString(),
          trigger: 'cron_3am'
        }
      }]);

    if (logError) {
      console.warn('⚠️ CRON - Warning: Failed to log daily reset:', logError.message);
      // Don't fail the whole operation for this
    }

    console.log('✅ CRON - Automatic daily reset completed successfully');

    return NextResponse.json({
      success: true,
      message: 'Automatic daily reset completed successfully',
      data: {
        sessions_reset: activeSessions?.length || 0,
        reset_time: new Date().toISOString(),
        trigger: 'cron_3am'
      }
    });

  } catch (error) {
    console.error('❌ CRON - Daily reset error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
