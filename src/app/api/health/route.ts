// src/app/api/health/route.ts
import { NextRequest, NextResponse } from 'next/server'

import { debugLog, debugErrorLog, isDebugMode } from '@/lib/debug'
import { 
  testSupabaseConnection
} from '@/lib/supabase-test-utils'
import { 
  runComprehensiveValidation 
} from '@/lib/supabase-validation'

// Basic health check endpoint
export async function GET(_request: NextRequest) {
  const startTime = Date.now()
  const healthCheckId = Math.random().toString(36).substring(2, 15)
  
  if (isDebugMode()) {
    console.group(`🏥 Health Check [${healthCheckId}]`)
  }

  debugLog('Health check started', { 
    healthCheckId, 
    timestamp: new Date().toISOString(),
    url: _request.url,
    userAgent: _request.headers.get('user-agent')
  })

  try {
    // Check environment configuration first
    const isConfigured = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    
    if (!isConfigured) {
      const response = {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        healthCheckId,
        error: 'Configuration Error',
        details: {
          message: 'Supabase environment variables not configured',
          missingVariables: [
            ...(process.env.NEXT_PUBLIC_SUPABASE_URL ? [] : ['NEXT_PUBLIC_SUPABASE_URL']),
            ...(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? [] : ['NEXT_PUBLIC_SUPABASE_ANON_KEY'])
          ],
          configuration: {
            hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
            hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
          }
        },
        duration: Date.now() - startTime
      }

      if (isDebugMode()) {
        console.groupEnd()
      }

      debugErrorLog('Health check failed - configuration error', {
        healthCheckId,
        missingVariables: [
            ...(process.env.NEXT_PUBLIC_SUPABASE_URL ? [] : ['NEXT_PUBLIC_SUPABASE_URL']),
            ...(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? [] : ['NEXT_PUBLIC_SUPABASE_ANON_KEY'])
          ]
      })

      return NextResponse.json(response, { status: 503 })
    }

    // Run basic connection test
    const connectionTest = await testSupabaseConnection()
    
    const response = {
      status: connectionTest.success ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      healthCheckId,
      details: {
        connection: connectionTest,
        configuration: {
          isConfigured: isConfigured,
          hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
          hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        }
      },
      duration: Date.now() - startTime
    }

    if (isDebugMode()) {
      console.groupEnd()
    }

    debugLog('Health check completed', {
      healthCheckId,
      status: response.status,
      duration: `${response.duration}ms`,
      connectionSuccess: connectionTest.success
    })

    return NextResponse.json(response, { 
      status: connectionTest.success ? 200 : 503 
    })

  } catch (error) {
    const duration = Date.now() - startTime
    
    if (isDebugMode()) {
      console.error('❌ Health check failed with exception:', error)
      console.groupEnd()
    }

    debugErrorLog('Health check failed with exception', {
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

// Detailed health check endpoint
export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const healthCheckId = Math.random().toString(36).substring(2, 15)
  
  if (isDebugMode()) {
    console.group(`🏥 Detailed Health Check [${healthCheckId}]`)
  }

  debugLog('Detailed health check started', { 
    healthCheckId, 
    timestamp: new Date().toISOString(),
    url: request.url,
    userAgent: request.headers.get('user-agent')
  })

  try {
    // Check environment configuration first
    const isConfigured = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    
    if (!isConfigured) {
      const response = {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        healthCheckId,
        error: 'Configuration Error',
        details: {
          message: 'Supabase environment variables not configured',
          missingVariables: [
            ...(process.env.NEXT_PUBLIC_SUPABASE_URL ? [] : ['NEXT_PUBLIC_SUPABASE_URL']),
            ...(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? [] : ['NEXT_PUBLIC_SUPABASE_ANON_KEY'])
          ],
          configuration: {
            hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
            hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
          }
        },
        duration: Date.now() - startTime
      }

      if (isDebugMode()) {
        console.groupEnd()
      }

      debugErrorLog('Detailed health check failed - configuration error', {
        healthCheckId,
        missingVariables: [
            ...(process.env.NEXT_PUBLIC_SUPABASE_URL ? [] : ['NEXT_PUBLIC_SUPABASE_URL']),
            ...(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? [] : ['NEXT_PUBLIC_SUPABASE_ANON_KEY'])
          ]
      })

      return NextResponse.json(response, { status: 503 })
    }

    // Run comprehensive validation
    const comprehensiveResult = await runComprehensiveValidation()
    
    const response = {
      status: comprehensiveResult.overallSuccess ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      healthCheckId,
      details: {
        comprehensive: comprehensiveResult,
        configuration: {
          isConfigured: isConfigured,
          hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
          hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        }
      },
      duration: Date.now() - startTime
    }

    if (isDebugMode()) {
      console.groupEnd()
    }

    debugLog('Detailed health check completed', {
      healthCheckId,
      status: response.status,
      duration: `${response.duration}ms`,
      overallSuccess: comprehensiveResult.overallSuccess,
      totalTests: comprehensiveResult.summary.total,
      passedTests: comprehensiveResult.summary.passed
    })

    return NextResponse.json(response, { 
      status: comprehensiveResult.overallSuccess ? 200 : 503 
    })

  } catch (error) {
    const duration = Date.now() - startTime
    
    if (isDebugMode()) {
      console.error('❌ Detailed health check failed with exception:', error)
      console.groupEnd()
    }

    debugErrorLog('Detailed health check failed with exception', {
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
