import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { handleError } from '@/lib/error-handling';

export const POST = async (request: NextRequest) => {
  try {
    console.log('🔧 API: Acknowledging payment notification');
    
    const body = await request.json();
    console.log('🔍 Acknowledge request body:', body);
    
    const { notificationId, acknowledgedBy } = body;
    
    // Validate required fields
    if (!notificationId) {
      return NextResponse.json(
        { error: 'Notification ID is required' },
        { status: 400 }
      );
    }
    
    if (!acknowledgedBy) {
      return NextResponse.json(
        { error: 'Acknowledged by is required' },
        { status: 400 }
      );
    }
    
    // First, check if the notification exists and its current status
    const { data: existingNotification, error: fetchError } = await supabaseServer
      .from('payment_notifications')
      .select('id, status')
      .eq('id', notificationId)
      .single();
    
    if (fetchError) {
      console.error('❌ Error fetching notification:', fetchError);
      return NextResponse.json(
        { error: 'Notification not found' },
        { status: 404 }
      );
    }
    
    if (!existingNotification) {
      return NextResponse.json(
        { error: 'Notification not found' },
        { status: 404 }
      );
    }
    
    // Check if notification is already processed
    if (existingNotification.status !== 'pending') {
      console.log('⚠️ Notification already processed with status:', existingNotification.status);
      return NextResponse.json({
        success: true,
        message: `Notification already ${existingNotification.status}`,
        notification: existingNotification
      });
    }
    
    // Update the payment notification
    const { data, error } = await supabaseServer
      .from('payment_notifications')
      .update({
        status: 'acknowledged',
        acknowledged_at: new Date().toISOString(),
        acknowledged_by: acknowledgedBy
      })
      .eq('id', notificationId)
      .eq('status', 'pending')
      .select()
      .single();
    
    if (error) {
      console.error('❌ Error acknowledging notification:', error);
      console.error('❌ Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      return NextResponse.json(
        { error: `Failed to acknowledge notification: ${error.message}` },
        { status: 500 }
      );
    }
    
    if (!data) {
      console.error('❌ No data returned - notification not found or already processed');
      return NextResponse.json(
        { error: 'Notification not found or already processed' },
        { status: 404 }
      );
    }
    
    console.log('✅ Payment notification acknowledged:', data.id);
    
    return NextResponse.json({
      success: true,
      message: 'Notification acknowledged successfully',
      notification: data
    });
    
  } catch (error) {
    console.error('🔍 API: Acknowledge notification exception:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
};
