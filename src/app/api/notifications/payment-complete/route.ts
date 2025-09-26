import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { handleError } from '@/lib/error-handling';

export const GET = async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    console.log('🔔 API: Checking for payment completion notifications for session:', sessionId);

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
      return handleError(error, 'Failed to fetch payment notifications', 500);
    }

    const hasNotification = notifications && notifications.length > 0;
    const notification = hasNotification ? notifications[0] : null;

    if (hasNotification) {
      console.log('🔔 Found payment completion notification:', notification);
      
      // Mark notification as acknowledged (but don't delete it yet)
      const { error: acknowledgeError } = await supabaseServer
        .from('notifications')
        .update({ status: 'acknowledged' })
        .eq('id', notification.id);
      
      if (acknowledgeError) {
        console.error('⚠️ Warning: Failed to acknowledge notification:', acknowledgeError);
      } else {
        console.log('✅ Payment completion notification acknowledged');
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
    return handleError(error, 'Internal server error', 500);
  }
};
