import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { handleError } from '@/lib/error-handling';
import { logDetailedError } from '@/lib/error-handling';
import { logManagerBillAdjustment } from '@/lib/audit-logging';

export const POST = async (request: NextRequest) => {
  try {
    const { sessionId, voids, discount } = await request.json();
    console.log('🔧 API: Manager bill adjustment:', { sessionId, voids, discount });

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    const hasVoids = voids && voids.length > 0;
    const hasDiscount = discount && discount.amount > 0;

    if (!hasVoids && !hasDiscount) {
      return NextResponse.json(
        { error: 'No adjustments specified' },
        { status: 400 }
      );
    }

    // 1. Validate session exists and is active
    const { data: session, error: sessionError } = await supabaseServer
      .from('sessions')
      .select('id, table_id, status, tables!sessions_table_id_fkey(table_number)')
      .eq('id', sessionId)
      .eq('status', 'active')
      .single();

    if (sessionError || !session) {
      logDetailedError('Session validation failed', sessionError);
      return NextResponse.json(
        { error: 'Active session not found' },
        { status: 404 }
      );
    }

    console.log('🔄 Starting manager bill adjustment...');

    // 2. Handle item voids
    if (hasVoids) {
      const { error: voidError } = await supabaseServer
        .from('orders')
        .update({ 
          status: 'voided',
          voided_at: new Date().toISOString(),
          void_reason: 'manager_override'
        })
        .in('id', voids);

      if (voidError) {
        logDetailedError('Failed to void items', voidError);
        return NextResponse.json(
          { error: 'Failed to void selected items' },
          { status: 500 }
        );
      }

      console.log('✅ Voided', voids.length, 'items');
    }

    // 3. Handle discount application
    if (hasDiscount) {
      // Create discount record
      const { error: discountError } = await supabaseServer
        .from('discounts')
        .insert({
          session_id: sessionId,
          type: discount.type,
          amount: discount.amount,
          applied_by: 'manager_override',
          reason: 'manager_override'
        });

      if (discountError) {
        logDetailedError('Failed to apply discount', discountError);
        return NextResponse.json(
          { error: 'Failed to apply discount' },
          { status: 500 }
        );
      }

      console.log('✅ Applied discount:', discount.type, discount.amount);
    }

    // 4. Create audit log entry
    try {
      await logManagerBillAdjustment(sessionId, {
        voids: hasVoids ? voids : undefined,
        discount: hasDiscount ? discount : undefined,
        table_number: session.tables?.table_number,
        original_total: session.orderTotal,
        new_total: session.orderTotal // This would be calculated based on voids/discounts
      }, request);
      console.log('✅ Audit log entry created');
    } catch (auditError) {
      console.warn('⚠️ Error creating audit log:', auditError);
      // Don't fail the operation for audit log errors
    }

    // 5. Create notification for the adjustment
    try {
      const { error: notificationError } = await supabaseServer
        .from('notifications')
        .insert({
          session_id: sessionId,
          type: 'bill_adjustment',
          title: 'Bill Adjusted',
          message: `Manager override: ${hasVoids ? `${voids.length} items voided` : ''}${hasVoids && hasDiscount ? ', ' : ''}${hasDiscount ? `${discount.type === 'fixed' ? 'P' : ''}${discount.amount}${discount.type === 'percentage' ? '%' : ''} discount applied` : ''}`,
          priority: 'high',
          status: 'pending',
          metadata: {
            voids: hasVoids ? voids : null,
            discount: hasDiscount ? discount : null,
            adjusted_by: 'manager_override'
          }
        });

      if (notificationError) {
        console.warn('⚠️ Failed to create adjustment notification:', notificationError);
        // Don't fail the operation for notification errors
      }
    } catch (notificationError) {
      console.warn('⚠️ Error creating adjustment notification:', notificationError);
      // Don't fail the operation for notification errors
    }

    console.log('✅ Manager bill adjustment completed successfully');

    return NextResponse.json({
      success: true,
      message: 'Bill adjustments saved successfully',
      adjustments: {
        voids: hasVoids ? voids : null,
        discount: hasDiscount ? discount : null,
        sessionId: sessionId,
        tableNumber: session.tables?.table_number
      }
    });

  } catch (error) {
    console.error('🔍 API: Manager adjust bill exception:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});
