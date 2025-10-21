// Scheduled jobs service for automated maintenance
// This service handles periodic tasks like storage monitoring and data cleanup

import { runStorageMonitoringJob } from './storage-monitoring';
import { runGlobalDataLifecycle } from './data-lifecycle';

export interface JobResult {
  jobName: string;
  success: boolean;
  startTime: string;
  endTime: string;
  duration: number;
  results?: any;
  errors: string[];
}

export interface ScheduledJob {
  name: string;
  description: string;
  schedule: string; // cron expression
  enabled: boolean;
  lastRun?: string;
  nextRun?: string;
  averageDuration?: number;
  successRate?: number;
}

/**
 * Daily storage monitoring job
 * Runs every day at 2 AM to monitor storage usage and send alerts
 */
export async function runDailyStorageMonitoring(): Promise<JobResult> {
  const startTime = new Date();
  const errors: string[] = [];
  
  try {
    
    await runStorageMonitoringJob();
    
    const endTime = new Date();
    const duration = endTime.getTime() - startTime.getTime();
    
    return {
      jobName: 'daily_storage_monitoring',
      success: true,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      duration,
      errors
    };
    
  } catch (error) {
    const endTime = new Date();
    const duration = endTime.getTime() - startTime.getTime();
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    console.error('❌ Daily storage monitoring job failed:', error);
    errors.push(errorMessage);
    
    return {
      jobName: 'daily_storage_monitoring',
      success: false,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      duration,
      errors
    };
  }
}

/**
 * Weekly data lifecycle management job
 * Runs every Sunday at 3 AM to clean up old data
 */
export async function runWeeklyDataCleanup(): Promise<JobResult> {
  const startTime = new Date();
  const errors: string[] = [];
  
  try {
    
    const results = await runGlobalDataLifecycle();
    
    const endTime = new Date();
    const duration = endTime.getTime() - startTime.getTime();
    
    const summary = {
      restaurantsProcessed: results.length,
      totalProcessed: results.reduce((sum, r) => sum + r.totalProcessed, 0),
      totalArchived: results.reduce((sum, r) => sum + r.totalArchived, 0),
      totalDeleted: results.reduce((sum, r) => sum + r.totalDeleted, 0),
      totalErrors: results.reduce((sum, r) => sum + r.errors.length, 0)
    };
    
    return {
      jobName: 'weekly_data_cleanup',
      success: true,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      duration,
      results: summary,
      errors
    };
    
  } catch (error) {
    const endTime = new Date();
    const duration = endTime.getTime() - startTime.getTime();
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    console.error('❌ Weekly data cleanup job failed:', error);
    errors.push(errorMessage);
    
    return {
      jobName: 'weekly_data_cleanup',
      success: false,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      duration,
      errors
    };
  }
}

/**
 * Monthly storage optimization job
 * Runs on the 1st of every month at 4 AM to optimize storage
 */
export async function runMonthlyStorageOptimization(): Promise<JobResult> {
  const startTime = new Date();
  const errors: string[] = [];
  
  try {
    
    // This job could include:
    // - Database optimization (VACUUM, REINDEX)
    // - Compression of old data
    // - Moving old data to cheaper storage
    // - Generating storage reports
    
    // For now, we'll just run a comprehensive cleanup
    const results = await runGlobalDataLifecycle();
    
    const endTime = new Date();
    const duration = endTime.getTime() - startTime.getTime();
    
    return {
      jobName: 'monthly_storage_optimization',
      success: true,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      duration,
      results: {
        restaurantsProcessed: results.length,
        totalProcessed: results.reduce((sum, r) => sum + r.totalProcessed, 0)
      },
      errors
    };
    
  } catch (error) {
    const endTime = new Date();
    const duration = endTime.getTime() - startTime.getTime();
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    console.error('❌ Monthly storage optimization job failed:', error);
    errors.push(errorMessage);
    
    return {
      jobName: 'monthly_storage_optimization',
      success: false,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      duration,
      errors
    };
  }
}

/**
 * Get list of available scheduled jobs
 */
export function getScheduledJobs(): ScheduledJob[] {
  return [
    {
      name: 'daily_storage_monitoring',
      description: 'Monitor storage usage and send alerts',
      schedule: '0 2 * * *', // Every day at 2 AM
      enabled: true
    },
    {
      name: 'weekly_data_cleanup',
      description: 'Clean up old data according to retention policies',
      schedule: '0 3 * * 0', // Every Sunday at 3 AM
      enabled: true
    },
    {
      name: 'monthly_storage_optimization',
      description: 'Optimize storage and generate reports',
      schedule: '0 4 1 * *', // 1st of every month at 4 AM
      enabled: true
    }
  ];
}

/**
 * Run a specific job by name
 */
export async function runJob(jobName: string): Promise<JobResult> {
  switch (jobName) {
    case 'daily_storage_monitoring':
      return await runDailyStorageMonitoring();
    case 'weekly_data_cleanup':
      return await runWeeklyDataCleanup();
    case 'monthly_storage_optimization':
      return await runMonthlyStorageOptimization();
    default:
      throw new Error(`Unknown job: ${jobName}`);
  }
}

/**
 * Run all enabled jobs
 */
export async function runAllJobs(): Promise<JobResult[]> {
  const jobs = getScheduledJobs().filter(job => job.enabled);
  const results: JobResult[] = [];
  
  for (const job of jobs) {
    try {
      const result = await runJob(job.name);
      results.push(result);
      
      if (!result.success) {
        console.error(`❌ Job ${job.name} failed:`, result.errors);
      }
    } catch (error) {
      console.error(`❌ Failed to run job ${job.name}:`, error);
      results.push({
        jobName: job.name,
        success: false,
        startTime: new Date().toISOString(),
        endTime: new Date().toISOString(),
        duration: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      });
    }
  }
  
  return results;
}

/**
 * Health check for scheduled jobs
 */
export async function healthCheck(): Promise<{
  status: 'healthy' | 'degraded' | 'unhealthy';
  jobs: ScheduledJob[];
  lastRunResults: JobResult[];
  issues: string[];
}> {
  try {
    const jobs = getScheduledJobs();
    const issues: string[] = [];
    
    // Check if any critical jobs are disabled
    const criticalJobs = ['daily_storage_monitoring', 'weekly_data_cleanup'];
    const disabledCriticalJobs = jobs.filter(job => 
      criticalJobs.includes(job.name) && !job.enabled
    );
    
    if (disabledCriticalJobs.length > 0) {
      issues.push(`Critical jobs disabled: ${disabledCriticalJobs.map(j => j.name).join(', ')}`);
    }
    
    // Determine overall status
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    
    if (issues.length > 0) {
      status = issues.some(issue => issue.includes('Critical')) ? 'unhealthy' : 'degraded';
    }
    
    return {
      status,
      jobs,
      lastRunResults: [], // TODO: Implement job history tracking
      issues
    };
    
  } catch (error) {
    console.error('❌ Health check failed:', error);
    return {
      status: 'unhealthy',
      jobs: [],
      lastRunResults: [],
      issues: [error instanceof Error ? error.message : 'Unknown error']
    };
  }
}
