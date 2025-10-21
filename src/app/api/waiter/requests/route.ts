import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { handleError } from '@/lib/error-handling';

export const GET = async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'pending';
    const limit = parseInt(searchParams.get('limit') || '50');

    // Fetch waiter requests
    const { data: requests, error: fetchError } = await supabaseServer
      .from('waiter_requests')
      .select(`
        id,
        session_id,
        request_type,
        table_number,
        customer_name,
        status,
        created_at,
        acknowledged_at,
        completed_at,
        acknowledged_by,
        notes
      `)
      .eq('status', status)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (fetchError) {
      console.error('❌ Failed to fetch waiter requests:', fetchError);
      
      // If table doesn't exist, return empty array
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({
          success: true,
          data: [],
          message: 'No waiter requests found'
        });
      }
      
      return NextResponse.json(
        { error: 'Failed to fetch waiter requests' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: requests || [],
      count: requests?.length || 0
    });

  } catch (error) {
    const appError = handleError(error, {
      operation: 'Fetch Waiter Requests'
    });
    console.error('🔍 Fetch waiter requests exception:', appError);
    return NextResponse.json(
      { error: appError.message || 'Internal server error during waiter requests fetch' },
      { status: 500 }
    );
  }
};

export const PATCH = async (request: NextRequest) => {
  try {
    const { id, status, acknowledgedBy, notes } = await request.json();

    if (!id || !status) {
      return NextResponse.json(
        { error: 'Request ID and status are required' },
        { status: 400 }
      );
    }

    if (!['pending', 'acknowledged', 'completed'].includes(status)) {
      return NextResponse.json(
        { error: 'Status must be pending, acknowledged, or completed' },
        { status: 400 }
      );
    }

    // Prepare update data
    const updateData: any = { status };
    
    if (status === 'acknowledged') {
      updateData.acknowledged_at = new Date().toISOString();
      updateData.acknowledged_by = acknowledgedBy;
    } else if (status === 'completed') {
      updateData.completed_at = new Date().toISOString();
      if (acknowledgedBy) updateData.acknowledged_by = acknowledgedBy;
    }
    
    if (notes) updateData.notes = notes;

    // Update waiter request
    const { data: updatedRequest, error: updateError } = await supabaseServer
      .from('waiter_requests')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Failed to update waiter request:', updateError);
      return NextResponse.json(
        { error: 'Failed to update waiter request' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Waiter request updated successfully',
      data: updatedRequest
    });

  } catch (error) {
    const appError = handleError(error, {
      operation: 'Update Waiter Request'
    });
    console.error('🔍 Update waiter request exception:', appError);
    return NextResponse.json(
      { error: appError.message || 'Internal server error during waiter request update' },
      { status: 500 }
    );
  }
};
