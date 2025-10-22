import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

// Configuration constants
const BATCH_SIZE = 100;
const BATCH_DELAY_MS = 1000;
const MAX_EXECUTION_TIME = 30000; // 30 seconds
const RETENTION_HOURS = 24; // Only clean up records older than 24 hours

// Utility function for sleep/delay
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// POST /api/auto-cleanup - Production-ready optimized version
export async function POST() {
  const startTime = Date.now();
  const cutoffDate = new Date(Date.now() - RETENTION_HOURS * 60 * 60 * 1000).toISOString();
  
  console.log(`🚀 AUTO-CLEANUP - Starting cleanup process. Cutoff date: ${cutoffDate}`);
  
  try {
    // Cleanup summary
    const cleanupSummary = {
      cartItems: { deleted: 0, batches: 0 },
      orders: { deleted: 0, batches: 0 },
      sessions: { deleted: 0, batches: 0 },
      totalDeleted: 0,
      executionTime: 0
    };
    
    // Cleanup cart items in batches
    console.log('🧹 AUTO-CLEANUP - Cleaning up cart items...');
    cleanupSummary.cartItems = await cleanupTableInBatches(
      'cart_items',
      'created_at',
      cutoffDate,
      'Cart items'
    );
    
    // Check if we still have time for more cleanup
    if (Date.now() - startTime < MAX_EXECUTION_TIME - 5000) {
      // Cleanup old cart orders in batches
      console.log('🧹 AUTO-CLEANUP - Cleaning up old cart orders...');
      cleanupSummary.orders = await cleanupTableInBatches(
        'orders',
        'created_at',
        cutoffDate,
        'Orders'
      );
    }
    
    // Check if we still have time for more cleanup
    if (Date.now() - startTime < MAX_EXECUTION_TIME - 5000) {
      // Cleanup stale sessions in batches
      console.log('🧹 AUTO-CLEANUP - Cleaning up stale sessions...');
      cleanupSummary.sessions = await cleanupStaleSessions(cutoffDate);
    }
    
    // Calculate execution time
    cleanupSummary.executionTime = Date.now() - startTime;
    cleanupSummary.totalDeleted = 
      cleanupSummary.cartItems.deleted + 
      cleanupSummary.orders.deleted + 
      cleanupSummary.sessions.deleted;
    
    // Log summary
    console.log(`✅ AUTO-CLEANUP - Completed successfully in ${cleanupSummary.executionTime}ms`);
    console.log(`📊 AUTO-CLEANUP - Summary:`, cleanupSummary);
    
    return NextResponse.json({
      message: 'Cleanup completed successfully',
      summary: cleanupSummary
    });
    
  } catch (error) {
    const executionTime = Date.now() - startTime;
    console.error(`❌ AUTO-CLEANUP - Exception during cleanup after ${executionTime}ms:`, error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      executionTime 
    }, { status: 500 });
  }
}

// Generic function to cleanup any table in batches
async function cleanupTableInBatches(
  tableName: string,
  dateColumn: string,
  cutoffDate: string,
  logLabel: string
): Promise<{ deleted: number; batches: number }> {
  const startTime = Date.now();
  let totalDeleted = 0;
  let batches = 0;
  
  try {
    while (Date.now() - startTime < MAX_EXECUTION_TIME - 2000) {
      // Check if there are records to delete
      const { data: records, error: countError } = await supabaseServer
        .from(tableName)
        .select('id')
        .lt(dateColumn, cutoffDate)
        .limit(BATCH_SIZE);
      
      if (countError) {
        console.error(`❌ AUTO-CLEANUP - Error checking ${logLabel}:`, countError);
        break;
      }
      
      // If no records found, we're done
      if (!records || records.length === 0) {
        console.log(`✅ AUTO-CLEANUP - No more ${logLabel} to clean up`);
        break;
      }
      
      // Delete the batch
      const { error: deleteError } = await supabaseServer
        .from(tableName)
        .delete()
        .lt(dateColumn, cutoffDate)
        .limit(BATCH_SIZE);
      
      if (deleteError) {
        console.error(`❌ AUTO-CLEANUP - Error deleting ${logLabel}:`, deleteError);
        break;
      }
      
      const deletedCount = records.length;
      totalDeleted += deletedCount;
      batches++;
      
      console.log(`📊 AUTO-CLEANUP - Deleted ${deletedCount} ${logLabel} (batch ${batches})`);
      
      // If we deleted less than batch size, we're done
      if (deletedCount < BATCH_SIZE) {
        console.log(`✅ AUTO-CLEANUP - Finished cleaning up ${logLabel}`);
        break;
      }
      
      // Delay between batches to prevent server overload
      await sleep(BATCH_DELAY_MS);
    }
    
    return { deleted: totalDeleted, batches };
    
  } catch (error) {
    console.error(`❌ AUTO-CLEANUP - Exception in cleanupTableInBatches for ${logLabel}:`, error);
    return { deleted: totalDeleted, batches };
  }
}

// Specialized function for cleaning up stale sessions
async function cleanupStaleSessions(cutoffDate: string): Promise<{ deleted: number; batches: number }> {
  const startTime = Date.now();
  let totalDeleted = 0;
  let batches = 0;
  
  try {
    while (Date.now() - startTime < MAX_EXECUTION_TIME - 2000) {
      // Find stale sessions (inactive for more than 24 hours)
      const { data: sessions, error: sessionError } = await supabaseServer
        .from('sessions')
        .select('id')
        .eq('status', 'inactive')
        .lt('updated_at', cutoffDate)
        .limit(BATCH_SIZE);
      
      if (sessionError) {
        console.error('❌ AUTO-CLEANUP - Error checking stale sessions:', sessionError);
        break;
      }
      
      // If no sessions found, we're done
      if (!sessions || sessions.length === 0) {
        console.log('✅ AUTO-CLEANUP - No more stale sessions to clean up');
        break;
      }
      
      // Delete the stale sessions
      const { error: deleteError } = await supabaseServer
        .from('sessions')
        .delete()
        .eq('status', 'inactive')
        .lt('updated_at', cutoffDate)
        .limit(BATCH_SIZE);
      
      if (deleteError) {
        console.error('❌ AUTO-CLEANUP - Error deleting stale sessions:', deleteError);
        break;
      }
      
      const deletedCount = sessions.length;
      totalDeleted += deletedCount;
      batches++;
      
      console.log(`📊 AUTO-CLEANUP - Deleted ${deletedCount} stale sessions (batch ${batches})`);
      
      // If we deleted less than batch size, we're done
      if (deletedCount < BATCH_SIZE) {
        console.log('✅ AUTO-CLEANUP - Finished cleaning up stale sessions');
        break;
      }
      
      // Delay between batches to prevent server overload
      await sleep(BATCH_DELAY_MS);
    }
    
    return { deleted: totalDeleted, batches };
    
  } catch (error) {
    console.error('❌ AUTO-CLEANUP - Exception in cleanupStaleSessions:', error);
    return { deleted: totalDeleted, batches };
  }
}