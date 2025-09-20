import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { withApiErrorHandling } from '@/lib/error-handling'wrappers';

export const GET = withApiErrorHandling(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const staffId = searchParams.get('staffId');
    const status = searchParams.get('status') || 'pending';
    const limit = parseInt(searchParams.get('limit') || '50');

    if (!staffId) {
      return NextResponse.json(
        { error: 'Staff ID is required' },
        { status: 400 }
      );
    }

    console.log('🔔 Fetching staff notifications:', { staffId, status, limit });

    // Verify staff exists
    const { data: staff, error: staffError } = await supabaseServer
      .from('staff')
      .select('*')
      .eq('id', staffId)
      .eq('is_active', true)
      .single();

    if (staffError || !staff) {
      console.error('❌ Staff not found:', staffError);
      return NextResponse.json(
        { error: 'Invalid staff ID or staff member is inactive' },
        { status: 404 }
      );
    }

    // Get staff notifications using the database function
    const { data: notifications, error: notificationsError } = await supabaseServer
      .rpc('get_staff_notifications', {
        p_staff_id: staffId
      });

    if (notificationsError) {
      console.error('❌ Failed to fetch staff notifications:', notificationsError);
      return NextResponse.json(
        { error: 'Failed to fetch notifications' },
        { status: 500 }
      );
    }

    // Filter by status and limit
    const filteredNotifications = notifications
      ?.filter(n => n.status === status)
      ?.slice(0, limit) || [];

    // Transform notifications to match expected format
    const transformedNotifications = filteredNotifications.map(notification => ({
      id: notification.notification_id,
      session_id: notification.session_id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      priority: notification.priority,
      status: notification.status,
      timestamp: notification.created_at,
      table_number: notification.table_number,
      is_assigned: notification.is_assigned,
      // Add metadata for waitstaff assignment
      metadata: {
        assigned_waitstaff: staff.name,
        is_my_table: notification.is_assigned
      }
    }));

    console.log('✅ Staff notifications fetched:', { 
      staffName: staff.name,
      totalNotifications: transformedNotifications.length,
      assignedNotifications: transformedNotifications.filter(n => n.is_assigned).length
    });

    return NextResponse.json({
      success: true,
      notifications: transformedNotifications,
      staff: {
        id: staff.id,
        staffId: staff.staff_id,
        name: staff.name,
        role: staff.role
      },
      summary: {
        total: transformedNotifications.length,
        assigned: transformedNotifications.filter(n => n.is_assigned).length,
        unassigned: transformedNotifications.filter(n => !n.is_assigned).length
      }
    });

  } catch (error) {
    console.error('🔍 Staff notifications exception:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}, 'STAFF_NOTIFICATIONS');
