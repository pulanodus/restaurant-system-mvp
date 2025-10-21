import { NextRequest, NextResponse } from 'next/server';
import { getErrorAnalytics, getErrorSummary } from '@/lib/error-handling';

// Simple analytics API without authentication for testing
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
    console.error('❌ Simple Analytics API error:', error);
    
    // Return mock data on error
    const mockAnalytics = {
      total: 0,
      bySeverity: {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0
      },
      byOperation: {},
      recentErrors: []
    };
    
    return NextResponse.json({
      success: true,
      data: mockAnalytics,
      warning: 'Using mock data due to error'
    });
  }
}
