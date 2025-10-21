import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { handleError } from '@/lib/error-handling';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const { diners } = await request.json();

    // Update the session with test diners (without updated_at field)
    const { data, error } = await supabaseServer
      .from('sessions')
      .update({ 
        diners: diners
      })
      .eq('id', sessionId)
      .select('*')
      .single();

    if (error) {
      console.error('❌ Error updating session diners:', error);
      return NextResponse.json(
        { error: 'Failed to update session diners' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      session: data,
      message: 'Test diners added successfully'
    });

  } catch (error) {
    const { sessionId } = await params;
    const appError = handleError(error, {
      operation: 'Add Test Diners',
      sessionId: sessionId
    });
    console.error('🔍 Add test diners error:', appError);
    return NextResponse.json(
      { error: appError.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
