// Storage monitoring service for multi-tenant architecture
// This service tracks storage usage per restaurant for billing and scaling

import { supabaseServer } from './supabaseServer';

export interface StorageUsage {
  tableName: string;
  recordCount: number;
  estimatedSizeMB: number;
}

export interface RestaurantStorageSummary {
  restaurantId: string;
  totalRecords: number;
  totalSizeMB: number;
  breakdown: StorageUsage[];
  lastUpdated: string;
}

export interface StorageAlert {
  restaurantId: string;
  alertType: 'warning' | 'critical' | 'limit_exceeded';
  message: string;
  currentUsage: number;
  limit: number;
  timestamp: string;
}

/**
 * Calculate storage usage for a specific restaurant
 */
export async function calculateRestaurantStorageUsage(restaurantId: string): Promise<StorageUsage[]> {
  try {
    // Debug logging removed for production security
    
    const { data, error } = await supabaseServer
      .rpc('calculate_restaurant_storage_usage', { restaurant_uuid: restaurantId });
    
    if (error) {
      console.error('❌ Error calculating storage usage:', error);
      throw error;
    }
    
    // Debug logging removed for production security
    return data || [];
    
  } catch (error) {
    console.error('❌ Failed to calculate storage usage:', error);
    throw error;
  }
}

/**
 * Update storage usage metrics for a restaurant
 */
export async function updateRestaurantStorageUsage(restaurantId: string): Promise<void> {
  try {
    // Debug logging removed for production security
    
    const { error } = await supabaseServer
      .rpc('update_restaurant_storage_usage', { restaurant_uuid: restaurantId });
    
    if (error) {
      console.error('❌ Error updating storage usage:', error);
      throw error;
    }
    
    // Debug logging removed for production security
    
  } catch (error) {
    console.error('❌ Failed to update storage usage:', error);
    throw error;
  }
}

/**
 * Get storage summary for a restaurant
 */
export async function getRestaurantStorageSummary(restaurantId: string): Promise<RestaurantStorageSummary> {
  try {
    // Debug logging removed for production security
    
    const { data, error } = await supabaseServer
      .from('restaurant_storage_usage')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('table_name');
    
    if (error) {
      console.error('❌ Error getting storage summary:', error);
      throw error;
    }
    
    const breakdown: StorageUsage[] = data?.map(item => ({
      tableName: item.table_name,
      recordCount: item.record_count,
      estimatedSizeMB: parseFloat(item.estimated_size_mb)
    })) || [];
    
    const totalRecords = breakdown.reduce((sum, item) => sum + item.recordCount, 0);
    const totalSizeMB = breakdown.reduce((sum, item) => sum + item.estimatedSizeMB, 0);
    
    const summary: RestaurantStorageSummary = {
      restaurantId,
      totalRecords,
      totalSizeMB,
      breakdown,
      lastUpdated: data?.[0]?.last_updated || new Date().toISOString()
    };
    
    // Debug logging removed for production security
    return summary;
    
  } catch (error) {
    console.error('❌ Failed to get storage summary:', error);
    throw error;
  }
}

/**
 * Archive old data for a restaurant
 */
export async function archiveOldData(
  restaurantId: string, 
  daysOld: number = 365, 
  reason: string = 'Automated archiving'
): Promise<number> {
  try {
    // Debug logging removed for production security
    
    const { data, error } = await supabaseServer
      .rpc('archive_old_data', { 
        restaurant_uuid: restaurantId,
        days_old: daysOld,
        archive_reason_text: reason
      });
    
    if (error) {
      console.error('❌ Error archiving old data:', error);
      throw error;
    }
    
    const archivedCount = data || 0;
    // Debug logging removed for production security
    return archivedCount;
    
  } catch (error) {
    console.error('❌ Failed to archive old data:', error);
    throw error;
  }
}

/**
 * Check storage limits and generate alerts
 */
export async function checkStorageLimits(
  restaurantId: string, 
  limits: { warningMB: number; criticalMB: number; maxMB: number }
): Promise<StorageAlert[]> {
  try {
    // Debug logging removed for production security
    
    const summary = await getRestaurantStorageSummary(restaurantId);
    const alerts: StorageAlert[] = [];
    
    if (summary.totalSizeMB > limits.maxMB) {
      alerts.push({
        restaurantId,
        alertType: 'limit_exceeded',
        message: `Storage limit exceeded: ${summary.totalSizeMB.toFixed(2)}MB > ${limits.maxMB}MB`,
        currentUsage: summary.totalSizeMB,
        limit: limits.maxMB,
        timestamp: new Date().toISOString()
      });
    } else if (summary.totalSizeMB > limits.criticalMB) {
      alerts.push({
        restaurantId,
        alertType: 'critical',
        message: `Critical storage usage: ${summary.totalSizeMB.toFixed(2)}MB > ${limits.criticalMB}MB`,
        currentUsage: summary.totalSizeMB,
        limit: limits.criticalMB,
        timestamp: new Date().toISOString()
      });
    } else if (summary.totalSizeMB > limits.warningMB) {
      alerts.push({
        restaurantId,
        alertType: 'warning',
        message: `High storage usage: ${summary.totalSizeMB.toFixed(2)}MB > ${limits.warningMB}MB`,
        currentUsage: summary.totalSizeMB,
        limit: limits.warningMB,
        timestamp: new Date().toISOString()
      });
    }
    
    // Debug logging removed for production security
    return alerts;
    
  } catch (error) {
    console.error('❌ Failed to check storage limits:', error);
    throw error;
  }
}

