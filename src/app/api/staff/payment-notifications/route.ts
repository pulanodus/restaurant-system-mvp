import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { handleError } from '@/lib/error-handling';

export const GET = async (request: NextRequest) => {
  try {
    console.log('🔧 API: Fetching payment notifications for staff');
    
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const status = searchParams.get('status');
    
    // Call the database function to get payment notifications
    const { data, error } = await supabaseServer.rpc('get_payment_notifications', {
      limit_param: limit,
      status_filter: status
    });
    
    if (error) {
      console.error('❌ Database function error:', error);
      return NextResponse.json(
        { error: `Failed to fetch notifications: ${error.message}` },
        { status: 500 }
      );
    }
    
    console.log('✅ Payment notifications fetched:', data?.length || 0);
    
    return NextResponse.json({
      success: true,
      notifications: data || [],
      count: data?.length || 0
    });
    
  } catch (error) {
    console.error('🔍 API: Payment notifications exception:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
};
