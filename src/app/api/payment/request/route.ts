import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { handleError } from '@/lib/error-handling';

export const POST = async (request: NextRequest) => {
  try {
    console.log('🔧 API: Processing payment request');
    
    const body = await request.json();
    console.log('🔍 Payment request body:', body);
    
    const { sessionId, tipAmount, finalTotal, paymentType = 'individual', subtotal, vat } = body;
    
    // Validate required fields
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }
    
    if (tipAmount === undefined || tipAmount < 0) {
      return NextResponse.json(
        { error: 'Valid tip amount is required' },
        { status: 400 }
      );
    }
    
    if (!finalTotal || finalTotal <= 0) {
      return NextResponse.json(
        { error: 'Valid final total is required' },
        { status: 400 }
      );
    }
    
    // Call the database function to request payment
    console.log('🔍 Calling request_payment function with:', {
      sessionId,
      tipAmount: parseFloat(tipAmount.toString()),
      finalTotal: parseFloat(finalTotal.toString()),
      paymentType
    });
    
    const { data, error } = await supabaseServer.rpc('request_payment', {
      session_id_param: sessionId,
      tip_amount_param: parseFloat(tipAmount.toString()),
      payment_type_param: paymentType,
      passed_subtotal: paymentType === 'individual' && subtotal ? parseFloat(subtotal.toString()) : null,
      passed_vat: paymentType === 'individual' && vat ? parseFloat(vat.toString()) : null,
      passed_final_total: paymentType === 'individual' ? parseFloat(finalTotal.toString()) : null
    });
    
    if (error) {
      console.error('❌ Database function error:', error);
      return NextResponse.json(
        { error: `Payment request failed: ${error.message}` },
        { status: 500 }
      );
    }
    
    if (!data || !data.success) {
      console.error('❌ Payment request failed:', data);
      return NextResponse.json(
        { error: data?.error || 'Payment request failed' },
        { status: 500 }
      );
    }
    
    console.log('✅ Payment request successful:', data);
    
    // Create payment request notification
    try {
      const { error: notificationError } = await supabaseServer
        .from('notifications')
        .insert({
          session_id: sessionId,
          type: 'payment_request',
          title: 'Payment Request',
          message: `Table ${data.table_number} requests payment - P${data.final_total.toFixed(2)}`,
          priority: 'high',
          status: 'pending',
          metadata: {
            payment_type: paymentType,
            subtotal: data.subtotal,
            vat_amount: data.vat_amount,
            tip_amount: data.tip_amount,
            final_total: data.final_total
          }
        });

      if (notificationError) {
        console.error('⚠️ Failed to create payment request notification:', notificationError);
      } else {
        console.log('✅ Payment request notification created for table:', data.table_number);
      }
    } catch (notificationError) {
      console.error('⚠️ Error creating payment request notification:', notificationError);
      // Don't fail the main operation if notification creation fails
    }
    
    return NextResponse.json({
      success: true,
      message: 'Payment request submitted successfully',
      notification_id: data.notification_id,
      session_id: data.session_id,
      table_number: data.table_number,
      subtotal: data.subtotal,
      vat_amount: data.vat_amount,
      tip_amount: data.tip_amount,
      final_total: data.final_total,
      payment_requested_at: data.payment_requested_at
    });
    
  } catch (error) {
    console.error('🔍 API: Payment request exception:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
};