/**
 * Get all restaurants with their storage usage
 */
export async function getAllRestaurantsStorageUsage(): Promise<RestaurantStorageSummary[]> {
  try {
    // Debug logging removed for production security
    
    // Get all restaurants
    const { data: restaurants, error: restaurantsError } = await supabaseServer
      .from('restaurants')
      .select('id');
    
    if (restaurantsError) {
      console.error('❌ Error getting restaurants:', restaurantsError);
      throw restaurantsError;
    }
    
    if (!restaurants || restaurants.length === 0) {
      // Debug logging removed for production security
      return [];
    }
    
    // Get storage usage for each restaurant
    const summaries = await Promise.all(
      restaurants.map(async (restaurant) => {
        try {
          return await getRestaurantStorageSummary(restaurant.id);
        } catch (error) {
          console.error(`❌ Failed to get storage summary for restaurant ${restaurant.id}:`, error);
          return {
            restaurantId: restaurant.id,
            totalRecords: 0,
            totalSizeMB: 0,
            breakdown: [],
            lastUpdated: new Date().toISOString()
          };
        }
      })
    );
    
    // Debug logging removed for production security
    return summaries;
    
  } catch (error) {
    console.error('❌ Failed to get all restaurants storage usage:', error);
    throw error;
  }
}

/**
 * Automated storage monitoring job
 * This should be run periodically (e.g., daily)
 */
export async function runStorageMonitoringJob(): Promise<void> {
  try {
    // Debug logging removed for production security
    
    const summaries = await getAllRestaurantsStorageUsage();
    
    for (const summary of summaries) {
      try {
        // Update storage usage metrics
        await updateRestaurantStorageUsage(summary.restaurantId);
        
        // Check storage limits (example limits - should be configurable per restaurant)
        const limits = {
          warningMB: 100,    // 100MB warning
          criticalMB: 500,   // 500MB critical
          maxMB: 1000        // 1GB max
        };
        
        const alerts = await checkStorageLimits(summary.restaurantId, limits);
        
        // Process alerts (send notifications, block operations, etc.)
        for (const alert of alerts) {
          // Debug logging removed for production security
          
          // TODO: Implement alert handling
          // - Send email notifications
          // - Update restaurant status
          // - Block new operations if limit exceeded
          // - Trigger automatic archiving
        }
        
        // Auto-archive old data if approaching limits
        if (summary.totalSizeMB > limits.criticalMB) {
          // Debug logging removed for production security
          await archiveOldData(summary.restaurantId, 180, 'Auto-archiving due to high storage usage');
        }
        
      } catch (error) {
        console.error(`❌ Error processing restaurant ${summary.restaurantId}:`, error);
      }
    }
    
    // Debug logging removed for production security
    
  } catch (error) {
    console.error('❌ Automated storage monitoring job failed:', error);
    throw error;
  }
}

/**
 * Get storage usage statistics across all restaurants
 */
export async function getGlobalStorageStats(): Promise<{
  totalRestaurants: number;
  totalRecords: number;
  totalSizeMB: number;
  averageSizePerRestaurant: number;
  largestRestaurant: RestaurantStorageSummary | null;
}> {
  try {
    // Debug logging removed for production security
    
    const summaries = await getAllRestaurantsStorageUsage();
    
    const totalRestaurants = summaries.length;
    const totalRecords = summaries.reduce((sum, s) => sum + s.totalRecords, 0);
    const totalSizeMB = summaries.reduce((sum, s) => sum + s.totalSizeMB, 0);
    const averageSizePerRestaurant = totalRestaurants > 0 ? totalSizeMB / totalRestaurants : 0;
    
    const largestRestaurant = summaries.reduce((largest, current) => 
      current.totalSizeMB > largest.totalSizeMB ? current : largest, 
      summaries[0] || null
    );
    
    const stats = {
      totalRestaurants,
      totalRecords,
      totalSizeMB,
      averageSizePerRestaurant,
      largestRestaurant
    };
    
    // Debug logging removed for production security
    return stats;
    
  } catch (error) {
    console.error('❌ Failed to get global storage statistics:', error);
    throw error;
  }
}
