import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { handleError } from '@/lib/error-handling';

export const POST = async (request: NextRequest) => {
  try {
    console.log('🔧 API: Completing payment');
    
    const body = await request.json();
    console.log('🔍 Complete payment request body:', body);
    
    const { sessionId, paymentMethod, completedBy, paymentType = 'table', dinerName, paymentAmount } = body;
    
    // Validate required fields
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }
    
    if (!paymentMethod) {
      return NextResponse.json(
        { error: 'Payment method is required' },
        { status: 400 }
      );
    }
    
    if (!completedBy) {
      return NextResponse.json(
        { error: 'Completed by is required' },
        { status: 400 }
      );
    }
    
    // Validate payment method
    const validPaymentMethods = ['cash', 'card', 'qr_code', 'digital'];
    if (!validPaymentMethods.includes(paymentMethod)) {
      return NextResponse.json(
        { error: 'Invalid payment method' },
        { status: 400 }
      );
    }
    
    // Call the database function to complete payment
    console.log('🔍 Calling complete_payment function with:', {
      sessionId,
      paymentMethod,
      completedBy,
      paymentType,
      dinerName,
      paymentAmount
    });
    
    const { data, error } = await supabaseServer.rpc('complete_payment', {
      session_id_param: sessionId,
      payment_method_param: paymentMethod,
      completed_by_param: completedBy,
      payment_type_param: paymentType,
      diner_name_param: dinerName,
      payment_amount_param: paymentAmount
    });
    
    console.log('🔍 Database function response:', { data, error });
    
    if (error) {
      console.error('❌ Database function error:', error);
      return NextResponse.json(
        { error: `Payment completion failed: ${error.message}` },
        { status: 500 }
      );
    }
    
    if (!data || !data.success) {
      console.error('❌ Payment completion failed:', data);
      return NextResponse.json(
        { error: data?.error || 'Payment completion failed' },
        { status: 500 }
      );
    }
    
    console.log('✅ Payment completed successfully:', data);
    
    return NextResponse.json({
      success: true,
      message: 'Payment completed successfully',
      session_id: data.session_id,
      payment_method: data.payment_method,
      final_total: data.final_total,
      payment_completed_at: data.payment_completed_at
    });
    
  } catch (error) {
    console.error('🔍 API: Complete payment exception:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
};
