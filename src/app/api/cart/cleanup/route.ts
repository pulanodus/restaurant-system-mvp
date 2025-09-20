import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseUrl, getSupabaseServiceKey } from '@/lib/secure-env';

export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json();
    
    if (!sessionId) {
      return NextResponse.json({ 
        error: 'Session ID is required' 
      }, { status: 400 });
    }

    const supabaseUrl = getSupabaseUrl();
    const supabaseServiceKey = getSupabaseServiceKey();
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('🧹 Manual cleanup for session:', sessionId);

    // Only delete cart items (status 'placed'), preserve confirmed orders
    const { data: deletedOrders, error } = await supabase
      .from('orders')
      .delete()
      .eq('session_id', sessionId)
      .eq('status', 'placed')
      .select('id');

    if (error) {
      console.error('❌ Error in manual cleanup:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('✅ Manual cleanup completed successfully, deleted', deletedOrders?.length || 0, 'orders');

    return NextResponse.json({ 
      success: true,
      message: `Cleared ${deletedOrders?.length || 0} orders for this session`,
      deletedCount: deletedOrders?.length || 0
    });

  } catch (error) {
    console.error('❌ Error in manual cleanup API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
