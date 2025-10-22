import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

// Simple dashboard API without authentication for testing
export async function GET(request: NextRequest) {
  try {
    const period = request.nextUrl.searchParams.get('period') || 'today';
    
    // Validate period parameter
    const validPeriods = ['today', 'week', 'month'];
    if (!validPeriods.includes(period)) {
      return NextResponse.json(
        { error: 'Invalid period parameter' },
        { status: 400 }
      );
    }
    
    // Fetch dashboard data (simplified version)
    const dashboardData = await fetchDashboardData(period);
    
    return NextResponse.json(dashboardData);
    
  } catch (error) {
    console.error('❌ Simple Dashboard API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Function to fetch dashboard data based on period
async function fetchDashboardData(period: string) {
  try {
    // Calculate date range based on period
    const now = new Date();
    let startDate = new Date();
    
    switch (period) {
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'today':
      default:
        startDate.setHours(0, 0, 0, 0);
        break;
    }
    
    const startDateString = startDate.toISOString();
    
    // Fetch tables data
    const { data: tablesData, error: tablesError } = await supabaseServer
      .from('tables')
      .select(`
        id,
        table_number,
        capacity,
        occupied,
        current_session_id,
        sessions!sessions_table_id_fkey (
          id,
          status,
          started_by_name,
          diners,
          orders (
            id,
            quantity,
            menu_items!inner (
              price
            )
          )
        )
      `)
      .eq('is_active', true)
      .order('table_number');

    if (tablesError) {
      throw new Error(`Error fetching tables: ${tablesError.message}`);
    }

    // Process tables data
    const processedTables = tablesData?.map(table => {
      const session = Array.isArray(table.sessions) ? table.sessions[0] : table.sessions;
      const orders = session?.orders || [];
      
      // Calculate order value
      const orderValue = orders.reduce((sum: number, order: any) => {
        const menuItem = Array.isArray(order.menu_items) ? order.menu_items[0] : order.menu_items;
        return sum + (menuItem?.price || 0) * order.quantity;
      }, 0);

      // Count diners
      const diners = session?.diners ? 
        (Array.isArray(session.diners) ? session.diners.length : 1) : 0;

      let status: 'available' | 'occupied' | 'payment_pending' = 'available';
      if (table.occupied && session?.status === 'active') {
        status = 'occupied';
      } else if (table.occupied && session?.status === 'payment_pending') {
        status = 'payment_pending';
      }

      return {
        id: table.id,
        tableNumber: table.table_number,
        status,
        orderValue,
        diners,
        sessionId: session?.id
      };
    }) || [];

    // Calculate metrics
    const todaysSales = processedTables.reduce((sum, table) => sum + (table.orderValue || 0), 0);
    const currentCovers = processedTables.reduce((sum, table) => sum + (table.diners || 0), 0);
    const activeSessions = processedTables.filter(table => table.status === 'occupied').length;
    const totalTables = processedTables.length;
    const paymentPendingTables = processedTables.filter(table => table.status === 'payment_pending').length;

    // Fetch sales data based on period
    const { data: ordersData, error: ordersError } = await supabaseServer
      .from('orders')
      .select(`
        id,
        quantity,
        menu_items!inner (
          price
        ),
        created_at
      `)
      .eq('status', 'completed')
      .gte('created_at', startDateString);

    if (ordersError) {
      throw new Error(`Error fetching orders: ${ordersError.message}`);
    }

    const totalSales = ordersData?.reduce((sum, order) => {
      const menuItem = Array.isArray(order.menu_items) ? order.menu_items[0] : order.menu_items;
      return sum + (menuItem?.price || 0) * order.quantity;
    }, 0) || 0;

    // Return dashboard data
    return {
      tables: processedTables,
      metrics: {
        todaysSales: totalSales,
        customersServed: currentCovers,
        currentCovers,
        averageRating: 4.2,
        activeSessions,
        totalTables,
        paymentPendingTables
      },
      period,
      lastUpdated: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('Error in fetchDashboardData:', error);
    throw error;
  }
}
