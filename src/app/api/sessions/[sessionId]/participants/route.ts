import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    // Get session participants from the orders table
    // Each order represents a participant in the session
    const { data: orders, error } = await supabase
      .from('orders')
      .select('diner_name')
      .eq('session_id', sessionId)
      .not('diner_name', 'is', null);

    if (error) {
      console.error('Error fetching session participants:', error);
      return NextResponse.json({ error: 'Failed to fetch participants' }, { status: 500 });
    }

    // Extract unique participant names
    const participants = [...new Set(orders.map(order => order.diner_name))].filter(Boolean);

    console.log('Session participants:', participants);

    return NextResponse.json({ 
      participants,
      count: participants.length 
    });

  } catch (error) {
    console.error('Error in participants API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
