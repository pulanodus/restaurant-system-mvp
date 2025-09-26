import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ splitId: string }> }
) {
  try {
    const { splitId } = await params;

    // Get split bill details
    const { data, error } = await supabase
      .from('split_bills')
      .select('*')
      .eq('id', splitId)
      .single();

    if (error) {
      console.error('Error fetching split bill:', error);
      return NextResponse.json({ error: 'Split bill not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      splitBill: data 
    });

  } catch (error) {
    console.error('Split bill fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ splitId: string }> }
) {
  try {
    const { splitId } = await params;
    const { participants, status } = await request.json();

    // Update split bill
    const { data, error } = await supabase
      .from('split_bills')
      .update({
        participants: participants,
        status: status,
        updated_at: new Date().toISOString()
      })
      .eq('id', splitId)
      .select()
      .single();

    if (error) {
      console.error('Error updating split bill:', error);
      return NextResponse.json({ error: 'Failed to update split bill' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      splitBill: data,
      message: 'Split bill updated successfully' 
    });

  } catch (error) {
    console.error('Split bill update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
