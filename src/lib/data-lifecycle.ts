// Data lifecycle management service
// This service handles automated data archiving, cleanup, and retention policies

import { supabaseServer } from './supabaseServer';

export interface RetentionPolicy {
  restaurantId: string;
  sessionsRetentionDays: number;
  ordersRetentionDays: number;
  cartItemsRetentionDays: number;
  notificationsRetentionDays: number;
  splitBillsRetentionDays: number;
  dinersRetentionDays: number;
}

export interface CleanupResult {
  tableName: string;
  deletedCount: number;
  archivedCount: number;
  error?: string;
}

export interface LifecycleJobResult {
  restaurantId: string;
  totalProcessed: number;
  totalArchived: number;
  totalDeleted: number;
  results: CleanupResult[];
  errors: string[];
  duration: number;
}

/**
 * Default retention policies by restaurant tier
 */
export const DEFAULT_RETENTION_POLICIES = {
  basic: {
    sessionsRetentionDays: 180,      // 6 months
    ordersRetentionDays: 365,        // 1 year
    cartItemsRetentionDays: 90,      // 3 months
    notificationsRetentionDays: 30,  // 1 month
    splitBillsRetentionDays: 365,    // 1 year
    dinersRetentionDays: 365         // 1 year
  },
  professional: {
    sessionsRetentionDays: 365,      // 1 year
    ordersRetentionDays: 730,        // 2 years
    cartItemsRetentionDays: 180,     // 6 months
    notificationsRetentionDays: 90,  // 3 months
    splitBillsRetentionDays: 730,    // 2 years
    dinersRetentionDays: 730         // 2 years
  },
  enterprise: {
    sessionsRetentionDays: 730,      // 2 years
    ordersRetentionDays: 1095,       // 3 years
    cartItemsRetentionDays: 365,     // 1 year
    notificationsRetentionDays: 180, // 6 months
    splitBillsRetentionDays: 1095,   // 3 years
    dinersRetentionDays: 1095        // 3 years
  }
};

/**
 * Get retention policy for a restaurant
 */
export async function getRetentionPolicy(restaurantId: string): Promise<RetentionPolicy> {
  try {
    
    // TODO: In the future, this could be stored in a restaurant_settings table
    // For now, we'll use default policies based on restaurant tier
    const { data: restaurant, error } = await supabaseServer
      .from('restaurants')
      .select('tier')
      .eq('id', restaurantId)
      .single();
    
    if (error) {
      console.warn(`⚠️ Could not get restaurant tier for ${restaurantId}, using basic policy`);
      return {
        restaurantId,
        ...DEFAULT_RETENTION_POLICIES.basic
      };
    }
    
    const tier = restaurant?.tier || 'basic';
    const policy = DEFAULT_RETENTION_POLICIES[tier as keyof typeof DEFAULT_RETENTION_POLICIES] || DEFAULT_RETENTION_POLICIES.basic;
    
    return {
      restaurantId,
      ...policy
    };
    
  } catch (error) {
    console.error(`❌ Failed to get retention policy for restaurant ${restaurantId}:`, error);
    // Return basic policy as fallback
    return {
      restaurantId,
      ...DEFAULT_RETENTION_POLICIES.basic
    };
  }
}

/**
 * Clean up old data for a specific table and restaurant
 */
