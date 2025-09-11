# Health Checks Guide

This guide covers the implementation of system health checks.

# 🏥 Health Check Implementation Guide

## Overview

This guide documents the comprehensive health check system implemented for your Next.js application. The system provides multiple levels of health monitoring, from quick checks for load balancers to detailed diagnostics for debugging.

## 🎯 **IMPLEMENTATION COMPLETE**

**Date:** $(date)  
**Status:** ✅ **COMPLETE** - Comprehensive health check system implemented

---

## 🏗️ **System Architecture**

### **1. Basic Health Check Endpoint**

**File:** `src/app/api/health/route.ts`

```typescript
// Basic health check endpoint
export async function GET(request: NextRequest) {
  const startTime = Date.now()
  const healthCheckId = Math.random().toString(36).substring(2, 15)
  
  if (isDebugMode) {
    console.group(`🏥 Health Check [${healthCheckId}]`)
    console.log('Starting health check...')
  }

  debugLog('Health check started', { 
    healthCheckId, 
    timestamp: new Date().toISOString(),
    url: request.url,
    userAgent: request.headers.get('user-agent')
  })

  try {
    // Check environment configuration first
    const config = checkSupabaseConfiguration()
    
    if (!config.isConfigured) {
      const response = {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        healthCheckId,
        error: 'Configuration Error',
        details: {
          message: 'Supabase environment variables not configured',
          missingVariables: config.missingVariables,
          configuration: config.configuration
        },
        duration: Date.now() - startTime
      }

      if (isDebugMode) {
        console.log('❌ Health check failed - configuration error')
        console.groupEnd()
      }

      debugErrorLog('HEALTH_CHECK', 'Health check failed - configuration error', {
        healthCheckId,
        missingVariables: config.missingVariables
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
          isConfigured: config.isConfigured,
          hasUrl: !!config.configuration.url,
          hasAnonKey: !!config.configuration.anonKey
        }
      },
      duration: Date.now() - startTime
    }

    if (isDebugMode) {
      console.log('Health check completed:', {
        status: response.status,
        duration: `${response.duration}ms`,
        connectionSuccess: connectionTest.success
      })
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
    
    if (isDebugMode) {
      console.error('❌ Health check failed with exception:', error)
      console.groupEnd()
    }

    debugErrorLog('HEALTH_CHECK', 'Health check failed with exception', error, {
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
```

**Features:**
- ✅ **Environment Validation** - Checks Supabase configuration
- ✅ **Connection Testing** - Tests basic Supabase connection
- ✅ **Error Handling** - Comprehensive error handling and logging
- ✅ **Debug Integration** - Integrates with existing debug system
- ✅ **Performance Monitoring** - Tracks response times

### **2. Quick Health Check Endpoint**

**File:** `src/app/api/health/quick/route.ts`

```typescript
// Quick health check endpoint - minimal overhead
export async function GET(request: NextRequest) {
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
```

**Features:**
- ✅ **Minimal Overhead** - Fast response for load balancers
- ✅ **Environment Check** - Quick environment validation
- ✅ **Basic Health Check** - Simple Supabase connectivity test
- ✅ **Optimized Performance** - Designed for frequent polling

### **3. Detailed Health Check Endpoint**

**File:** `src/app/api/health/detailed/route.ts`

