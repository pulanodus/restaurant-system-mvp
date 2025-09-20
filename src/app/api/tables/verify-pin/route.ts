import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { handleError } from '@/lib/error-handling';

export const POST = async (request: NextRequest) => {
  try {
    const { tableId, pin } = await request.json();
    
    if (!tableId || !pin) {
      return NextResponse.json(
        { error: 'Table ID and PIN are required' },
        { status: 400 }
      );
    }

    console.log('🔍 Verifying PIN for table:', { tableId, pin });

    // Find table by ID or table_number
    let table = null;
    let tableError = null;
    
    // First try to find by ID (UUID)
    const { data: tableById, error: errorById } = await supabaseServer
      .from('tables')
      .select('*')
      .eq('id', tableId)
      .eq('is_active', true)
      .single();

    if (errorById || !tableById) {
      // If not found by ID, try by table_number
      const { data: tableByNumber, error: errorByNumber } = await supabaseServer
        .from('tables')
        .select('*')
        .eq('table_number', tableId)
        .eq('is_active', true)
        .single();
      
      if (errorByNumber || !tableByNumber) {
        tableError = errorByNumber;
      } else {
        table = tableByNumber;
      }
    } else {
      table = tableById;
    }

    if (tableError || !table) {
      console.error('❌ Table not found:', tableError);
      return NextResponse.json(
        { error: 'Table not found or inactive' },
        { status: 404 }
      );
    }

    // Verify PIN
    if (pin !== table.current_pin) {
      console.log('❌ PIN verification failed:', { 
        provided: pin, 
        expected: table.current_pin,
        tableNumber: table.table_number 
      });
      return NextResponse.json(
        { error: 'Invalid PIN. Please check with your server.' },
        { status: 401 }
      );
    }

    // Check if there's an active session
    const { data: activeSession } = await supabaseServer
      .from('sessions')
      .select('id, started_by_name, status')
      .eq('table_id', table.id)
      .eq('status', 'active')
      .maybeSingle();

    console.log('✅ PIN verified successfully:', { 
      tableNumber: table.table_number,
      hasActiveSession: !!activeSession,
      sessionId: activeSession?.id
    });

    return NextResponse.json({
      success: true,
      table: {
        id: table.id,
        table_number: table.table_number,
        capacity: table.capacity
      },
      session: activeSession ? {
        id: activeSession.id,
        started_by_name: activeSession.started_by_name,
        status: activeSession.status
      } : null,
      message: activeSession 
        ? `PIN verified. You can join the existing session.`
        : `PIN verified. You can start a new session.`
    });

  } catch (error) {
    console.error('🔍 PIN verification exception:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
};
