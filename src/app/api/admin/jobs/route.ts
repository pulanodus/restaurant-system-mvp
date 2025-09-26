// Admin API route for scheduled jobs management
// This endpoint provides job execution and monitoring capabilities

import { NextRequest, NextResponse } from 'next/server';
import { 
  getScheduledJobs,
  runJob,
  runAllJobs,
  healthCheck
} from '@/lib/scheduled-jobs';

// GET /api/admin/jobs - Get scheduled jobs information
export async function GET(request: NextRequest) {
  try {
    console.log('🔧 API: Getting scheduled jobs information');
    
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    
    if (action === 'health') {
      // Get health check information
      const health = await healthCheck();
      return NextResponse.json({
        success: true,
        data: health,
        type: 'health_check'
      });
    } else {
      // Get list of scheduled jobs
      const jobs = getScheduledJobs();
      return NextResponse.json({
        success: true,
        data: jobs,
        type: 'scheduled_jobs',
        count: jobs.length
      });
    }
    
  } catch (error) {
    console.error('❌ API: Scheduled jobs error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get scheduled jobs information' 
      },
      { status: 500 }
    );
  }
}

// POST /api/admin/jobs - Execute scheduled jobs
export async function POST(request: NextRequest) {
  try {
    console.log('🔧 API: Executing scheduled jobs');
    
    const body = await request.json();
    const { action, jobName } = body;
    
    if (!action) {
      return NextResponse.json(
        { success: false, error: 'Action is required' },
        { status: 400 }
      );
    }
    
    switch (action) {
      case 'run_job':
        if (!jobName) {
          return NextResponse.json(
            { success: false, error: 'Job name is required for run_job action' },
            { status: 400 }
          );
        }
        
        const result = await runJob(jobName);
        return NextResponse.json({
          success: true,
          data: result,
          message: `Job ${jobName} executed`
        });
        
      case 'run_all':
        const results = await runAllJobs();
        const summary = {
          totalJobs: results.length,
          successfulJobs: results.filter(r => r.success).length,
          failedJobs: results.filter(r => !r.success).length,
          totalDuration: results.reduce((sum, r) => sum + r.duration, 0)
        };
        
        return NextResponse.json({
          success: true,
          data: results,
          summary,
          message: `Executed ${results.length} jobs`
        });
        
      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
    
  } catch (error) {
    console.error('❌ API: Scheduled jobs execution error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Failed to execute scheduled jobs' 
      },
      { status: 500 }
    );
  }
}