```typescript
// Detailed health check endpoint with full diagnostics
export async function GET(request: NextRequest) {
  const startTime = Date.now()
  const healthCheckId = Math.random().toString(36).substring(2, 15)
  
  if (isDebugMode) {
    console.group(`🏥 Detailed Health Check [${healthCheckId}]`)
    console.log('Starting detailed health check...')
  }

  debugLog('Detailed health check started', { 
    healthCheckId, 
    timestamp: new Date().toISOString(),
    url: request.url,
    userAgent: request.headers.get('user-agent')
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
          environment: env
        },
        duration: Date.now() - startTime
      }

      if (isDebugMode) {
        console.log('❌ Detailed health check failed - configuration error')
        console.groupEnd()
      }

      debugErrorLog('DETAILED_HEALTH_CHECK', 'Detailed health check failed - configuration error', {
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
      comprehensiveResult.summary.overallSuccess
    
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
          totalTests: enhancedConnectionTest.summary.total + sessionTest.summary.totalTests + comprehensiveResult.summary.totalTests,
          passedTests: enhancedConnectionTest.summary.passed + sessionTest.summary.passedTests + comprehensiveResult.summary.passedTests,
          overallSuccess: allTestsPassed
        }
      },
      duration: Date.now() - startTime
    }

    if (isDebugMode) {
      console.log('Detailed health check completed:', {
        status: response.status,
        duration: `${response.duration}ms`,
        overallSuccess: allTestsPassed,
        totalTests: response.details.summary.totalTests,
        passedTests: response.details.summary.passedTests
      })
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
    
    if (isDebugMode) {
      console.error('❌ Detailed health check failed with exception:', error)
      console.groupEnd()
    }

    debugErrorLog('DETAILED_HEALTH_CHECK', 'Detailed health check failed with exception', error, {
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
```

**Features:**
- ✅ **Comprehensive Testing** - All validation tests combined
- ✅ **Enhanced Diagnostics** - Detailed error information
- ✅ **Performance Metrics** - Full performance monitoring
- ✅ **Debug Information** - Extensive debugging data

### **4. Health Check Utility**

**File:** `src/lib/health-check.ts`

```typescript
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
    if (isDebugMode) {
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
    
    if (isDebugMode) {
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
    
  } catch (error) {
    const duration = Date.now() - startTime
    
    if (isDebugMode) {
      console.error('Health check failed:', error)
    }
    
    debugErrorLog('HEALTH_CHECK', 'Health check failed', error)
    
    return {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      details: {
        error: error instanceof Error ? error.message : 'Unknown error',
        type: error instanceof Error ? error.constructor.name : 'Unknown'
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
```

**Features:**
- ✅ **Simple Interface** - Easy-to-use health check function
- ✅ **Response Formatting** - Ready-to-use Response objects
- ✅ **Error Handling** - Comprehensive error handling
- ✅ **Debug Integration** - Integrates with debug system

### **5. Health Status Page**

**File:** `src/app/health/page.tsx`

