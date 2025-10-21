// Admin API route for data lifecycle management
// This endpoint provides data archiving, cleanup, and retention policy management

import { NextRequest, NextResponse } from 'next/server';
import { 
  runDataLifecycleForRestaurant,
  runGlobalDataLifecycle,
  getDataLifecycleStats,
  getRetentionPolicy
} from '@/lib/data-lifecycle';

// GET /api/admin/data-lifecycle - Get data lifecycle information
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get('restaurantId');
    const action = searchParams.get('action');
    
    if (action === 'stats' && restaurantId) {
      // Get data lifecycle statistics for a restaurant
      const stats = await getDataLifecycleStats(restaurantId);
      return NextResponse.json({
        success: true,
        data: stats,
        type: 'lifecycle_stats'
      });
    } else if (action === 'policy' && restaurantId) {
      // Get retention policy for a restaurant
      const policy = await getRetentionPolicy(restaurantId);
      return NextResponse.json({
        success: true,
        data: policy,
        type: 'retention_policy'
      });
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid action or missing restaurantId' },
        { status: 400 }
      );
    }
    
  } catch (error) {
    console.error('❌ API: Data lifecycle error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get data lifecycle information' 
      },
      { status: 500 }
    );
  }
}

// POST /api/admin/data-lifecycle - Perform data lifecycle management actions
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, restaurantId, ...params } = body;
    
    if (!action) {
      return NextResponse.json(
        { success: false, error: 'Action is required' },
        { status: 400 }
      );
    }
    
    switch (action) {
      case 'cleanup_restaurant':
        if (!restaurantId) {
          return NextResponse.json(
            { success: false, error: 'Restaurant ID is required for cleanup_restaurant action' },
            { status: 400 }
          );
        }
        
        const result = await runDataLifecycleForRestaurant(restaurantId);
        return NextResponse.json({
          success: true,
          data: result,
          message: `Data lifecycle management completed for restaurant ${restaurantId}`
        });
        
      case 'cleanup_all':
        const results = await runGlobalDataLifecycle();
        const summary = {
          restaurantsProcessed: results.length,
          totalProcessed: results.reduce((sum, r) => sum + r.totalProcessed, 0),
          totalArchived: results.reduce((sum, r) => sum + r.totalArchived, 0),
          totalDeleted: results.reduce((sum, r) => sum + r.totalDeleted, 0),
          totalErrors: results.reduce((sum, r) => sum + r.errors.length, 0)
        };
        
        return NextResponse.json({
          success: true,
          data: results,
          summary,
          message: `Global data lifecycle management completed for ${results.length} restaurants`
        });
        
      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
    
  } catch (error) {
    console.error('❌ API: Data lifecycle management error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Failed to perform data lifecycle management action' 
      },
      { status: 500 }
    );
  }
}
