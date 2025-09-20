import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { handleError } from '@/lib/error-handling';

export const GET = async (request: NextRequest) => {
  try {
    console.log('🔧 API: Checking payment status');
    
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }
    
    // Get session payment status
    const { data: session, error: sessionError } = await supabaseServer
      .from('sessions')
      .select('payment_status, tip_amount, final_total, payment_requested_at, payment_completed_at')
      .eq('id', sessionId)
      .single();
    
    if (sessionError) {
      console.error('❌ Error fetching session:', sessionError);
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }
    
    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }
    
    // Get payment notification status
    const { data: notification, error: notificationError } = await supabaseServer
      .from('payment_notifications')
      .select('status, acknowledged_at, acknowledged_by, completed_at, completed_by')
      .eq('session_id', sessionId)
      .eq('notification_type', 'payment_request')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    // Determine status message and details
    let message = '';
    let details = '';
    
    switch (session.payment_status) {
      case 'pending':
        message = 'Payment request sent to staff';
        details = 'Waiting for staff to acknowledge and process your payment';
        break;
      case 'processing':
        message = 'Staff is processing your payment';
        details = 'A staff member is currently handling your payment request';
        break;
      case 'completed':
        message = 'Payment completed successfully';
        details = 'Your payment has been processed and confirmed';
        break;
      case 'failed':
        message = 'Payment failed';
        details = 'There was an issue processing your payment. Please try again.';
        break;
      case 'cancelled':
        message = 'Payment request cancelled';
        details = 'Your payment request has been cancelled';
        break;
      default:
        message = 'Payment status unknown';
        details = 'Unable to determine payment status';
    }
    
    // Add notification details if available
    if (notification) {
      if (notification.acknowledged_at) {
        details += ` (Acknowledged by ${notification.acknowledged_by || 'staff'})`;
      }
      if (notification.completed_at) {
        details += ` (Completed by ${notification.completed_by || 'staff'})`;
      }
    }
    
    console.log('✅ Payment status retrieved:', {
      sessionId,
      payment_status: session.payment_status,
      message
    });
    
    return NextResponse.json({
      success: true,
      session_id: sessionId,
      payment_status: session.payment_status,
      tip_amount: session.tip_amount,
      final_total: session.final_total,
      payment_requested_at: session.payment_requested_at,
      payment_completed_at: session.payment_completed_at,
      message,
      details,
      notification_status: notification?.status || null,
      acknowledged_at: notification?.acknowledged_at || null,
      completed_at: notification?.completed_at || null
    });
    
  } catch (error) {
    console.error('🔍 API: Payment status exception:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
};
