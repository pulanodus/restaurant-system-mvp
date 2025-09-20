import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { handleError } from '@/lib/error-handling';

export const POST = async (request: NextRequest) => {
  try {
    console.log('🔧 API: Processing customer help request');
    
    const body = await request.json();
    const { sessionId, helpType = 'general', message = 'Customer needs assistance' } = body;
    
    // Validate required fields
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }
    
    // Get session and table information
    const { data: sessionData, error: sessionError } = await supabaseServer
      .from('sessions')
      .select(`
        id,
        table_id,
        tables!inner(
          table_number
        )
      `)
      .eq('id', sessionId)
      .single();
    
    if (sessionError || !sessionData) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }
    
    // Create customer help notification
    const { data: notification, error: notificationError } = await supabaseServer
      .from('notifications')
      .insert({
        session_id: sessionId,
        type: 'customer_help',
        title: 'Customer Assistance',
        message: `Table ${sessionData.tables.table_number} customer needs help: ${message}`,
        priority: helpType === 'urgent' ? 'high' : 'medium',
        status: 'pending',
        metadata: {
          help_type: helpType,
          customer_message: message
        }
      })
      .select(`
        *,
        sessions!inner(
          id,
          table_id,
          tables!inner(
            table_number
          )
        )
      `)
      .single();
    
    if (notificationError) {
      console.error('❌ Database error:', notificationError);
      return NextResponse.json(
        { error: `Failed to create help request: ${notificationError.message}` },
        { status: 500 }
      );
    }
    
    console.log('✅ Customer help notification created:', notification);
    
    return NextResponse.json({
      success: true,
      notification: notification,
      message: 'Help request submitted successfully',
      table_number: sessionData.tables.table_number
    });
    
  } catch (error) {
    console.error('🔍 API: Customer help request exception:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
};
