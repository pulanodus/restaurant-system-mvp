// src/lib/health-check.ts
import { testSupabaseConnection } from './supabase-test-utils'
import { debugLog, debugErrorLog, isDebugMode } from '@/lib/debug'

export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy'
  timestamp: string
  details: any
  duration: number
}

// Simple health check function as requested by the user
export async function healthCheck(): Promise<HealthCheckResult> {
  const startTime = Date.now()
  
  try {
    if (isDebugMode()) {
      console.log('Running health check...')
    }
    
    debugLog('Health check started')
    
    const connectionTest = await testSupabaseConnection()
    
    const result: HealthCheckResult = {
      status: connectionTest.success ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      details: connectionTest,
      duration: Date.now() - startTime
    }
    
    if (isDebugMode()) {
      console.log('Health check completed:', {
        status: result.status,
        duration: `${result.duration}ms`
      })
    }
    
    debugLog('Health check completed', {
      status: result.status,
      duration: `${result.duration}ms`
    })
    
    return result
    
  } catch (_error) {
    const duration = Date.now() - startTime
    
    if (isDebugMode()) {
      console.error('Health check failed:', _error)
    }
    
    debugErrorLog('Health check failed', _error)
    
    return {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      details: {
        error: _error instanceof Error ? _error.message : 'Unknown error',
        type: _error instanceof Error ? _error.constructor.name : 'Unknown'
      },
      duration
    }
  }
}

// Health check with custom response format
export async function healthCheckWithResponse(): Promise<Response> {
  const result = await healthCheck()
  
  return new Response(JSON.stringify({
    status: result.status,
    timestamp: result.timestamp,
    details: result.details
  }), {
    status: result.status === 'healthy' ? 200 : 503,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache'
    }
  })
}

// Usage example:
// const result = await healthCheck();
// console.log('Health status:', result.status);
// 
// Or for API routes:
// export async function GET() {
//   return await healthCheckWithResponse();
// }
