import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { withApiErrorHandling } from '@/lib/error-handling'wrappers';

export const POST = withApiErrorHandling(async (request: NextRequest) => {
  try {
    console.log('🔧 API: Fixing database schema issues');

    // 1. Test sessions table access with served_by column
    console.log('🔍 Testing sessions table structure...');
    
    let hasServedBy = false;
    try {
      const { data: testSessions, error: testError } = await supabaseServer
        .from('sessions')
        .select('id, table_id, status, served_by')
        .limit(1);
      
      if (testError) {
        console.log('⚠️ served_by column test failed:', testError.message);
        hasServedBy = false;
      } else {
        console.log('✅ served_by column exists and accessible');
        hasServedBy = true;
      }
    } catch (error) {
      console.log('⚠️ served_by column test exception:', error);
      hasServedBy = false;
    }

    // 3. Check if sessions table has the required structure
    const { data: sessions, error: sessionsError } = await supabaseServer
      .from('sessions')
      .select('id, table_id, status, served_by')
      .eq('status', 'active')
      .limit(1);

    if (sessionsError) {
      console.error('❌ Error checking sessions:', sessionsError);
      return NextResponse.json(
        { error: `Sessions table issue: ${sessionsError.message}` },
        { status: 500 }
      );
    }

    console.log('✅ Sessions table accessible:', sessions?.length || 0, 'active sessions');

    // 4. Check orders table
    const { data: orders, error: ordersError } = await supabaseServer
      .from('orders')
      .select('id, session_id, status')
      .limit(1);

    if (ordersError) {
      console.error('❌ Error checking orders:', ordersError);
      return NextResponse.json(
        { error: `Orders table issue: ${ordersError.message}` },
        { status: 500 }
      );
    }

    console.log('✅ Orders table accessible:', orders?.length || 0, 'orders');

    // 5. Check if discounts table exists
    const { data: discounts, error: discountsError } = await supabaseServer
      .from('discounts')
      .select('id')
      .limit(1);

    if (discountsError) {
      console.log('⚠️ Discounts table missing or inaccessible:', discountsError.message);
    } else {
      console.log('✅ Discounts table accessible');
    }

    return NextResponse.json({
      success: true,
      message: 'Database schema check completed',
      issues: {
        sessionsTable: !hasServedBy ? 'Missing served_by column' : null,
        discountsTable: discountsError ? 'Missing or inaccessible' : null,
      },
      recommendations: [
        !hasServedBy ? 'Add served_by column to sessions table' : null,
        discountsError ? 'Create discounts table for bill adjustments' : null,
      ].filter(Boolean)
    });

  } catch (error) {
    console.error('🔍 API: Database fix exception:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});
