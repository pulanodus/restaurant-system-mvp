import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseUrl, getSupabaseServiceKey } from '@/lib/secure-env';

// POST /api/cron/cleanup-stale-users - Automated cleanup endpoint for cron jobs
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

    console.log('🤖 CRON - Starting automated stale user cleanup...');

    const supabaseUrl = getSupabaseUrl();
    const supabaseServiceKey = getSupabaseServiceKey();
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      db: { schema: 'public' },
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Get all active sessions with their diners
    const { data: sessions, error: sessionsError } = await supabase
      .from('sessions')
      .select('id, created_at, diners, tables!inner(table_number)')
      .eq('status', 'active');

    if (sessionsError) {
      console.error('❌ CRON - Error fetching sessions:', sessionsError);
      return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
    }

    if (!sessions || sessions.length === 0) {
      console.log('🤖 CRON - No active sessions found');
      return NextResponse.json({ 
        message: 'No active sessions found',
        cleanedUsers: [],
        summary: { totalSessions: 0, totalCleanedUsers: 0 }
      });
    }

    const now = new Date();
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    const cleanedUsers = [];
    let totalCleanedUsers = 0;
    const sessionsToUpdate = [];

    console.log(`🤖 CRON - Processing ${sessions.length} active sessions...`);

    // Process each session
    sessions.forEach(session => {
      const diners = Array.isArray(session.diners) ? session.diners : [];
      const tableNumber = session.tables?.table_number || 'Unknown';
      let sessionNeedsUpdate = false;
      const updatedDiners = [];

      diners.forEach((diner: any) => {
        if (diner.isActive === true) {
          const lastActive = diner.lastActive ? new Date(diner.lastActive) : new Date(session.created_at);
          const isStale = lastActive < twoHoursAgo;

          if (isStale) {
            // Mark this user as inactive
            const cleanedUser = {
              sessionId: session.id,
              tableNumber,
              userName: diner.name,
              lastActive: diner.lastActive,
              hoursInactive: Math.round((now.getTime() - lastActive.getTime()) / (1000 * 60 * 60) * 10) / 10
            };

            cleanedUsers.push(cleanedUser);
            totalCleanedUsers++;

            // Update the diner to inactive
            updatedDiners.push({
              ...diner,
              isActive: false,
              lastActive: diner.lastActive || new Date().toISOString(),
              logoutTime: new Date().toISOString()
            });

            sessionNeedsUpdate = true;
            console.log(`🤖 CRON - Auto-cleaned stale user: ${diner.name} (inactive for ${cleanedUser.hoursInactive}h)`);
          } else {
            // Keep active user as-is
            updatedDiners.push(diner);
          }
        } else {
          // Keep inactive users as-is
          updatedDiners.push(diner);
        }
      });

      if (sessionNeedsUpdate) {
        sessionsToUpdate.push({
          id: session.id,
          diners: updatedDiners
        });
      }
    });

    // Update sessions with cleaned diners
    let updateSuccessCount = 0;
    let updateErrorCount = 0;

    for (const sessionUpdate of sessionsToUpdate) {
      const { error: updateError } = await supabase
        .from('sessions')
        .update({ diners: sessionUpdate.diners })
        .eq('id', sessionUpdate.id);

      if (updateError) {
        console.error(`❌ CRON - Failed to update session ${sessionUpdate.id}:`, updateError);
        updateErrorCount++;
      } else {
        updateSuccessCount++;
        console.log(`✅ CRON - Updated session ${sessionUpdate.id}`);
      }
    }

    // Log the cleanup results
    const { error: logError } = await supabase
      .from('audit_logs')
      .insert({
        action: 'AUTO_STALE_USER_CLEANUP',
        details: {
          totalSessions: sessions.length,
          totalCleanedUsers,
          sessionsUpdated: updateSuccessCount,
          sessionsFailed: updateErrorCount,
          cleanedUsers: cleanedUsers.map(u => u.userName),
          timestamp: new Date().toISOString(),
          trigger: 'cron'
        }
      });

    if (logError) {
      console.error('❌ CRON - Failed to log cleanup action:', logError);
    }

    console.log(`🤖 CRON - Automated cleanup completed: ${totalCleanedUsers} users cleaned, ${updateSuccessCount} sessions updated`);

    return NextResponse.json({
      message: `Automated cleanup completed: ${totalCleanedUsers} stale users cleaned`,
      cleanedUsers,
      summary: {
        totalSessions: sessions.length,
        totalCleanedUsers,
        sessionsUpdated: updateSuccessCount,
        sessionsFailed: updateErrorCount
      },
      threshold: {
        hours: 2,
        cutoffTime: twoHoursAgo.toISOString()
      }
    });

  } catch (error) {
    console.error('❌ CRON - Error in automated cleanup:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
