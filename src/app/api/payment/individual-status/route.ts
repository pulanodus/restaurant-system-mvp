import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { handleError } from '@/lib/error-handling';

export const GET = async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }
    
    // Call the database function to get individual payment status
    
    const { data, error } = await supabaseServer.rpc('get_individual_payment_status', {
      session_id_param: sessionId
    });
    
    if (error) {
      console.error('❌ Database function error:', error);
      return NextResponse.json(
        { error: `Failed to get individual payment status: ${error.message}` },
        { status: 500 }
      );
    }
    
    if (!data) {
      return NextResponse.json(
        { error: 'No payment status data found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Individual payment status retrieved successfully',
      session_id: sessionId,
      total_diners: data.total_diners,
      paid_diners: data.paid_diners,
      remaining_diners: data.remaining_diners,
      all_paid: data.all_paid,
      individual_payments: data.individual_payments
    });
    
  } catch (error) {
    console.error('🔍 API: Individual payment status exception:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
};
