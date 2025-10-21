import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { handleError } from '@/lib/error-handling';

export const GET = async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const status = searchParams.get('status') || 'pending';
    
    // Get all notifications from the notifications table
    const { data, error } = await supabaseServer
      .from('notifications')
      .select(`
        *,
        sessions!notifications_session_id_fkey(
          id,
          table_id,
          tables!sessions_table_id_fkey(
            table_number
          )
        )
      `)
      .eq('status', status)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) {
      console.error('❌ Database error:', error);
      return NextResponse.json(
        { error: `Failed to fetch notifications: ${error.message}` },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      notifications: data || [],
      count: data?.length || 0
    });
    
  } catch (error) {
    console.error('🔍 API: Notifications exception:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
};

export const POST = async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { 
      session_id, 
      type, 
      title, 
      message, 
      priority = 'medium',
      metadata = {} 
    } = body;
    
    // Validate required fields
    if (!session_id || !type || !title || !message) {
      return NextResponse.json(
        { error: 'Missing required fields: session_id, type, title, message' },
        { status: 400 }
      );
    }
    
    // Validate notification type
    if (!['kitchen_ready', 'payment_request', 'customer_help'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid notification type. Must be: kitchen_ready, payment_request, or customer_help' },
        { status: 400 }
      );
    }
    
    // Create the notification
    const { data, error } = await supabaseServer
      .from('notifications')
      .insert({
        session_id,
        type,
        title,
        message,
        priority,
        status: 'pending',
        metadata
      })
      .select(`
        *,
        sessions!notifications_session_id_fkey(
          id,
          table_id,
          tables!sessions_table_id_fkey(
            table_number
          )
        )
      `)
      .single();
    
    if (error) {
      console.error('❌ Database error:', error);
      return NextResponse.json(
        { error: `Failed to create notification: ${error.message}` },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      notification: data,
      message: 'Notification created successfully'
    });
    
  } catch (error) {
    console.error('🔍 API: Create notification exception:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
};
