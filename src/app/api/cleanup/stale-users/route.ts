import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseUrl, getSupabaseServiceKey } from '@/lib/secure-env';

// GET /api/cleanup/stale-users - Check for stale users without modifying
export async function GET(request: NextRequest) {
  try {
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
      console.error('❌ CLEANUP - Error fetching sessions:', sessionsError);
      return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
    }

    if (!sessions || sessions.length === 0) {
      return NextResponse.json({ 
        message: 'No active sessions found',
        staleUsers: [],
        summary: { totalSessions: 0, totalStaleUsers: 0 }
      });
    }

    const now = new Date();
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000); // 2 hours ago
    const staleUsers: any[] = [];
    let totalActiveUsers = 0;
    let totalStaleUsers = 0;

    sessions.forEach(session => {
      const diners = Array.isArray(session.diners) ? session.diners : [];
      const table = Array.isArray(session.tables) ? session.tables[0] : session.tables;
      const tableNumber = table?.table_number || 'Unknown';
      
      diners.forEach((diner: any) => {
        totalActiveUsers++;
        
        if (diner.isActive === true) {
          const lastActive = diner.lastActive ? new Date(diner.lastActive) : new Date(session.created_at);
          const isStale = lastActive < twoHoursAgo;
          
          if (isStale) {
            totalStaleUsers++;
            staleUsers.push({
              sessionId: session.id,
              tableNumber,
              userName: diner.name,
              lastActive: diner.lastActive,
              sessionCreated: session.created_at,
              hoursInactive: Math.round((now.getTime() - lastActive.getTime()) / (1000 * 60 * 60) * 10) / 10,
              hasLogoutTime: !!diner.logoutTime
            });
          }
        }
      });
    });

    return NextResponse.json({
      message: `Found ${totalStaleUsers} stale active users`,
      staleUsers,
      summary: {
        totalSessions: sessions.length,
        totalActiveUsers,
        totalStaleUsers,
        stalePercentage: totalActiveUsers > 0 ? Math.round((totalStaleUsers / totalActiveUsers) * 100) : 0
      },
      threshold: {
        hours: 2,
        cutoffTime: twoHoursAgo.toISOString()
      }
    });

  } catch (error) {
    console.error('❌ CLEANUP - Error in GET /api/cleanup/stale-users:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// POST /api/cleanup/stale-users - Actually clean up stale users
export async function POST(request: NextRequest) {
  try {
    // Check for authorization
    const authHeader = request.headers.get('authorization');
    const expectedKey = process.env.CLEANUP_API_KEY;
    
    if (!expectedKey) {
      console.error('❌ CLEANUP - CLEANUP_API_KEY not configured');
      return NextResponse.json({ error: 'Cleanup API key not configured' }, { status: 500 });
    }

    if (!authHeader || !authHeader.startsWith('Bearer ') || authHeader.slice(7) !== expectedKey) {
      console.error('❌ CLEANUP - Unauthorized cleanup attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
      console.error('❌ CLEANUP - Error fetching sessions:', sessionsError);
      return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
    }

    if (!sessions || sessions.length === 0) {
      return NextResponse.json({ 
        message: 'No active sessions found',
        cleanedUsers: [],
        summary: { totalSessions: 0, totalCleanedUsers: 0 }
      });
    }

    const now = new Date();
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    const cleanedUsers: any[] = [];
    let totalCleanedUsers = 0;
    const sessionsToUpdate: any[] = [];

    // Process each session
    sessions.forEach(session => {
      const diners = Array.isArray(session.diners) ? session.diners : [];
      const table = Array.isArray(session.tables) ? session.tables[0] : session.tables;
      const tableNumber = table?.table_number || 'Unknown';
      let sessionNeedsUpdate = false;
      const updatedDiners: any[] = [];

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
        console.error(`❌ CLEANUP - Failed to update session ${sessionUpdate.id}:`, updateError);
        updateErrorCount++;
      } else {
        updateSuccessCount++;
      }
    }

    // Log the cleanup results
    const { error: logError } = await supabase
      .from('audit_logs')
      .insert({
        action: 'STALE_USER_CLEANUP',
        details: {
          totalSessions: sessions.length,
          totalCleanedUsers,
          sessionsUpdated: updateSuccessCount,
          sessionsFailed: updateErrorCount,
          cleanedUsers: cleanedUsers.map(u => u.userName),
          timestamp: new Date().toISOString()
        }
      });

    if (logError) {
      console.error('❌ CLEANUP - Failed to log cleanup action:', logError);
    }

    return NextResponse.json({
      message: `Successfully cleaned ${totalCleanedUsers} stale users`,
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
    console.error('❌ CLEANUP - Error in POST /api/cleanup/stale-users:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
