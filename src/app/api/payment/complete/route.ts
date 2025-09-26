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
    
    // SUSTAINABLE SOLUTION: Handle payment completion directly without database function
    console.log('🔧 PROCESSING PAYMENT COMPLETION DIRECTLY:', {
      sessionId,
      paymentMethod,
      completedBy,
      paymentType,
      dinerName,
      paymentAmount
    });
    
    // Step 1: Get session details to verify it exists and get table info
    const { data: sessionData, error: sessionError } = await supabaseServer
      .from('sessions')
      .select('id, table_id, payment_status, final_total, status, payment_completed_at')
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
    
    // Step 2: Check if payment is already completed
    const isAlreadyCompleted = sessionData.payment_status === 'completed';
    
    if (isAlreadyCompleted && paymentType !== 'table') {
      console.log('✅ Payment already completed, returning success');
      return NextResponse.json({
        success: true,
        message: 'Payment was already completed',
        session_id: sessionId,
        payment_method: 'already_completed',
        final_total: sessionData.final_total,
        payment_completed_at: (sessionData as any).payment_completed_at || new Date().toISOString(),
        completed_by: 'system',
        payment_type: paymentType,
        already_completed: true
      });
    }
    
    if (!isAlreadyCompleted && sessionData.payment_status !== 'pending') {
      console.error('❌ Payment not in pending status:', sessionData.payment_status);
      return NextResponse.json(
        { error: `Payment is not pending (current status: ${sessionData.payment_status})` },
        { status: 400 }
      );
    }
    
    console.log('🔍 Session details:', {
      sessionId: sessionData.id,
      tableId: sessionData.table_id,
      currentStatus: sessionData.status,
      paymentStatus: sessionData.payment_status,
      finalTotal: sessionData.final_total
    });
    
    // Step 3: Update session to completed status (only if not already completed)
    if (!isAlreadyCompleted) {
      const { error: updateError } = await supabaseServer
        .from('sessions')
        .update({
          payment_status: 'completed',
          payment_completed_at: new Date().toISOString(),
          status: 'completed' // Mark session as completed
        })
        .eq('id', sessionId);
      
      if (updateError) {
        console.error('❌ Error updating session:', updateError);
        return NextResponse.json(
          { error: `Failed to update session: ${updateError.message}` },
          { status: 500 }
        );
      }
      
      console.log('✅ Session updated to completed status');
    } else {
      console.log('✅ Session already completed, skipping status update');
    }
    
    // Step 4: Clear the table (mark as available)
    const { error: tableError } = await supabaseServer
      .from('tables')
      .update({
        occupied: false,
        current_session_id: null,
        current_pin: null
      })
      .eq('id', sessionData.table_id);
    
    if (tableError) {
      console.error('⚠️ Warning: Failed to clear table:', tableError);
      // Don't fail the payment completion if table clearing fails
    } else {
      console.log('✅ Table cleared successfully');
    }
    
    console.log('✅ Payment completed successfully');
    
        // Step 5: For table payments, clear all orders and mark all diners as inactive
        if (paymentType === 'table') {
          console.log('🧹 TABLE PAYMENT: Clearing all orders and marking diners inactive');
          
          try {
            // First, update payment notification status to completed
            const { error: notificationUpdateError } = await supabaseServer
              .from('notifications')
              .update({
                status: 'completed',
                completed_at: new Date().toISOString(),
                completed_by: completedBy
              })
              .eq('session_id', sessionId)
              .eq('type', 'payment_request');
            
            if (notificationUpdateError) {
              console.error('⚠️ Warning: Failed to update payment notification:', notificationUpdateError);
            } else {
              console.log('✅ Payment notification marked as completed');
            }

            // Clear all orders for this session
            const { error: ordersError } = await supabaseServer
              .from('orders')
              .delete()
              .eq('session_id', sessionId);
            
            if (ordersError) {
              console.error('⚠️ Warning: Failed to clear orders:', ordersError);
            } else {
              console.log('✅ All orders cleared for session');
            }
        
        // Get current session with diners to mark them all inactive
        const { data: sessionWithDiners, error: dinersError } = await supabaseServer
          .from('sessions')
          .select('diners')
          .eq('id', sessionId)
          .single();
        
        if (dinersError) {
          console.error('⚠️ Warning: Failed to fetch diners:', dinersError);
        } else if (sessionWithDiners?.diners) {
          // Parse diners array (might be JSON string or object)
          let diners = sessionWithDiners.diners;
          if (typeof diners === 'string') {
            try {
              diners = JSON.parse(diners);
            } catch (parseError) {
              console.error('⚠️ Warning: Failed to parse diners JSON:', parseError);
            }
          }
          
          if (Array.isArray(diners)) {
            // Mark all diners as inactive
            const updatedDiners = diners.map((diner: any) => ({
              ...diner,
              isActive: false,
              logoutTime: new Date().toISOString()
            }));
            
            // Update session with inactive diners
            const { error: updateDinersError } = await supabaseServer
              .from('sessions')
              .update({
                diners: updatedDiners
              })
              .eq('id', sessionId);
            
            if (updateDinersError) {
              console.error('⚠️ Warning: Failed to update diners status:', updateDinersError);
            } else {
              console.log('✅ All diners marked as inactive');
            }
          }
        }
        
        // Create a notification to redirect all diners to receipt page
        const { data: notificationData, error: notificationError } = await supabaseServer
          .from('notifications')
          .insert({
            session_id: sessionId,
            type: 'payment_complete',
            title: 'Payment Complete',
            message: 'Table payment completed. Redirecting to receipt...',
            priority: 'high',
            status: 'pending',
            metadata: {
              action: 'redirect_to_receipt',
              redirect_url: `/payment-receipt?sessionId=${sessionId}`,
              payment_type: 'table'
            }
          })
          .select('id')
          .single();

        if (notificationError) {
          console.error('⚠️ Warning: Failed to create redirect notification:', notificationError);
        } else {
          console.log('✅ Redirect notification created for all diners');
        }
        
      } catch (cleanupError) {
        console.error('⚠️ Warning: Error during table payment cleanup:', cleanupError);
        // Don't fail the payment completion if cleanup fails
      }
    }
    
    // Step 6: Return success response with our calculated values
    return NextResponse.json({
      success: true,
      message: 'Payment completed successfully',
      session_id: sessionId,
      payment_method: paymentMethod,
      final_total: sessionData.final_total,
      payment_completed_at: new Date().toISOString(),
      completed_by: completedBy,
      payment_type: paymentType,
      table_cleared: paymentType === 'table'
    });
    
  } catch (error) {
    console.error('🔍 API: Complete payment exception:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
};
