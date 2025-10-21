// src/app/api/health/detailed/route.ts
import { NextRequest, NextResponse } from 'next/server'

import { debugLog, debugErrorLog, isDebugMode } from '@/lib/debug'
import { 
  testSupabaseConnectionEnhanced,
  testSessionCreation,
  checkEnvironment 
} from '@/lib/supabase-test-utils'
import { 
  runComprehensiveValidation 
} from '@/lib/supabase-validation'

// Detailed health check endpoint with full diagnostics
export async function GET(_request: NextRequest) {
  const startTime = Date.now()
  const healthCheckId = Math.random().toString(36).substring(2, 15)
  
  if (isDebugMode()) {
    console.group(`🏥 Detailed Health Check [${healthCheckId}]`)
  }

  debugLog('Detailed health check started', { 
    healthCheckId, 
    timestamp: new Date().toISOString(),
    url: _request.url,
    userAgent: _request.headers.get('user-agent')
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
          environment: env
        },
        duration: Date.now() - startTime
      }

      if (isDebugMode()) {
        console.groupEnd()
      }

      debugErrorLog('Detailed health check failed - configuration error', {
        healthCheckId,
        environment: env
      })

      return NextResponse.json(response, { status: 503 })
    }

    // Run enhanced connection test
    const enhancedConnectionTest = await testSupabaseConnectionEnhanced()
    
    // Run session creation test
    const sessionTest = await testSessionCreation('health-check-table')
    
    // Run comprehensive validation
    const comprehensiveResult = await runComprehensiveValidation()
    
    // Calculate overall health
    const allTestsPassed = 
      enhancedConnectionTest.success && 
      sessionTest.success && 
      comprehensiveResult.overallSuccess
    
    const response = {
      status: allTestsPassed ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      healthCheckId,
      details: {
        environment: env,
        enhancedConnection: enhancedConnectionTest,
        sessionTest: sessionTest,
        comprehensive: comprehensiveResult,
        summary: {
          totalTests: 3 + comprehensiveResult.tests.length,
          passedTests: (enhancedConnectionTest.success ? 1 : 0) + (sessionTest.success ? 1 : 0) + comprehensiveResult.tests.filter(t => t.success).length,
          overallSuccess: allTestsPassed
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
      overallSuccess: allTestsPassed,
      totalTests: response.details.summary.totalTests,
      passedTests: response.details.summary.passedTests
    })

    return NextResponse.json(response, { 
      status: allTestsPassed ? 200 : 503 
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
