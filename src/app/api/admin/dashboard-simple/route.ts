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
