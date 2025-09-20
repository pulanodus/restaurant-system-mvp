import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { handleError } from '@/lib/error-handling';

export const POST = async (request: NextRequest) => {
  try {
    const { sessionId, requestType, timestamp } = await request.json();

    if (!sessionId || !requestType) {
      return NextResponse.json(
        { error: 'Session ID and request type are required' },
        { status: 400 }
      );
    }

    if (!['bill', 'help'].includes(requestType)) {
      return NextResponse.json(
        { error: 'Request type must be either "bill" or "help"' },
        { status: 400 }
      );
    }

    console.log('🔔 Waiter request received:', { sessionId, requestType, timestamp });

    // For now, just return success without creating database records
    // This allows the UI to work while we set up the database properly
    console.log('✅ Waiter request processed successfully (simulated)');

    return NextResponse.json({
      success: true,
      message: `${requestType === 'bill' ? 'Bill request' : 'Help request'} sent successfully`,
      data: {
        id: `temp-${Date.now()}`,
        requestType,
        tableNumber: 'A1', // Default for testing
        customerName: 'Customer',
        timestamp: timestamp || new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('🔍 Waiter request exception:', error);
    return NextResponse.json(
      { error: 'Internal server error during waiter request' },
      { status: 500 }
    );
  }
};
