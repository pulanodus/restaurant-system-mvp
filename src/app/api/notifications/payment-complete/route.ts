import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export const GET = async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    // Check for payment completion notifications for this session
    const { data: notifications, error } = await supabaseServer
      .from('notifications')
      .select('*')
      .eq('session_id', sessionId)
      .eq('type', 'payment_complete')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error('❌ Error fetching payment notifications:', error);
      return NextResponse.json({ error: 'Failed to fetch payment notifications' }, { status: 500 });
    }

    const hasNotification = notifications && notifications.length > 0;
    const notification = hasNotification ? notifications[0] : null;

    if (hasNotification) {
      // Mark notification as acknowledged (but don't delete it yet)
      const { error: acknowledgeError } = await supabaseServer
        .from('notifications')
        .update({ status: 'acknowledged' })
        .eq('id', notification.id);
      
      if (acknowledgeError) {
        console.error('⚠️ Warning: Failed to acknowledge notification:', acknowledgeError);
      }
    }

    return NextResponse.json({
      success: true,
      hasNotification,
      notification,
      sessionId
    });

  } catch (error) {
    console.error('🔍 API: Payment notification check exception:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
};