```typescript
export default function HealthPage() {
  const [quickHealth, setQuickHealth] = useState<HealthStatus>({ status: 'loading', timestamp: '', healthCheckId: '' })
  const [basicHealth, setBasicHealth] = useState<HealthStatus>({ status: 'loading', timestamp: '', healthCheckId: '' })
  const [detailedHealth, setDetailedHealth] = useState<HealthStatus>({ status: 'loading', timestamp: '', healthCheckId: '' })
  const [isLoading, setIsLoading] = useState(false)
  const [lastChecked, setLastChecked] = useState<Date | null>(null)

  const checkHealth = async (endpoint: string, setter: (status: HealthStatus) => void) => {
    try {
      setter({ status: 'loading', timestamp: '', healthCheckId: '' })
      
      const response = await fetch(`/api/health${endpoint}`)
      const data = await response.json()
      
      setter({
        status: response.ok ? 'healthy' : 'unhealthy',
        timestamp: data.timestamp,
        healthCheckId: data.healthCheckId,
        details: data.details,
        duration: data.duration,
        error: data.error
      })
      
      debugLog(`Health check completed for ${endpoint}`, {
        status: response.ok ? 'healthy' : 'unhealthy',
        duration: data.duration,
        healthCheckId: data.healthCheckId
      })
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      setter({
        status: 'error',
        timestamp: new Date().toISOString(),
        healthCheckId: '',
        error: errorMessage
      })
      
      debugLog(`Health check failed for ${endpoint}`, { error: errorMessage })
    }
  }

  const runAllHealthChecks = async () => {
    setIsLoading(true)
    setLastChecked(new Date())
    
    debugLog('Running all health checks')
    
    // Run all health checks in parallel
    await Promise.all([
      checkHealth('/quick', setQuickHealth),
      checkHealth('', setBasicHealth),
      checkHealth('/detailed', setDetailedHealth)
    ])
    
    setIsLoading(false)
    debugLog('All health checks completed')
  }

  // Auto-refresh every 30 seconds
  useEffect(() => {
    runAllHealthChecks()
    
    const interval = setInterval(() => {
      runAllHealthChecks()
    }, 30000)
    
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            System Health Status
          </h1>
          
          <div className="flex items-center justify-between mb-6">
            <div className="text-sm text-gray-600">
              {lastChecked && (
                <span>Last checked: {lastChecked.toLocaleString()}</span>
              )}
            </div>
            <button
              onClick={runAllHealthChecks}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Checking...' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* Health Status Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Quick Health Check */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Quick Health Check</h2>
              <span className={`px-2 py-1 rounded text-sm ${getStatusColor(quickHealth.status)}`}>
                {getStatusIcon(quickHealth.status)} {quickHealth.status}
              </span>
            </div>
            
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium">Duration:</span>
                <span className="ml-2">{quickHealth.duration ? `${quickHealth.duration}ms` : 'N/A'}</span>
              </div>
              <div>
                <span className="font-medium">Check ID:</span>
                <span className="ml-2 font-mono text-xs">{quickHealth.healthCheckId || 'N/A'}</span>
              </div>
              <div>
                <span className="font-medium">Timestamp:</span>
                <span className="ml-2 text-xs">{quickHealth.timestamp ? new Date(quickHealth.timestamp).toLocaleString() : 'N/A'}</span>
              </div>
            </div>
            
            {quickHealth.error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
                <p className="text-sm text-red-700">{quickHealth.error}</p>
              </div>
            )}
            
            {quickHealth.details && (
              <div className="mt-4">
                <details>
                  <summary className="cursor-pointer font-medium text-sm">View Details</summary>
                  <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto max-h-32">
                    {JSON.stringify(quickHealth.details, null, 2)}
                  </pre>
                </details>
              </div>
            )}
          </div>

          {/* Basic Health Check */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Basic Health Check</h2>
              <span className={`px-2 py-1 rounded text-sm ${getStatusColor(basicHealth.status)}`}>
                {getStatusIcon(basicHealth.status)} {basicHealth.status}
              </span>
            </div>
            
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium">Duration:</span>
                <span className="ml-2">{basicHealth.duration ? `${basicHealth.duration}ms` : 'N/A'}</span>
              </div>
              <div>
                <span className="font-medium">Check ID:</span>
                <span className="ml-2 font-mono text-xs">{basicHealth.healthCheckId || 'N/A'}</span>
              </div>
              <div>
                <span className="font-medium">Timestamp:</span>
                <span className="ml-2 text-xs">{basicHealth.timestamp ? new Date(basicHealth.timestamp).toLocaleString() : 'N/A'}</span>
              </div>
            </div>
            
            {basicHealth.error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
                <p className="text-sm text-red-700">{basicHealth.error}</p>
              </div>
            )}
            
            {basicHealth.details && (
              <div className="mt-4">
                <details>
                  <summary className="cursor-pointer font-medium text-sm">View Details</summary>
                  <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto max-h-32">
                    {JSON.stringify(basicHealth.details, null, 2)}
                  </pre>
                </details>
              </div>
            )}
          </div>

          {/* Detailed Health Check */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Detailed Health Check</h2>
              <span className={`px-2 py-1 rounded text-sm ${getStatusColor(detailedHealth.status)}`}>
                {getStatusIcon(detailedHealth.status)} {detailedHealth.status}
              </span>
            </div>
            
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium">Duration:</span>
                <span className="ml-2">{detailedHealth.duration ? `${detailedHealth.duration}ms` : 'N/A'}</span>
              </div>
              <div>
                <span className="font-medium">Check ID:</span>
                <span className="ml-2 font-mono text-xs">{detailedHealth.healthCheckId || 'N/A'}</span>
              </div>
              <div>
                <span className="font-medium">Timestamp:</span>
                <span className="ml-2 text-xs">{detailedHealth.timestamp ? new Date(detailedHealth.timestamp).toLocaleString() : 'N/A'}</span>
              </div>
            </div>
            
            {detailedHealth.error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
                <p className="text-sm text-red-700">{detailedHealth.error}</p>
              </div>
            )}
            
            {detailedHealth.details && (
              <div className="mt-4">
                <details>
                  <summary className="cursor-pointer font-medium text-sm">View Details</summary>
                  <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto max-h-32">
                    {JSON.stringify(detailedHealth.details, null, 2)}
                  </pre>
                </details>
              </div>
            )}
          </div>
        </div>

        {/* Health Check Endpoints */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Health Check Endpoints</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border rounded-lg p-4">
              <h3 className="font-medium mb-2">Quick Health Check</h3>
              <p className="text-sm text-gray-600 mb-3">
                Minimal overhead health check for basic monitoring.
              </p>
              <div className="space-y-2 text-xs">
                <div><span className="font-medium">Endpoint:</span> <code className="bg-gray-100 px-1 rounded">GET /api/health/quick</code></div>
                <div><span className="font-medium">Use Case:</span> Load balancer health checks</div>
                <div><span className="font-medium">Response Time:</span> ~100-500ms</div>
              </div>
            </div>
            
            <div className="border rounded-lg p-4">
              <h3 className="font-medium mb-2">Basic Health Check</h3>
              <p className="text-sm text-gray-600 mb-3">
                Standard health check with connection testing.
              </p>
              <div className="space-y-2 text-xs">
                <div><span className="font-medium">Endpoint:</span> <code className="bg-gray-100 px-1 rounded">GET /api/health</code></div>
                <div><span className="font-medium">Use Case:</span> Application monitoring</div>
                <div><span className="font-medium">Response Time:</span> ~500-2000ms</div>
              </div>
            </div>
            
            <div className="border rounded-lg p-4">
              <h3 className="font-medium mb-2">Detailed Health Check</h3>
              <p className="text-sm text-gray-600 mb-3">
                Comprehensive health check with full diagnostics.
              </p>
              <div className="space-y-2 text-xs">
                <div><span className="font-medium">Endpoint:</span> <code className="bg-gray-100 px-1 rounded">GET /api/health/detailed</code></div>
                <div><span className="font-medium">Use Case:</span> Debugging and diagnostics</div>
                <div><span className="font-medium">Response Time:</span> ~2000-5000ms</div>
              </div>
            </div>
          </div>
        </div>

        {/* Usage Instructions */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Usage Instructions</h2>
          <ol className="list-decimal list-inside space-y-2 text-gray-700">
            <li>Use <code className="bg-blue-100 px-1 rounded">/api/health/quick</code> for load balancer health checks</li>
            <li>Use <code className="bg-blue-100 px-1 rounded">/api/health</code> for standard application monitoring</li>
            <li>Use <code className="bg-blue-100 px-1 rounded">/api/health/detailed</code> for comprehensive diagnostics</li>
            <li>All endpoints return JSON with status, timestamp, and details</li>
            <li>HTTP status codes: 200 (healthy), 503 (unhealthy), 500 (error)</li>
            <li>Health checks run automatically every 30 seconds on this page</li>
          </ol>
        </div>
      </div>
    </div>
  )
}
```

