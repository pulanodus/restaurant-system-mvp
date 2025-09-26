import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { handleError } from '@/lib/error-handling';
import { logDetailedError } from '@/lib/error-handling';
import { logTableTransfer } from '@/lib/audit-logging';

export const POST = async (request: NextRequest) => {
  try {
    const { sourceTableId, destinationTableId, sessionId } = await request.json();
    console.log('🔧 API: Transferring table:', { sourceTableId, destinationTableId, sessionId });

    if (!sourceTableId || !destinationTableId || !sessionId) {
      return NextResponse.json(
        { error: 'Source table ID, destination table ID, and session ID are required' },
        { status: 400 }
      );
    }

    // 1. Validate source table and session
    const { data: sourceTable, error: sourceTableError } = await supabaseServer
      .from('tables')
      .select('id, table_number, occupied')
      .eq('id', sourceTableId)
      .single();

    if (sourceTableError || !sourceTable) {
      logDetailedError('Source table validation failed', sourceTableError);
      return NextResponse.json(
        { error: 'Source table not found' },
        { status: 404 }
      );
    }

    if (!sourceTable.occupied) {
      return NextResponse.json(
        { error: 'Source table is not occupied' },
        { status: 400 }
      );
    }

    // 2. Validate destination table
    const { data: destinationTable, error: destTableError } = await supabaseServer
      .from('tables')
      .select('id, table_number, occupied')
      .eq('id', destinationTableId)
      .single();

    if (destTableError || !destinationTable) {
      logDetailedError('Destination table validation failed', destTableError);
      return NextResponse.json(
        { error: 'Destination table not found' },
        { status: 404 }
      );
    }

    if (destinationTable.occupied) {
      return NextResponse.json(
        { error: 'Destination table is already occupied' },
        { status: 400 }
      );
    }

    // 3. Validate session
    const { data: session, error: sessionError } = await supabaseServer
      .from('sessions')
      .select('id, table_id, status, served_by')
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

    if (session.table_id !== sourceTableId) {
      return NextResponse.json(
        { error: 'Session does not belong to source table' },
        { status: 400 }
      );
    }

    // 4. Start transaction-like operations
    console.log('🔄 Starting table transfer transaction...');

    // 4a. Update session to point to new table
    const { data: updatedSession, error: sessionUpdateError } = await supabaseServer
      .from('sessions')
      .update({ table_id: destinationTableId })
      .eq('id', sessionId)
      .select('id, table_id, served_by')
      .single();

    if (sessionUpdateError || !updatedSession) {
      logDetailedError('Session update failed during transfer', sessionUpdateError);
      return NextResponse.json(
        { error: 'Failed to update session' },
        { status: 500 }
      );
    }

    // 4b. Update source table to available
    const { error: sourceTableUpdateError } = await supabaseServer
      .from('tables')
      .update({ 
        occupied: false, 
        current_pin: null,
        current_session_id: null 
      })
      .eq('id', sourceTableId);

    if (sourceTableUpdateError) {
      logDetailedError('Source table update failed during transfer', sourceTableUpdateError);
      // Try to rollback session update
      await supabaseServer
        .from('sessions')
        .update({ table_id: sourceTableId })
        .eq('id', sessionId);
      return NextResponse.json(
        { error: 'Failed to update source table' },
        { status: 500 }
      );
    }

    // 4c. Update destination table to occupied
    const { error: destTableUpdateError } = await supabaseServer
      .from('tables')
      .update({ 
        occupied: true,
        current_session_id: sessionId,
        current_pin: (sourceTable as any).current_pin // Transfer the PIN
      })
      .eq('id', destinationTableId);

    if (destTableUpdateError) {
      logDetailedError('Destination table update failed during transfer', destTableUpdateError);
      // Try to rollback previous changes
      await supabaseServer
        .from('sessions')
        .update({ table_id: sourceTableId })
        .eq('id', sessionId);
      await supabaseServer
        .from('tables')
        .update({ 
          occupied: true, 
          current_pin: (sourceTable as any).current_pin,
          current_session_id: sessionId 
        })
        .eq('id', sourceTableId);
      return NextResponse.json(
        { error: 'Failed to update destination table' },
        { status: 500 }
      );
    }

    // 5. Create audit log entry
    try {
      await logTableTransfer(sessionId, {
        source_table: sourceTable.table_number,
        destination_table: destinationTable.table_number,
        transferred_by: session.served_by
      }, request);
      console.log('✅ Transfer audit log created');
    } catch (auditError) {
      console.warn('⚠️ Error creating transfer audit log:', auditError);
      // Don't fail the transfer for audit log errors
    }

    // 6. Create transfer notification
    try {
      const { error: notificationError } = await supabaseServer
        .from('notifications')
        .insert({
          session_id: sessionId,
          type: 'table_transfer',
          title: 'Table Transferred',
          message: `Session moved from Table ${sourceTable.table_number} to Table ${destinationTable.table_number}. Customers must scan QR code at new table.`,
          priority: 'medium',
          status: 'pending',
          metadata: {
            source_table: sourceTable.table_number,
            destination_table: destinationTable.table_number,
            transferred_by: session.served_by
          }
        });

      if (notificationError) {
        console.warn('⚠️ Failed to create transfer notification:', notificationError);
        // Don't fail the transfer for notification errors
      }
    } catch (notificationError) {
      console.warn('⚠️ Error creating transfer notification:', notificationError);
      // Don't fail the transfer for notification errors
    }

    console.log('✅ Table transfer completed successfully:', {
      from: sourceTable.table_number,
      to: destinationTable.table_number,
      sessionId: sessionId
    });

    return NextResponse.json({
      success: true,
      message: `Table successfully transferred from ${sourceTable.table_number} to ${destinationTable.table_number}`,
      transfer: {
        sourceTable: {
          id: sourceTable.id,
          table_number: sourceTable.table_number,
          status: 'available'
        },
        destinationTable: {
          id: destinationTable.id,
          table_number: destinationTable.table_number,
          status: 'occupied'
        },
        session: updatedSession
      }
    });

  } catch (error) {
    console.error('🔍 API: Transfer table exception:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
};
