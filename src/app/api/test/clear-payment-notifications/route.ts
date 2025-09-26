import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// POST /api/test/clear-payment-notifications - Clear all payment notifications for testing
export async function POST(request: NextRequest) {
  try {
    console.log('🧹 TEST - Clearing all payment notifications...');

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
    console.log('🧹 Clearing from notifications table...');
    const { error: notificationsError, count: notificationsCount } = await supabase
      .from('notifications')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')
      .select('*', { count: 'exact', head: true });

    if (notificationsError) {
      console.error('❌ Error clearing notifications:', notificationsError);
    } else {
      console.log(`✅ Cleared ${notificationsCount || 0} notifications from notifications table`);
    }

    // Check if there's a separate payment_notifications table
    console.log('🧹 Checking for payment_notifications table...');
    const { data: paymentNotifications, error: paymentNotificationsError } = await supabase
      .from('payment_notifications')
      .select('*')
      .limit(1);

    if (!paymentNotificationsError && paymentNotifications) {
      console.log('📋 Found payment_notifications table, clearing it...');
      const { error: clearPaymentError, count: paymentCount } = await supabase
        .from('payment_notifications')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000')
        .select('*', { count: 'exact', head: true });

      if (clearPaymentError) {
        console.error('❌ Error clearing payment_notifications:', clearPaymentError);
      } else {
        console.log(`✅ Cleared ${paymentCount || 0} payment notifications`);
      }
    } else {
      console.log('📋 No separate payment_notifications table found');
    }

    // Check what tables exist that might contain payment data
    console.log('🧹 Checking for other potential payment-related tables...');
    
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
      
      if (paymentTables.length > 0) {
        console.log('📋 Found potential payment-related tables:', paymentTables);
      }
    }

    console.log('✅ TEST - Payment notification cleanup completed');

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
