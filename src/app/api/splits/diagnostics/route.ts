import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    
    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    // Get all split bills for this session
    const { data: splitBills, error: splitError } = await supabase
      .from('split_bills')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false });

    if (splitError) {
      console.error('Error fetching split bills:', splitError);
      return NextResponse.json({ error: 'Failed to fetch split bills' }, { status: 500 });
    }

    // Get all orders for this session
    const { data: orders, error: orderError } = await supabase
      .from('orders')
      .select(`
        id,
        menu_item_id,
        quantity,
        is_shared,
        split_bill_id,
        status,
        created_at,
        menu_items (
          name,
          price
        )
      `)
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false });

    if (orderError) {
      console.error('Error fetching orders:', orderError);
      return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
    }

    // Analyze the data
    const diagnostics = {
      sessionId,
      timestamp: new Date().toISOString(),
      splitBills: {
        total: splitBills?.length || 0,
        active: splitBills?.filter(sb => sb.status === 'active').length || 0,
        inactive: splitBills?.filter(sb => sb.status !== 'active').length || 0,
        details: splitBills?.map(sb => ({
          id: sb.id,
          menuItemId: sb.menu_item_id,
          originalPrice: sb.original_price,
          splitPrice: sb.split_price,
          splitCount: sb.split_count,
          participants: sb.participants,
          status: sb.status,
          createdAt: sb.created_at
        })) || []
      },
      orders: {
        total: orders?.length || 0,
        placed: orders?.filter(o => o.status === 'placed').length || 0,
        submitted: orders?.filter(o => o.status === 'submitted').length || 0,
        withSplitBills: orders?.filter(o => o.split_bill_id).length || 0,
        withoutSplitBills: orders?.filter(o => !o.split_bill_id).length || 0,
        details: orders?.map(o => ({
          id: o.id,
          menuItemId: o.menu_item_id,
          menuItemName: Array.isArray(o.menu_items) ? o.menu_items[0]?.name : (o.menu_items as any)?.name || 'Unknown',
          quantity: o.quantity,
          isShared: o.is_shared,
          splitBillId: o.split_bill_id,
          status: o.status,
          createdAt: o.created_at
        })) || []
      },
      analysis: {
        orphanedSplitBills: splitBills?.filter(sb => 
          sb.status === 'active' && 
          !orders?.some(o => o.split_bill_id === sb.id && o.status === 'placed')
        ).length || 0,
        ordersWithoutSplitBills: orders?.filter(o => 
          o.is_shared && o.status === 'placed' && !o.split_bill_id
        ).length || 0,
        potentialIssues: [] as string[]
      }
    };

    // Identify potential issues
    if (diagnostics.analysis.orphanedSplitBills > 0) {
      diagnostics.analysis.potentialIssues.push(
        `${diagnostics.analysis.orphanedSplitBills} orphaned split bills (active but no linked orders)`
      );
    }

    if (diagnostics.analysis.ordersWithoutSplitBills > 0) {
      diagnostics.analysis.potentialIssues.push(
        `${diagnostics.analysis.ordersWithoutSplitBills} shared orders without split bills`
      );
    }

    return NextResponse.json(diagnostics);

  } catch (error) {
    console.error('Diagnostics error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
