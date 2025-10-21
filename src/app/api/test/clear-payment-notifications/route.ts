import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// POST /api/test/clear-payment-notifications - Clear all payment notifications for testing
export async function POST(request: NextRequest) {
  try {

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ TEST - Missing required environment variables');
      return NextResponse.json({ 
        error: 'Missing required environment variables'
      }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      db: { schema: 'public' },
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Try to clear from notifications table
    const { error: notificationsError, count: notificationsCount } = await supabase
      .from('notifications')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')
      .select('*');

    if (notificationsError) {
      console.error('❌ Error clearing notifications:', notificationsError);
    }

    // Check if there's a separate payment_notifications table
    const { data: paymentNotifications, error: paymentNotificationsError } = await supabase
      .from('payment_notifications')
      .select('*')
      .limit(1);

    if (!paymentNotificationsError && paymentNotifications) {
      const { error: clearPaymentError, count: paymentCount } = await supabase
        .from('payment_notifications')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000')
         .select('*');

      if (clearPaymentError) {
        console.error('❌ Error clearing payment_notifications:', clearPaymentError);
      }
    }

    // Check what tables exist that might contain payment data
    
    // Try to find any table with 'payment' in the name
    const { data: tables, error: tablesError } = await supabase
      .rpc('get_table_names')
      .select('*')
      .limit(100);

    if (!tablesError && tables) {
      const paymentTables = tables.filter((table: any) => 
        table.table_name?.toLowerCase().includes('payment') ||
        table.table_name?.toLowerCase().includes('notification')
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Payment notification cleanup completed',
      data: {
        notifications_cleared: notificationsCount || 0,
        cleanup_time: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ TEST - Payment notification cleanup error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
