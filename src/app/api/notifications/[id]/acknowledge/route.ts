import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { handleError } from '@/lib/error-handling';

export const POST = async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  try {
    const { id } = params;
    const body = await request.json();
    const { action = 'acknowledge', staff_member = 'Staff' } = body;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Notification ID is required' },
        { status: 400 }
      );
    }
    
    console.log('🔧 API: Acknowledging notification', { id, action, staff_member });
    
    // Update notification status
    const updateData: any = {
      updated_at: new Date().toISOString()
    };
    
    if (action === 'acknowledge') {
      updateData.status = 'acknowledged';
      updateData.acknowledged_at = new Date().toISOString();
      updateData.acknowledged_by = staff_member;
    } else if (action === 'resolve') {
      updateData.status = 'resolved';
      updateData.resolved_at = new Date().toISOString();
      updateData.resolved_by = staff_member;
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Must be "acknowledge" or "resolve"' },
        { status: 400 }
      );
    }
    
    const { data, error } = await supabaseServer
      .from('notifications')
      .update(updateData)
      .eq('id', id)
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
        { error: `Failed to update notification: ${error.message}` },
        { status: 500 }
      );
    }
    
    console.log('✅ Notification updated:', data);
    
    return NextResponse.json({
      success: true,
      notification: data,
      message: `Notification ${action}d successfully`
    });
    
  } catch (error) {
    console.error('🔍 API: Acknowledge notification exception:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
};
