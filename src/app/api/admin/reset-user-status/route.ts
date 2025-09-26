import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseUrl, getSupabaseServiceKey } from '@/lib/secure-env';

// POST /api/admin/reset-user-status - Reset a specific user's status to inactive
export async function POST(request: NextRequest) {
  try {
    const { sessionId, userName } = await request.json();
    
    console.log('🔄 Admin reset user status:', { sessionId, userName });

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

    // Get the current session
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('diners')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    console.log('🔍 Current diners:', session.diners);

    // Find and reset the specific user
    const updatedDiners = session.diners.map((diner: any) => {
      if (diner.name.toLowerCase() === userName.toLowerCase()) {
        console.log('🔍 Resetting user:', diner.name);
        return {
          ...diner,
          isActive: false,
          lastActive: new Date().toISOString(),
          logoutTime: new Date().toISOString()
        };
      }
      return diner;
    });

    console.log('🔍 Updated diners:', updatedDiners);

    // Update the session
    const { data: updateData, error: updateError } = await supabase
      .from('sessions')
      .update({ diners: updatedDiners })
      .eq('id', sessionId)
      .select('diners');

    if (updateError) {
      console.error('❌ Error updating session:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    console.log('✅ User status reset successfully');

    return NextResponse.json({
      success: true,
      message: `User ${userName} status reset to inactive`,
      data: updateData
    });

  } catch (error) {
    console.error('❌ Reset user status error:', error);
    return NextResponse.json(
      { error: 'Failed to reset user status' },
      { status: 500 }
    );
  }
}
