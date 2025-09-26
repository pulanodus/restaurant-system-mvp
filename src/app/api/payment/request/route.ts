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
    
    // SUSTAINABLE SOLUTION: Handle payment request directly without database function
    console.log('🔧 PROCESSING PAYMENT REQUEST DIRECTLY:', {
      sessionId,
      tipAmount: parseFloat(tipAmount.toString()),
      finalTotal: parseFloat(finalTotal.toString()),
      paymentType,
      subtotal: subtotal ? parseFloat(subtotal.toString()) : null,
      vat: vat ? parseFloat(vat.toString()) : null
    });
    
    // Step 1: Get session details (simple query to avoid join issues)
    const { data: sessionData, error: sessionError } = await supabaseServer
      .from('sessions')
      .select('id, table_id, status, started_by_name')
      .eq('id', sessionId)
      .single();
    
    if (sessionError) {
      console.error('❌ Error fetching session:', sessionError);
      return NextResponse.json(
        { error: `Session not found: ${sessionError.message}` },
        { status: 404 }
      );
    }
    
    if (!sessionData) {
      console.error('❌ Session not found');
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }
    
    // Step 1b: Get table information separately
    const { data: tableData, error: tableError } = await supabaseServer
      .from('tables')
      .select('id, table_number, capacity')
      .eq('id', sessionData.table_id)
      .single();
    
    if (tableError) {
      console.error('❌ Error fetching table:', tableError);
      return NextResponse.json(
        { error: `Table not found: ${tableError.message}` },
        { status: 404 }
      );
    }
    
    const tableNumber = tableData?.table_number;
    const tipAmountFloat = parseFloat(tipAmount.toString());
    const finalTotalFloat = parseFloat(finalTotal.toString());
    const subtotalFloat = subtotal ? parseFloat(subtotal.toString()) : null;
    const vatFloat = vat ? parseFloat(vat.toString()) : null;
    
    console.log('🔍 Session and table details:', {
      sessionId: sessionData.id,
      tableNumber,
      tableId: sessionData.table_id,
      status: sessionData.status,
      startedBy: sessionData.started_by_name
    });
    
    // Step 2: Update session with payment details (only existing columns)
    const { error: updateError } = await supabaseServer
      .from('sessions')
      .update({
        payment_status: 'pending',
        final_total: finalTotalFloat,
        payment_requested_at: new Date().toISOString()
      })
      .eq('id', sessionId);
    
    if (updateError) {
      console.error('❌ Error updating session:', updateError);
      return NextResponse.json(
        { error: `Failed to update session: ${updateError.message}` },
        { status: 500 }
      );
    }
    
    console.log('✅ Session updated successfully with payment details');
    
    // Step 3: Create payment request notification using our calculated values
    let notificationId = null;
    try {
      const { data: notificationData, error: notificationError } = await supabaseServer
        .from('notifications')
        .insert({
          session_id: sessionId,
          type: 'payment_request',
          title: 'Payment Request',
          message: `Table ${tableNumber} requests payment - P${finalTotalFloat.toFixed(2)}`,
          priority: 'high',
          status: 'pending',
          metadata: {
            payment_type: paymentType,
            subtotal: subtotalFloat,
            vat_amount: vatFloat,
            tip_amount: tipAmountFloat,
            final_total: finalTotalFloat
          }
        })
        .select('id')
        .single();

      if (notificationError) {
        console.error('⚠️ Failed to create payment request notification:', notificationError);
      } else {
        notificationId = notificationData.id;
        console.log('✅ Payment request notification created for table:', tableNumber);
      }
    } catch (notificationError) {
      console.error('⚠️ Error creating payment request notification:', notificationError);
      // Don't fail the main operation if notification creation fails
    }
    
    // Step 4: Return success response with our calculated values
    return NextResponse.json({
      success: true,
      message: 'Payment request submitted successfully',
      notification_id: notificationId,
      session_id: sessionId,
      table_number: tableNumber,
      subtotal: subtotalFloat,
      vat_amount: vatFloat,
      tip_amount: tipAmountFloat,
      final_total: finalTotalFloat,
      payment_requested_at: new Date().toISOString(),
      payment_type: paymentType
    });
    
  } catch (error) {
    console.error('🔍 API: Payment request exception:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
};
