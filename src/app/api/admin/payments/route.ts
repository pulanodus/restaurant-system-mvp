import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// GET /api/admin/payments - Get completed payments for admin dashboard
export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Missing required environment variables');
      return NextResponse.json({ 
        error: 'Missing required environment variables'
      }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      db: { schema: 'public' },
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Get sessions with completed payments (simple query to avoid join issues)
    const { data: sessions, error: sessionsError } = await supabase
      .from('sessions')
      .select(`
        id,
        table_id,
        status,
        payment_status,
        final_total,
        payment_completed_at,
        created_at,
        updated_at
      `)
      .eq('payment_status', 'completed')
      .order('payment_completed_at', { ascending: false })
      .limit(100);

    if (sessionsError) {
      console.error('❌ Error fetching sessions:', sessionsError);
      return NextResponse.json(
        { error: `Failed to fetch sessions: ${sessionsError.message}` },
        { status: 500 }
      );
    }

    // Get table numbers separately to avoid join issues
    const tableIds = [...new Set((sessions || []).map((s: any) => s.table_id))];
    let tableNumbers: Record<string, string> = {};
    
    if (tableIds.length > 0) {
      const { data: tables, error: tablesError } = await supabase
        .from('tables')
        .select('id, table_number')
        .in('id', tableIds);

      if (!tablesError && tables) {
        tableNumbers = tables.reduce((acc: Record<string, string>, table: any) => {
          acc[table.id] = table.table_number;
          return acc;
        }, {});
      }
    }

    // Transform sessions into payment records
    const payments = (sessions || []).map((session: any) => {
      const finalTotal = session.final_total || 0;
      const subtotal = finalTotal / 1.14; // Calculate subtotal from final total
      const vatAmount = finalTotal - subtotal;

      return {
        id: session.id,
        session_id: session.id,
        table_number: tableNumbers[session.table_id] || 'Unknown',
        subtotal: parseFloat(subtotal.toFixed(2)),
        vat_amount: parseFloat(vatAmount.toFixed(2)),
        tip_amount: 0, // We don't store tip separately in sessions
        final_total: finalTotal,
        payment_method: 'cash', // Default since we don't store this in sessions
        payment_type: 'table', // Most completed payments are table payments
        completed_by: 'Staff Member', // Default since we don't store this in sessions
        completed_at: session.payment_completed_at || session.updated_at,
        created_at: session.created_at
      };
    });

    return NextResponse.json({
      success: true,
      payments,
      count: payments.length
    });

  } catch (error) {
    console.error('❌ Admin payments API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
