import { NextRequest, NextResponse } from 'next/server';
import { getErrorAnalytics, getErrorSummary } from '@/lib/error-handling';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get('restaurantId');
    const timeRange = searchParams.get('timeRange');
    
    let analytics;
    
    if (timeRange === 'summary') {
      // Get summary data
      analytics = getErrorSummary(restaurantId || undefined);
    } else {
      // Get detailed analytics
      const startDate = searchParams.get('startDate');
      const endDate = searchParams.get('endDate');
      
      let timeFilter;
      if (startDate && endDate) {
        timeFilter = {
          start: new Date(startDate),
          end: new Date(endDate)
        };
      }
      
      analytics = getErrorAnalytics(restaurantId || undefined, timeFilter);
    }
    
    return NextResponse.json({
      success: true,
      data: analytics
    });
    
  } catch (error) {
    console.error('Analytics API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}
