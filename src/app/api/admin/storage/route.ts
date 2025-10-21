// Admin API route for storage monitoring and management
// This endpoint provides storage usage information and management tools

import { NextRequest, NextResponse } from 'next/server';
import { 
  getRestaurantStorageSummary, 
  getAllRestaurantsStorageUsage,
  getGlobalStorageStats,
  updateRestaurantStorageUsage,
  archiveOldData,
  checkStorageLimits
} from '@/lib/storage-monitoring';

// GET /api/admin/storage - Get storage usage information
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get('restaurantId');
    const global = searchParams.get('global') === 'true';
    
    if (global) {
      // Get global storage statistics
      const stats = await getGlobalStorageStats();
      return NextResponse.json({
        success: true,
        data: stats,
        type: 'global_stats'
      });
    } else if (restaurantId) {
      // Get storage summary for specific restaurant
      const summary = await getRestaurantStorageSummary(restaurantId);
      return NextResponse.json({
        success: true,
        data: summary,
        type: 'restaurant_summary'
      });
    } else {
      // Get storage usage for all restaurants
      const summaries = await getAllRestaurantsStorageUsage();
      return NextResponse.json({
        success: true,
        data: summaries,
        type: 'all_restaurants',
        count: summaries.length
      });
    }
    
  } catch (error) {
    console.error('❌ API: Storage monitoring error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get storage information' 
      },
      { status: 500 }
    );
  }
}

// POST /api/admin/storage - Perform storage management actions
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
      case 'update_usage':
        if (!restaurantId) {
          return NextResponse.json(
            { success: false, error: 'Restaurant ID is required for update_usage action' },
            { status: 400 }
          );
        }
        
        await updateRestaurantStorageUsage(restaurantId);
        return NextResponse.json({
          success: true,
          message: `Storage usage updated for restaurant ${restaurantId}`
        });
        
      case 'archive_old_data':
        if (!restaurantId) {
          return NextResponse.json(
            { success: false, error: 'Restaurant ID is required for archive_old_data action' },
            { status: 400 }
          );
        }
        
        const daysOld = params.daysOld || 365;
        const reason = params.reason || 'Manual archiving';
        
        const archivedCount = await archiveOldData(restaurantId, daysOld, reason);
        return NextResponse.json({
          success: true,
          message: `Archived ${archivedCount} records for restaurant ${restaurantId}`,
          archivedCount
        });
        
      case 'check_limits':
        if (!restaurantId) {
          return NextResponse.json(
            { success: false, error: 'Restaurant ID is required for check_limits action' },
            { status: 400 }
          );
        }
        
        const limits = params.limits || {
          warningMB: 100,
          criticalMB: 500,
          maxMB: 1000
        };
        
        const alerts = await checkStorageLimits(restaurantId, limits);
        return NextResponse.json({
          success: true,
          data: alerts,
          message: `Storage limits checked for restaurant ${restaurantId}`
        });
        
      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
    
  } catch (error) {
    console.error('❌ API: Storage management error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Failed to perform storage management action' 
      },
      { status: 500 }
    );
  }
}