**Features:**
- ✅ **Real-time Monitoring** - Live health status display
- ✅ **Auto-refresh** - Automatic health check updates
- ✅ **Multiple Endpoints** - Tests all health check endpoints
- ✅ **Visual Status** - Clear visual indicators for health status
- ✅ **Detailed Information** - Expandable details for each check

---

## 🚀 **Usage Examples**

### **1. Basic Health Check (as requested)**

```typescript
// API route for health checks
export async function GET() {
  const connectionTest = await testSupabaseConnection();
  return Response.json({
    status: connectionTest.success ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    details: connectionTest
  });
}
```

### **2. Using Health Check Utility**

```typescript
import { healthCheck, healthCheckWithResponse } from '@/lib/health-check'

// Simple health check
const result = await healthCheck()
console.log('Health status:', result.status)

// Health check with Response object
export async function GET() {
  return await healthCheckWithResponse()
}
```

### **3. Different Health Check Endpoints**

```typescript
// Quick health check for load balancers
const quickResponse = await fetch('/api/health/quick')
const quickData = await quickResponse.json()

// Basic health check for monitoring
const basicResponse = await fetch('/api/health')
const basicData = await basicResponse.json()

// Detailed health check for debugging
const detailedResponse = await fetch('/api/health/detailed')
const detailedData = await detailedResponse.json()
```

