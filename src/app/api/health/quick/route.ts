// src/app/api/health/quick/route.ts
import { NextRequest, NextResponse } from 'next/server'

import { debugLog, debugErrorLog, isDebugMode } from '@/lib/debug'
import { quickHealthCheck, checkEnvironment } from '@/lib/supabase-test-utils'

// Quick health check endpoint - minimal overhead
export async function GET(_request: NextRequest) {
  const startTime = Date.now()
  const healthCheckId = Math.random().toString(36).substring(2, 15)
  
  if (isDebugMode) {
    console.log(`🏥 Quick Health Check [${healthCheckId}]`)
  }

  debugLog('Quick health check started', { 
    healthCheckId, 
    timestamp: new Date().toISOString()
  })

  try {
    // Check environment first
    const env = checkEnvironment()
    
    if (!env.isConfigured) {
      const response = {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        healthCheckId,
        error: 'Configuration Error',
        details: {
          message: 'Environment variables not configured',
          hasUrl: env.hasUrl,
          hasAnonKey: env.hasAnonKey
        },
        duration: Date.now() - startTime
      }

      debugErrorLog('QUICK_HEALTH_CHECK', 'Quick health check failed - configuration error', {
        healthCheckId,
        hasUrl: env.hasUrl,
        hasAnonKey: env.hasAnonKey
      })

      return NextResponse.json(response, { status: 503 })
    }

    // Run quick health check
    const healthResult = await quickHealthCheck()
    
    const response = {
      status: healthResult.healthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      healthCheckId,
      details: {
        supabase: healthResult,
        environment: env
      },
      duration: Date.now() - startTime
    }

    if (isDebugMode) {
      console.log('Quick health check completed:', {
        status: response.status,
        duration: `${response.duration}ms`,
        healthy: healthResult.healthy
      })
    }

    debugLog('Quick health check completed', {
      healthCheckId,
      status: response.status,
      duration: `${response.duration}ms`,
      healthy: healthResult.healthy
    })

    return NextResponse.json(response, { 
      status: healthResult.healthy ? 200 : 503 
    })

  } catch (error) {
    const duration = Date.now() - startTime
    
    if (isDebugMode) {
      console.error('❌ Quick health check failed with exception:', error)
    }

    debugErrorLog('QUICK_HEALTH_CHECK', 'Quick health check failed with exception', error, {
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
