import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { handleError } from '@/lib/error-handling';

export const POST = async (request: NextRequest) => {
  try {
    const body = await request.json();
    
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
    
    // Step 1: Get session details to verify it exists and get table info
    const { data: sessionData, error: sessionError } = await supabaseServer
      .from('sessions')
      .select('id, table_id, payment_status, final_total, status, payment_completed_at')
      .eq('id', sessionId)
      .single();
    
    if (sessionError) {
      return NextResponse.json(
        { error: `Session not found: ${sessionError.message}` },
        { status: 404 }
      );
    }
    
    if (!sessionData) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }
    
    // Step 2: Check if payment is already completed
    const isAlreadyCompleted = sessionData.payment_status === 'completed';
    
    if (isAlreadyCompleted && paymentType !== 'table') {
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
      return NextResponse.json(
        { error: `Payment is not pending (current status: ${sessionData.payment_status})` },
        { status: 400 }
      );
    }
    
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
        return NextResponse.json(
          { error: `Failed to update session: ${updateError.message}` },
          { status: 500 }
        );
      }
    } else {
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
      // Don't fail the payment completion if table clearing fails
    }
    
        // Step 5: For table payments, clear all orders and mark all diners as inactive
        if (paymentType === 'table') {
          
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
            }

            // Clear all orders for this session
            const { error: ordersError } = await supabaseServer
              .from('orders')
              .delete()
              .eq('session_id', sessionId);
            
            if (ordersError) {
            }
        
        // Get current session with diners to mark them all inactive
        const { data: sessionWithDiners, error: dinersError } = await supabaseServer
          .from('sessions')
          .select('diners')
          .eq('id', sessionId)
          .single();
        
        if (dinersError) {
        } else if (sessionWithDiners?.diners) {
          // Parse diners array (might be JSON string or object)
          let diners = sessionWithDiners.diners;
          if (typeof diners === 'string') {
            try {
              diners = JSON.parse(diners);
            } catch (parseError) {
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
        }
        
      } catch (cleanupError) {
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
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
};
