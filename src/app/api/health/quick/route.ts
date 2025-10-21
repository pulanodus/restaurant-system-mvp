// src/app/api/health/quick/route.ts
import { NextRequest, NextResponse } from 'next/server'

import { debugLog, debugErrorLog, isDebugMode } from '@/lib/debug'
import { quickHealthCheck, checkEnvironment } from '@/lib/supabase-test-utils'

// Quick health check endpoint - minimal overhead
export async function GET(_request: NextRequest) {
  const startTime = Date.now()
  const healthCheckId = Math.random().toString(36).substring(2, 15)
  
  if (isDebugMode()) {
    // Debug mode enabled
  }

  debugLog('Quick health check started', { 
    healthCheckId, 
    timestamp: new Date().toISOString()
  })

  try {
    // Check environment first
    const env = checkEnvironment()
    
    if (!env.hasSupabaseUrl || !env.hasSupabaseKey) {
      const response = {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        healthCheckId,
        error: 'Configuration Error',
        details: {
          message: 'Environment variables not configured',
          hasUrl: env.hasSupabaseUrl,
          hasAnonKey: env.hasSupabaseKey
        },
        duration: Date.now() - startTime
      }

      debugErrorLog('Quick health check failed - configuration error', {
        healthCheckId,
        hasUrl: env.hasSupabaseUrl,
        hasAnonKey: env.hasSupabaseKey
      })

      return NextResponse.json(response, { status: 503 })
    }

    // Run quick health check
    const healthResult = await quickHealthCheck()
    
    const response = {
      status: healthResult.status,
      timestamp: new Date().toISOString(),
      healthCheckId,
      details: {
        supabase: healthResult,
        environment: env
      },
      duration: Date.now() - startTime
    }

    if (isDebugMode()) {
      // Debug mode enabled
    }

    debugLog('Quick health check completed', {
      healthCheckId,
      status: response.status,
      duration: `${response.duration}ms`,
      healthy: healthResult.status === 'healthy'
    })

    return NextResponse.json(response, { 
      status: healthResult.status === 'healthy' ? 200 : 503 
    })

  } catch (error) {
    const duration = Date.now() - startTime
    
    if (isDebugMode()) {
      console.error('❌ Quick health check failed with exception:', error)
    }

    debugErrorLog('Quick health check failed with exception', {
      error: error instanceof Error ? error.message : 'Unknown error',
      healthCheckId,
      duration: `${duration}ms`
    })

    const response = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      healthCheckId,
      error: 'Internal Server Error',
      details: {
        message: error instanceof Error ? error.message : 'Unknown error',
        type: error instanceof Error ? error.constructor.name : 'Unknown'
      },
      duration
    }

    return NextResponse.json(response, { status: 500 })
  }
}