### **4. Health Check in Application Code**

```typescript
// In your application
useEffect(() => {
  const checkHealth = async () => {
    try {
      const response = await fetch('/api/health/quick')
      const data = await response.json()
      
      if (data.status === 'healthy') {
        console.log('Application is healthy')
      } else {
        console.error('Application health check failed:', data.details)
      }
    } catch (error) {
      console.error('Health check request failed:', error)
    }
  }
  
  // Check health on app startup
  checkHealth()
  
  // Check health every 5 minutes
  const interval = setInterval(checkHealth, 5 * 60 * 1000)
  
  return () => clearInterval(interval)
}, [])
```

---

## 🔧 **API Reference**

### **Health Check Endpoints**

| Endpoint | Method | Description | Response Time | Use Case |
|----------|--------|-------------|---------------|----------|
| `/api/health/quick` | GET | Quick health check | ~100-500ms | Load balancer health checks |
| `/api/health` | GET | Basic health check | ~500-2000ms | Application monitoring |
| `/api/health/detailed` | GET | Detailed health check | ~2000-5000ms | Debugging and diagnostics |

### **Response Format**

```typescript
interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy'
  timestamp: string
  healthCheckId: string
  details: {
    connection?: any
    configuration?: any
    environment?: any
    // ... other details based on endpoint
  }
  duration: number
  error?: string
}
```

### **HTTP Status Codes**

| Status Code | Description |
|-------------|-------------|
| 200 | Healthy - All checks passed |
| 503 | Unhealthy - Some checks failed |
| 500 | Error - Internal server error |

---

## 🧪 **Testing and Verification**

### **1. Interactive Testing**

Visit `/health` to:
- View real-time health status
- Test all health check endpoints
- Monitor health check performance
- View detailed diagnostic information

### **2. API Testing**

```bash
# Quick health check
curl -X GET http://localhost:3000/api/health/quick

# Basic health check
curl -X GET http://localhost:3000/api/health

# Detailed health check
curl -X GET http://localhost:3000/api/health/detailed
```

### **3. Console Output**

When health checks run, you'll see structured logs like:

```
🏥 Health Check [abc123]
Starting health check...
Health check completed: { status: 'healthy', duration: '1234ms', connectionSuccess: true }
```

---

## 🎉 **Final Status**

### **✅ IMPLEMENTATION COMPLETE**

The comprehensive health check system has been successfully implemented with:

- **Basic Health Check Endpoint** - Standard health monitoring
- **Quick Health Check Endpoint** - Fast checks for load balancers
- **Detailed Health Check Endpoint** - Comprehensive diagnostics
- **Health Check Utility** - Easy-to-use functions for application code
- **Health Status Page** - Interactive monitoring interface
- **Error Handling** - Comprehensive error handling and logging
- **Performance Monitoring** - Response time tracking
- **Debug Integration** - Integrates with existing debug system

**Status: ✅ COMPLETE** 🎉

The health check system is now ready for production use and provides robust monitoring capabilities for your application.

### **Key Benefits**

1. **🏥 Health Monitoring** - Multiple levels of health checking
2. **⚡ Performance Optimized** - Quick checks for load balancers
3. **🔍 Comprehensive Diagnostics** - Detailed health information
4. **📊 Real-time Monitoring** - Live health status display
5. **🛠️ Easy Integration** - Simple functions for application code
6. **📱 Interactive Interface** - User-friendly monitoring page
7. **🧪 Testing Support** - Comprehensive testing and verification tools
8. **📚 Documentation** - Complete usage guide and examples

The health check system provides the foundation for robust monitoring throughout the application, ensuring that your system health is continuously monitored and providing clear feedback when issues arise.