export async function cleanupTableData(
  restaurantId: string,
  tableName: string,
  retentionDays: number,
  archiveBeforeDelete: boolean = true
): Promise<CleanupResult> {
  try {
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    
    let archivedCount = 0;
    let deletedCount = 0;
    
    if (archiveBeforeDelete) {
      // First, archive old data
      const archiveResult = await supabaseServer
        .rpc('archive_old_data', {
          restaurant_uuid: restaurantId,
          days_old: retentionDays,
          archive_reason_text: `Automated cleanup - ${tableName}`
        });
      
      if (archiveResult.error) {
        console.error(`❌ Error archiving ${tableName} data:`, archiveResult.error);
        return {
          tableName,
          deletedCount: 0,
          archivedCount: 0,
          error: archiveResult.error.message
        };
      }
      
      archivedCount = archiveResult.data || 0;
    }
    
    // Then delete old data (only if not archiving or if archiving failed)
    if (!archiveBeforeDelete || archivedCount === 0) {
      const deleteResult = await supabaseServer
        .from(tableName)
        .delete()
        .eq('restaurant_id', restaurantId)
        .lt('created_at', cutoffDate.toISOString());
      
      if (deleteResult.error) {
        console.error(`❌ Error deleting ${tableName} data:`, deleteResult.error);
        return {
          tableName,
          deletedCount: 0,
          archivedCount,
          error: deleteResult.error.message
        };
      }
      
      deletedCount = deleteResult.count || 0;
    }
    
    return {
      tableName,
      deletedCount,
      archivedCount
    };
    
  } catch (error) {
    console.error(`❌ Failed to cleanup ${tableName} data for restaurant ${restaurantId}:`, error);
    return {
      tableName,
      deletedCount: 0,
      archivedCount: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Run data lifecycle management for a specific restaurant
 */
export async function runDataLifecycleForRestaurant(restaurantId: string): Promise<LifecycleJobResult> {
  const startTime = Date.now();
  const results: CleanupResult[] = [];
  const errors: string[] = [];
  
  try {
    
    // Get retention policy for this restaurant
    const policy = await getRetentionPolicy(restaurantId);
    
    // Clean up each table according to retention policy
    const cleanupTasks = [
      { table: 'notifications', days: policy.notificationsRetentionDays },
      { table: 'cart_items', days: policy.cartItemsRetentionDays },
      { table: 'sessions', days: policy.sessionsRetentionDays },
      { table: 'split_bills', days: policy.splitBillsRetentionDays },
      { table: 'orders', days: policy.ordersRetentionDays },
      { table: 'diners', days: policy.dinersRetentionDays }
    ];
    
    for (const task of cleanupTasks) {
      try {
        const result = await cleanupTableData(
          restaurantId,
          task.table,
          task.days,
          true // Archive before delete
        );
        
        results.push(result);
        
        if (result.error) {
          errors.push(`${task.table}: ${result.error}`);
        }
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`${task.table}: ${errorMessage}`);
        results.push({
          tableName: task.table,
          deletedCount: 0,
          archivedCount: 0,
          error: errorMessage
        });
      }
    }
    
    const totalProcessed = results.reduce((sum, r) => sum + r.deletedCount + r.archivedCount, 0);
    const totalArchived = results.reduce((sum, r) => sum + r.archivedCount, 0);
    const totalDeleted = results.reduce((sum, r) => sum + r.deletedCount, 0);
    const duration = Date.now() - startTime;
    
    const jobResult: LifecycleJobResult = {
      restaurantId,
      totalProcessed,
      totalArchived,
      totalDeleted,
      results,
      errors,
      duration
    };
    
    return jobResult;
    
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    console.error(`❌ Data lifecycle management failed for restaurant ${restaurantId}:`, error);
    
    return {
      restaurantId,
      totalProcessed: 0,
      totalArchived: 0,
      totalDeleted: 0,
      results,
      errors: [...errors, errorMessage],
      duration
    };
  }
}

/**
 * Run data lifecycle management for all restaurants
 */
export async function runGlobalDataLifecycle(): Promise<LifecycleJobResult[]> {
  try {
    
    // Get all restaurants
    const { data: restaurants, error } = await supabaseServer
      .from('restaurants')
      .select('id');
    
    if (error) {
      console.error('❌ Error getting restaurants:', error);
      throw error;
    }
    
    if (!restaurants || restaurants.length === 0) {
      return [];
    }
    
    // Run lifecycle management for each restaurant
    const results = await Promise.all(
      restaurants.map(async (restaurant) => {
        try {
          return await runDataLifecycleForRestaurant(restaurant.id);
        } catch (error) {
          console.error(`❌ Failed to run data lifecycle for restaurant ${restaurant.id}:`, error);
          return {
            restaurantId: restaurant.id,
            totalProcessed: 0,
            totalArchived: 0,
            totalDeleted: 0,
            results: [],
            errors: [error instanceof Error ? error.message : 'Unknown error'],
            duration: 0
          };
        }
      })
    );
    
    return results;
    
  } catch (error) {
    console.error('❌ Global data lifecycle management failed:', error);
    throw error;
  }
}

/**
 * Get data lifecycle statistics for a restaurant
 */
export async function getDataLifecycleStats(restaurantId: string): Promise<{
  restaurantId: string;
  policy: RetentionPolicy;
  currentDataAge: {
    oldestSession: string | null;
    oldestOrder: string | null;
    oldestCartItem: string | null;
    oldestNotification: string | null;
  };
  estimatedCleanup: {
    sessionsToArchive: number;
    ordersToArchive: number;
    cartItemsToArchive: number;
    notificationsToArchive: number;
  };
}> {
  try {
    
    const policy = await getRetentionPolicy(restaurantId);
    
    // Get oldest records for each table
    const [sessionsResult, ordersResult, cartItemsResult, notificationsResult] = await Promise.all([
      supabaseServer
        .from('sessions')
        .select('created_at')
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: true })
        .limit(1),
      
      supabaseServer
        .from('orders')
        .select('created_at')
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: true })
        .limit(1),
      
      supabaseServer
        .from('cart_items')
        .select('created_at')
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: true })
        .limit(1),
      
      supabaseServer
        .from('notifications')
        .select('created_at')
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: true })
        .limit(1)
    ]);
    
    const currentDataAge = {
      oldestSession: sessionsResult.data?.[0]?.created_at || null,
      oldestOrder: ordersResult.data?.[0]?.created_at || null,
      oldestCartItem: cartItemsResult.data?.[0]?.created_at || null,
      oldestNotification: notificationsResult.data?.[0]?.created_at || null
    };
    
    // Calculate estimated cleanup (simplified - in reality you'd want more sophisticated queries)
    const estimatedCleanup = {
      sessionsToArchive: 0, // TODO: Implement count queries for records older than retention period
      ordersToArchive: 0,
      cartItemsToArchive: 0,
      notificationsToArchive: 0
    };
    
    const stats = {
      restaurantId,
      policy,
      currentDataAge,
      estimatedCleanup
    };
    
    return stats;
    
  } catch (error) {
    console.error(`❌ Failed to get data lifecycle stats for restaurant ${restaurantId}:`, error);
    throw error;
  }
}
