# Debugging Guide

This guide covers debugging strategies and implementation.


## Comprehensive Strategies

# 🔍 Comprehensive Debugging and Logging Implementation Guide

## Overview

This guide documents the comprehensive debugging and logging system implemented to identify future issues quickly. The system provides detailed request/response logging, performance monitoring, error tracking, and environment-based configuration.

## 🎯 **IMPLEMENTATION COMPLETE**

**Date:** $(date)  
**Status:** ✅ **COMPLETE** - Comprehensive debugging and logging system implemented

---

## 🏗️ **System Architecture**

### **1. Enhanced Supabase Client with Request/Response Logging**

**File:** `src/lib/supabase.ts`

```typescript
// Enhanced fetch function with comprehensive logging
const createDebugFetch = () => {
  return async (input: RequestInfo | URL, options: RequestInit = {}) => {
    const url = typeof input === 'string' ? input : input.toString()
    const requestId = Math.random().toString(36).substring(2, 15)
    const startTime = Date.now()
    
    // Log request details
    console.group(`🔵 Supabase Request [${requestId}]`)
    console.log('📤 URL:', url)
    console.log('📤 Method:', options.method || 'GET')
    console.log('📤 Headers:', options.headers)
    console.log('📤 Body:', options.body)
    console.log('📤 Timestamp:', new Date().toISOString())
    console.groupEnd()
    
    try {
      const response = await fetch(input, options)
      const endTime = Date.now()
      const duration = endTime - startTime
      
      // Log response details
      console.group(`🟢 Supabase Response [${requestId}]`)
      console.log('📥 Status:', response.status, response.statusText)
      console.log('📥 Headers:', Object.fromEntries(response.headers.entries()))
      console.log('📥 Duration:', `${duration}ms`)
      console.log('📥 Body:', responseData)
      console.groupEnd()
      
      return response
      
    } catch (error) {
      // Log error details
      console.group(`🔴 Supabase Network Error [${requestId}]`)
      console.error('❌ Error:', error)
      console.error('❌ Duration:', `${duration}ms`)
      console.groupEnd()
      
      throw error
    }
  }
}

// Create Supabase client with enhanced debugging
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    fetch: createDebugFetch()
  }
})
```

**Features:**
- ✅ **Request Logging** - Detailed request information with unique IDs
- ✅ **Response Logging** - Complete response details including timing
- ✅ **Error Logging** - Network error tracking with context
- ✅ **Performance Monitoring** - Request duration tracking
- ✅ **Structured Logging** - Grouped console output for readability

### **2. Enhanced Session Management Hook with Comprehensive Debugging**

**File:** `src/hooks/useSessionManagement.ts`

```typescript
const createSession = async (tableId: string) => {
  const operationId = Math.random().toString(36).substring(2, 15)
  const startTime = Date.now()
  
  // Start performance monitoring
  const perfId = startPerformanceMonitoring('SESSION_CREATION', {
    tableId,
    operationId,
    timestamp: new Date().toISOString()
  })
  
  console.group(`🎯 Session Creation [${operationId}]`)
  console.log('📋 Operation Details:', {
    tableId,
    timestamp: new Date().toISOString(),
    userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'Server',
    url: typeof window !== 'undefined' ? window.location.href : 'Server'
  })
  
  debug.info('Session creation started', { tableId, operationId })
  
  try {
    // Step-by-step logging with timing
    console.log('🔍 Step 1: Starting session creation for table:', tableId)
    
    console.log('🔍 Step 2: Running comprehensive validation...')
    const validationStartTime = Date.now()
    const { user, tableInfo } = await validateSessionCreationComprehensive(tableId)
    const validationDuration = Date.now() - validationStartTime
    
    console.log('✅ Step 2 Complete: Validation passed', {
      duration: `${validationDuration}ms`,
      user: { id: user.id, email: user.email },
      table: { id: tableInfo.id, number: tableInfo.number }
    })
    
    // Database operation with detailed logging
    console.log('🔍 Step 3: Creating session in database...')
    const dbStartTime = Date.now()
    const { data: session, error } = await supabase.from('sessions').insert(sessionData).select().single()
    const dbDuration = Date.now() - dbStartTime
    
    console.log('📊 Database Operation:', {
      duration: `${dbDuration}ms`,
      success: !error,
      error: error ? error.message : null
    })
    
    // Navigation with error handling
    console.log('🔍 Step 4: Navigating to menu page...')
    const navStartTime = Date.now()
    router.push(`/menu?sessionId=${session.id}`)
    const navDuration = Date.now() - navStartTime
    
    console.log('✅ Step 4 Complete: Navigation initiated', {
      duration: `${navDuration}ms`,
      targetUrl: `/menu?sessionId=${session.id}`
    })
    
    // End performance monitoring
    endPerformanceMonitoring(perfId)
    debug.info('Session creation completed successfully', { 
      operationId, 
      sessionId: session.id, 
      tableId: session.table_id 
    })
    
    return session
    
  } catch (error) {
    // End performance monitoring and track error
    endPerformanceMonitoring(perfId)
    trackError(error, { 
      operation: 'SESSION_CREATION', 
      tableId, 
      operationId 
    })
    
    throw error
  }
}
```

**Features:**
- ✅ **Step-by-Step Logging** - Detailed operation breakdown
- ✅ **Performance Monitoring** - Timing for each operation step
- ✅ **Error Tracking** - Comprehensive error logging with context
- ✅ **Debug Integration** - Uses debug utilities for structured logging
- ✅ **Operation IDs** - Unique identifiers for tracking operations

### **3. API Route Request/Response Interceptors**

**File:** `src/lib/debug/api-logger.ts`

```typescript
// Enhanced API request logging
export function logApiRequest(request: NextRequest, context?: Record<string, unknown>): ApiLogContext {
  const requestId = Math.random().toString(36).substring(2, 15)
  const timestamp = new Date().toISOString()
  
  const logContext: ApiLogContext = {
    requestId,
    method: request.method,
    url: request.url,
    pathname: request.nextUrl.pathname,
    searchParams: request.nextUrl.searchParams,
    headers: Object.fromEntries(request.headers.entries()),
    timestamp,
    userAgent: request.headers.get('user-agent') || undefined,
    ip: request.ip || request.headers.get('x-forwarded-for') || undefined
  }

  console.group(`🔵 API Request [${requestId}]`)
  console.log('📤 Method:', logContext.method)
  console.log('📤 URL:', logContext.url)
  console.log('📤 Headers:', logContext.headers)
  console.log('📤 IP:', logContext.ip)
  console.log('📤 User Agent:', logContext.userAgent)
  console.groupEnd()
  
  return logContext
}

// API route wrapper with comprehensive logging
export function withApiLogging<T extends any[]>(
  handler: (...args: T) => Promise<NextResponse>
) {
  return async (...args: T): Promise<NextResponse> => {
    const request = args[0] as NextRequest
    const startTime = Date.now()
    const logContext = logApiRequest(request)
    
    try {
      const response = await handler(...args)
      let responseBody: unknown
      
      try {
        const responseClone = response.clone()
        responseBody = await responseClone.json()
      } catch (error) {
        responseBody = '[Non-JSON response or body not available]'
      }
      
      logApiResponse(logContext.requestId, response, startTime, responseBody)
      return response
      
    } catch (error) {
      logApiError(logContext.requestId, error, startTime)
      return NextResponse.json(
        { 
          error: 'Internal server error',
          requestId: logContext.requestId,
          timestamp: new Date().toISOString()
        },
        { status: 500 }
      )
    }
  }
}
```

**Features:**
- ✅ **Request Interception** - Detailed request logging with context
- ✅ **Response Interception** - Complete response logging
- ✅ **Error Handling** - Comprehensive error logging
- ✅ **Performance Monitoring** - Request duration tracking
- ✅ **Wrapper Functions** - Easy integration with existing API routes

### **4. Debugging Utilities and Helpers**

**File:** `src/lib/debug/debug-utils.ts`

```typescript
// Performance monitoring
export function startPerformanceMonitoring(
  operation: string,
  metadata?: Record<string, unknown>
): string {
  const operationId = Math.random().toString(36).substring(2, 15)
  const startTime = Date.now()
  
  const metrics: PerformanceMetrics = {
    operation,
    startTime,
    metadata
  }
  
  performanceMetrics.set(operationId, metrics)
  
  debugLog('debug', `Performance monitoring started: ${operation}`, {
    operationId,
    startTime,
    metadata
  })
  
  return operationId
}

export function endPerformanceMonitoring(operationId: string): PerformanceMetrics | null {
  const metrics = performanceMetrics.get(operationId)
  if (!metrics) return null
  
  const endTime = Date.now()
  const duration = endTime - metrics.startTime
  
  const completedMetrics: PerformanceMetrics = {
    ...metrics,
    endTime,
    duration
  }
  
  performanceMetrics.set(operationId, completedMetrics)
  
  debugLog('info', `Performance monitoring completed: ${metrics.operation}`, {
    operationId,
    duration: `${duration}ms`,
    startTime: metrics.startTime,
    endTime,
    metadata: metrics.metadata
  })
  
  // Log performance warnings
  if (duration > 5000) {
    debugLog('warn', `Slow operation detected: ${metrics.operation}`, {
      operationId,
      duration: `${duration}ms`,
      threshold: '5000ms'
    })
  }
  
  return completedMetrics
}

// Error tracking and analysis
export function trackError(
  error: unknown,
  context?: Record<string, unknown>,
  operationId?: string
): void {
  const errorId = Math.random().toString(36).substring(2, 15)
  const timestamp = new Date().toISOString()
  
  const errorData = {
    errorId,
    timestamp,
    error: error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: debugConfig.includeStackTraces ? error.stack : undefined
    } : error,
    context,
    operationId,
    userAgent: debugConfig.includeUserAgent && typeof window !== 'undefined' 
      ? window.navigator.userAgent 
      : undefined,
    url: debugConfig.includeUrl && typeof window !== 'undefined' 
      ? window.location.href 
      : undefined
  }
  
  debugLog('error', 'Error tracked', errorData, operationId)
  
  // Store error for analysis
  if (typeof window !== 'undefined') {
    const errors = JSON.parse(localStorage.getItem('debug_errors') || '[]')
    errors.push(errorData)
    
    // Keep only last 50 errors
    if (errors.length > 50) {
      errors.splice(0, errors.length - 50)
    }
    
    localStorage.setItem('debug_errors', JSON.stringify(errors))
  }
}
```

**Features:**
- ✅ **Performance Monitoring** - Operation timing and metrics
- ✅ **Error Tracking** - Comprehensive error logging and storage
- ✅ **Memory Monitoring** - JavaScript heap usage tracking
- ✅ **Network Monitoring** - Connection information logging
- ✅ **Debug Context** - Operation context management
- ✅ **Local Storage** - Error persistence for analysis

### **5. Environment-Based Debug Configuration**

**File:** `src/lib/debug/debug-config.ts`

```typescript
// Environment-specific debug configurations
const ENVIRONMENT_CONFIGS: EnvironmentDebugConfig = {
  development: {
    enabled: true,
    level: 'debug',
    includeStackTraces: true,
    includeTimestamps: true,
    includeUserAgent: true,
    includeUrl: true,
    maxLogLength: 2000,
    logToConsole: true,
    logToStorage: true,
    logToRemote: false,
    performanceMonitoring: true,
    errorTracking: true,
    memoryMonitoring: true,
    networkMonitoring: true
  },
  production: {
    enabled: process.env.NEXT_PUBLIC_DEBUG === 'true',
    level: 'error',
    includeStackTraces: false,
    includeTimestamps: true,
    includeUserAgent: false,
    includeUrl: false,
    maxLogLength: 500,
    logToConsole: false,
    logToStorage: false,
    logToRemote: true,
    remoteEndpoint: process.env.NEXT_PUBLIC_DEBUG_ENDPOINT,
    performanceMonitoring: true,
    errorTracking: true,
    memoryMonitoring: false,
    networkMonitoring: false
  },
  test: {
    enabled: false,
    level: 'error',
    includeStackTraces: false,
    includeTimestamps: false,
    includeUserAgent: false,
    includeUrl: false,
    maxLogLength: 100,
    logToConsole: false,
    logToStorage: false,
    logToRemote: false,
    performanceMonitoring: false,
    errorTracking: false,
    memoryMonitoring: false,
    networkMonitoring: false
  }
}

// Get debug configuration for current environment
export function getDebugConfig(): DebugConfig {
  const environment = getCurrentEnvironment()
  const baseConfig = ENVIRONMENT_CONFIGS[environment]
  
  // Override with environment variables if present
  const config: DebugConfig = {
    ...baseConfig,
    enabled: process.env.NEXT_PUBLIC_DEBUG === 'true' || baseConfig.enabled,
    level: (process.env.NEXT_PUBLIC_DEBUG_LEVEL as DebugConfig['level']) || baseConfig.level,
    // ... other overrides
  }
  
  return config
}
```

**Features:**
- ✅ **Environment-Specific Configs** - Different settings for dev/prod/test
- ✅ **Environment Variable Overrides** - Runtime configuration
- ✅ **Feature Flags** - Granular control over debug features
- ✅ **Configuration Validation** - Ensures valid debug settings
- ✅ **Runtime Updates** - Dynamic configuration changes

---

## 🚀 **Usage Examples**

### **1. Basic Debug Logging**

```typescript
import { debug, trackError, startPerformanceMonitoring, endPerformanceMonitoring } from '@/lib/debug'

// Basic logging
debug.info('Operation started', { userId: '123', tableId: 'table-1' })
debug.warn('Slow operation detected', { duration: '3000ms' })
debug.error('Operation failed', { error: 'Database connection lost' })

// Error tracking
try {
  await riskyOperation()
} catch (error) {
  trackError(error, { operation: 'riskyOperation', userId: '123' })
}

// Performance monitoring
const perfId = startPerformanceMonitoring('DATABASE_QUERY', { table: 'sessions' })
try {
  const result = await databaseQuery()
  endPerformanceMonitoring(perfId)
  return result
} catch (error) {
  endPerformanceMonitoring(perfId)
  throw error
}
```

### **2. API Route Integration**

```typescript
import { withApiDebugging, logDatabaseOperation, logAuthentication } from '@/lib/debug'

// Wrap API route with debugging
export const GET = withApiDebugging(async (request: NextRequest) => {
  // Log authentication
  logAuthentication('GET_SESSIONS', 'service_role', true)
  
  // Log database operation
  const result = await getAllSessionsWithServiceRole()
  
  if (result.error) {
    logDatabaseOperation('SELECT_ALL_SESSIONS', 'sessions', undefined, result.error)
    return NextResponse.json({ error: result.error.message }, { status: 500 })
  }
  
  logDatabaseOperation('SELECT_ALL_SESSIONS', 'sessions', { count: result.data.length })
  return NextResponse.json({ success: true, data: result.data })
}, 'GET_SESSIONS')
```

### **3. Session Management Integration**

```typescript
import { useSessionManagement } from '@/hooks/useSessionManagement'

function SessionComponent() {
  const { isLoading, error, session, createSession, clearError } = useSessionManagement()
  
  const handleCreateSession = async (tableId: string) => {
    try {
      // The hook automatically includes comprehensive debugging
      const newSession = await createSession(tableId)
      console.log('Session created with full debugging:', newSession)
    } catch (error) {
      // Error is automatically tracked and logged
      console.error('Session creation failed with detailed logs:', error)
    }
  }
  
  return (
    <div>
      {isLoading && <div>Creating session...</div>}
      {error && (
        <div>
          <p>Error: {error}</p>
          <button onClick={clearError}>Clear Error</button>
        </div>
      )}
      <button onClick={() => handleCreateSession('table-123')}>
        Create Session
      </button>
    </div>
  )
}
```

### **4. Environment Configuration**

```typescript
// .env.local
NEXT_PUBLIC_DEBUG=true
NEXT_PUBLIC_DEBUG_LEVEL=debug
NEXT_PUBLIC_DEBUG_STACK_TRACES=true
NEXT_PUBLIC_DEBUG_PERFORMANCE=true
NEXT_PUBLIC_DEBUG_ERRORS=true
NEXT_PUBLIC_DEBUG_MEMORY=true
NEXT_PUBLIC_DEBUG_NETWORK=true

// Runtime configuration
import { configureDebug, applyDebugPreset } from '@/lib/debug'

// Apply preset
applyDebugPreset('VERBOSE')

// Or configure manually
configureDebug({
  enabled: true,
  level: 'debug',
  performanceMonitoring: true,
  errorTracking: true,
  memoryMonitoring: true
})
```

---

## 🔧 **Configuration Options**

### **Environment Variables**

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_DEBUG` | Enable/disable debugging | `false` |
| `NEXT_PUBLIC_DEBUG_LEVEL` | Log level (error/warn/info/debug) | `error` |
| `NEXT_PUBLIC_DEBUG_STACK_TRACES` | Include stack traces | `false` |
| `NEXT_PUBLIC_DEBUG_TIMESTAMPS` | Include timestamps | `true` |
| `NEXT_PUBLIC_DEBUG_USER_AGENT` | Include user agent | `false` |
| `NEXT_PUBLIC_DEBUG_URL` | Include URL | `false` |
| `NEXT_PUBLIC_DEBUG_MAX_LENGTH` | Max log length | `1000` |
| `NEXT_PUBLIC_DEBUG_CONSOLE` | Log to console | `true` |
| `NEXT_PUBLIC_DEBUG_STORAGE` | Log to localStorage | `false` |
| `NEXT_PUBLIC_DEBUG_REMOTE` | Log to remote endpoint | `false` |
| `NEXT_PUBLIC_DEBUG_ENDPOINT` | Remote logging endpoint | - |
| `NEXT_PUBLIC_DEBUG_PERFORMANCE` | Enable performance monitoring | `true` |
| `NEXT_PUBLIC_DEBUG_ERRORS` | Enable error tracking | `true` |
| `NEXT_PUBLIC_DEBUG_MEMORY` | Enable memory monitoring | `false` |
| `NEXT_PUBLIC_DEBUG_NETWORK` | Enable network monitoring | `false` |

### **Debug Presets**

```typescript
import { applyDebugPreset, DEBUG_PRESETS } from '@/lib/debug'

// Available presets
applyDebugPreset('MINIMAL')    // Minimal logging
applyDebugPreset('VERBOSE')    // Maximum logging
applyDebugPreset('PRODUCTION') // Production-safe logging
```

---

## 📊 **Performance Monitoring**

### **Automatic Performance Tracking**

The system automatically tracks:
- ✅ **Operation Duration** - Time taken for each operation
- ✅ **Database Queries** - Supabase request/response timing
- ✅ **API Routes** - Request processing time
- ✅ **Session Operations** - Creation and join timing
- ✅ **Navigation** - Route transition timing

### **Performance Warnings**

```typescript
// Automatic warnings for slow operations
if (duration > 5000) {
  console.warn('⚠️ Slow operation detected:', {
    operation: 'SESSION_CREATION',
    duration: '6000ms',
    threshold: '5000ms'
  })
}
```

### **Performance Metrics**

```typescript
import { getAllPerformanceMetrics, getPerformanceMetrics } from '@/lib/debug'

// Get all performance metrics
const allMetrics = getAllPerformanceMetrics()

// Get specific operation metrics
const sessionMetrics = getPerformanceMetrics('session-creation-123')

// Example metrics structure
{
  operation: 'SESSION_CREATION',
  startTime: 1703123456789,
  endTime: 1703123457890,
  duration: 1101,
  metadata: {
    tableId: 'table-123',
    operationId: 'op-456'
  }
}
```

---

## 🛡️ **Error Tracking**

### **Automatic Error Tracking**

The system automatically tracks:
- ✅ **Supabase Errors** - Database operation errors
- ✅ **Network Errors** - Connection and timeout errors
- ✅ **Validation Errors** - Input validation failures
- ✅ **Authentication Errors** - Auth-related issues
- ✅ **Navigation Errors** - Route transition failures

### **Error Storage and Analysis**

```typescript
import { getTrackedErrors, clearTrackedErrors } from '@/lib/debug'

// Get all tracked errors
const errors = getTrackedErrors()

// Example error structure
{
  errorId: 'err-123',
  timestamp: '2023-12-21T10:30:00.000Z',
  error: {
    name: 'SupabaseError',
    message: 'Permission denied',
    stack: '...'
  },
  context: {
    operation: 'SESSION_CREATION',
    tableId: 'table-123'
  },
  operationId: 'op-456',
  userAgent: 'Mozilla/5.0...',
  url: 'https://app.example.com/sessions'
}

// Clear tracked errors
clearTrackedErrors()
```

---

## 🔍 **Debugging Best Practices**

### **1. Use Structured Logging**

```typescript
// ✅ Good: Structured logging with context
debug.info('User action performed', {
  action: 'CREATE_SESSION',
  userId: user.id,
  tableId: tableId,
  timestamp: new Date().toISOString()
})

// ❌ Bad: Unstructured logging
console.log('User did something')
```

### **2. Include Operation Context**

```typescript
// ✅ Good: Include operation context
const operationId = createDebugContext('SESSION_CREATION', { tableId })
debug.info('Starting session creation', { operationId })

// ❌ Bad: No context
debug.info('Starting operation')
```

### **3. Track Performance for Critical Operations**

```typescript
// ✅ Good: Performance monitoring
const perfId = startPerformanceMonitoring('DATABASE_QUERY')
try {
  const result = await databaseQuery()
  endPerformanceMonitoring(perfId)
  return result
} catch (error) {
  endPerformanceMonitoring(perfId)
  throw error
}

// ❌ Bad: No performance tracking
const result = await databaseQuery()
return result
```

### **4. Use Appropriate Log Levels**

```typescript
// ✅ Good: Appropriate log levels
debug.error('Critical error occurred', error)      // Errors
debug.warn('Slow operation detected', { duration }) // Warnings
debug.info('Operation completed', { result })       // Information
debug.log('Debug information', { details })         // Debug details

// ❌ Bad: Wrong log levels
debug.error('Operation completed successfully')     // Not an error
debug.info('Critical system failure')               // Should be error
```

### **5. Include Error Context**

```typescript
// ✅ Good: Rich error context
trackError(error, {
  operation: 'SESSION_CREATION',
  tableId: 'table-123',
  userId: user.id,
  timestamp: new Date().toISOString(),
  userAgent: navigator.userAgent,
  url: window.location.href
})

// ❌ Bad: Minimal error context
trackError(error)
```

---

## 🧪 **Testing and Verification**

### **1. Debug Configuration Testing**

```typescript
import { getDebugConfig, isDebugEnabled, DEBUG_FEATURES } from '@/lib/debug'

// Test debug configuration
const config = getDebugConfig()
console.log('Debug config:', config)

// Test feature flags
console.log('Debug enabled:', isDebugEnabled())
console.log('Performance monitoring:', DEBUG_FEATURES.PERFORMANCE_MONITORING())
console.log('Error tracking:', DEBUG_FEATURES.ERROR_TRACKING())
```

### **2. Performance Monitoring Testing**

```typescript
import { startPerformanceMonitoring, endPerformanceMonitoring } from '@/lib/debug'

// Test performance monitoring
const perfId = startPerformanceMonitoring('TEST_OPERATION')
await new Promise(resolve => setTimeout(resolve, 1000)) // Simulate work
const metrics = endPerformanceMonitoring(perfId)

console.log('Performance metrics:', metrics)
// Expected: { operation: 'TEST_OPERATION', duration: ~1000, ... }
```

### **3. Error Tracking Testing**

```typescript
import { trackError, getTrackedErrors } from '@/lib/debug'

// Test error tracking
const testError = new Error('Test error')
trackError(testError, { test: true })

const errors = getTrackedErrors()
console.log('Tracked errors:', errors)
// Expected: Array with test error
```

---

## 🎉 **Final Status**

### **✅ IMPLEMENTATION COMPLETE**

The comprehensive debugging and logging system has been successfully implemented with:

- **Enhanced Supabase Client** with detailed request/response logging
- **Comprehensive Session Management** with step-by-step debugging
- **API Route Interceptors** with request/response logging
- **Performance Monitoring** with timing and metrics
- **Error Tracking** with context and storage
- **Environment-Based Configuration** with flexible settings
- **Debug Utilities** with structured logging
- **Memory and Network Monitoring** for system health

**Status: ✅ COMPLETE** 🎉

The debugging system is now ready for production use and provides comprehensive visibility into application behavior, performance, and errors. This will significantly help identify and resolve future issues quickly.

### **Key Benefits**

1. **🔍 Comprehensive Visibility** - Complete request/response logging
2. **⏱️ Performance Monitoring** - Operation timing and metrics
3. **🛡️ Error Tracking** - Detailed error logging with context
4. **🔧 Flexible Configuration** - Environment-based settings
5. **📊 Analytics Ready** - Structured data for analysis
6. **🚀 Production Safe** - Configurable for different environments
7. **🧪 Testing Support** - Debug utilities for development
8. **📱 Real-time Monitoring** - Live performance and error tracking

The system provides the foundation for identifying and resolving issues quickly, improving application reliability and performance.

## Debug Mode Implementation

# 🔍 Debug Mode Implementation Guide

## Overview

This guide documents the simple debug mode implementation that provides easy-to-use debugging functionality throughout the application. The debug mode automatically detects the environment and provides structured logging with minimal setup.

## 🎯 **IMPLEMENTATION COMPLETE**

**Date:** $(date)  
**Status:** ✅ **COMPLETE** - Simple debug mode with comprehensive logging implemented

---

## 🏗️ **System Architecture**

### **1. Simple Debug Mode Interface**

**File:** `src/lib/debug/debug-mode.ts`

```typescript
// Simple debug mode check
export const isDebugMode = process.env.NODE_ENV === 'development' || 
                          process.env.NEXT_PUBLIC_DEBUG === 'true' ||
                          isDebugEnabled()

// Enhanced debug log function with automatic context
export function debugLog(message: string, data?: unknown): void {
  if (!isDebugMode) return
  
  // Use the comprehensive debug system
  debug.log('debug', message, data)
}

// Session-specific debug logging
export function debugSessionLog(
  operation: string,
  message: string,
  data?: unknown
): void {
  if (!isDebugMode) return
  
  const context = {
    operation,
    timestamp: new Date().toISOString(),
    ...(data && { data })
  }
  
  debug.log('debug', `[SESSION] ${message}`, context)
}

// API-specific debug logging
export function debugApiLog(
  endpoint: string,
  method: string,
  message: string,
  data?: unknown
): void {
  if (!isDebugMode) return
  
  const context = {
    endpoint,
    method,
    timestamp: new Date().toISOString(),
    ...(data && { data })
  }
  
  debug.log('debug', `[API] ${message}`, context)
}

// Database-specific debug logging
export function debugDbLog(
  operation: string,
  table: string,
  message: string,
  data?: unknown
): void {
  if (!isDebugMode) return
  
  const context = {
    operation,
    table,
    timestamp: new Date().toISOString(),
    ...(data && { data })
  }
  
  debug.log('debug', `[DATABASE] ${message}`, context)
}

// Error-specific debug logging
export function debugErrorLog(
  operation: string,
  message: string,
  error: unknown,
  data?: unknown
): void {
  if (!isDebugMode) return
  
  const context = {
    operation,
    error: error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack
    } : error,
    timestamp: new Date().toISOString(),
    ...(data && { data })
  }
  
  debug.error(`[ERROR] ${message}`, context)
}
```

**Features:**
- ✅ **Automatic Environment Detection** - Enabled in development, configurable in production
- ✅ **Simple Interface** - Easy-to-use functions with minimal setup
- ✅ **Specialized Loggers** - Different loggers for different operation types
- ✅ **Structured Logging** - Consistent format with timestamps and context
- ✅ **Performance Optimized** - No-op when debug mode is disabled

### **2. Enhanced Session Management Integration**

**File:** `src/hooks/useSessionManagement.ts`

```typescript
// Debug and performance monitoring imports
import { 
  startPerformanceMonitoring, 
  endPerformanceMonitoring, 
  trackError,
  debug as debugUtils,
  debugLog as simpleDebugLog,
  debugSessionLog,
  debugErrorLog,
  debugValidationLog,
  debugNavLog,
  debugDbLog,
  isDebugMode
} from '@/lib/debug'

const createSession = async (tableId: string) => {
  const operationId = Math.random().toString(36).substring(2, 15)
  const startTime = Date.now()
  
  // Start performance monitoring
  const perfId = startPerformanceMonitoring('SESSION_CREATION', {
    tableId,
    operationId,
    timestamp: new Date().toISOString()
  })
  
  console.group(`🎯 Session Creation [${operationId}]`)
  console.log('📋 Operation Details:', {
    tableId,
    timestamp: new Date().toISOString(),
    userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'Server',
    url: typeof window !== 'undefined' ? window.location.href : 'Server'
  })
  
  debugUtils.info('Session creation started', { tableId, operationId })
  debugSessionLog('CREATE_SESSION', 'Session creation started', { tableId, operationId })
  
  setState({ isLoading: true, error: null, session: null })
  
  try {
    console.log('🔍 Step 1: Starting session creation for table:', tableId)
    simpleDebugLog('Step 1: Starting session creation for table', { tableId })
    
    // Validate everything before attempting creation using comprehensive validation
    console.log('🔍 Step 2: Running comprehensive validation...')
    debugValidationLog('COMPREHENSIVE_VALIDATION', 'Running comprehensive validation', { tableId })
    const validationStartTime = Date.now()
    
    const { user, tableInfo } = await validateSessionCreationComprehensive(tableId)
    
    const validationDuration = Date.now() - validationStartTime
    console.log('✅ Step 2 Complete: Validation passed', {
      duration: `${validationDuration}ms`,
      user: { id: user.id, email: user.email },
      table: { id: tableInfo.id, number: tableInfo.number }
    })
    debugValidationLog('COMPREHENSIVE_VALIDATION', 'Validation passed', {
      duration: `${validationDuration}ms`,
      user: { id: user.id, email: user.email },
      table: { id: tableInfo.id, number: tableInfo.number }
    })
    
    // Create session with proper user context
    console.log('🔍 Step 3: Creating session in database...')
    debugDbLog('INSERT', 'sessions', 'Creating session in database', { tableId, userId: user.id })
    const dbStartTime = Date.now()
    
    const sessionData = {
      table_id: tableId,
      created_by: user.id,
      status: 'active',
      started_at: new Date().toISOString(),
      started_by_name: user.email || 'Unknown User'
    }
    
    console.log('📤 Session Data:', sessionData)
    simpleDebugLog('Session data prepared', sessionData)
    
    const { data: session, error } = await supabase
      .from('sessions')
      .insert(sessionData)
      .select()
      .single()

    const dbDuration = Date.now() - dbStartTime
    console.log('📊 Database Operation:', {
      duration: `${dbDuration}ms`,
      success: !error,
      error: error ? error.message : null
    })
    debugDbLog('INSERT', 'sessions', 'Database operation completed', {
      duration: `${dbDuration}ms`,
      success: !error,
      error: error ? error.message : null
    })

    if (error) {
      console.error('❌ Step 3 Failed: Supabase error during session creation:', {
        error,
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      })
      debugErrorLog('CREATE_SESSION', 'Supabase error during session creation', error, {
        tableId,
        userId: user.id,
        sessionData
      })
      throw new AppError({
        message: handleSupabaseError(error, 'session creation'),
        code: 'SESSION_CREATION_ERROR',
        originalError: error
      })
    }

    if (!session || !session.id) {
      console.error('❌ Step 3 Failed: Invalid session response:', session)
      debugErrorLog('CREATE_SESSION', 'Invalid session response', new Error('No session data returned'), {
        tableId,
        userId: user.id,
        session
      })
      throw new AppError({
        message: 'Session was created but no valid session data was returned',
        code: 'INVALID_SESSION_RESPONSE',
        originalError: session
      })
    }

    console.log('✅ Step 3 Complete: Session created successfully:', {
      sessionId: session.id,
      tableId: session.table_id,
      createdBy: session.created_by,
      status: session.status
    })
    debugSessionLog('CREATE_SESSION', 'Session created successfully', {
      sessionId: session.id,
      tableId: session.table_id,
      createdBy: session.created_by,
      status: session.status
    })
    
    setState({ isLoading: false, error: null, session })
    
    // Navigate to menu page
    console.log('🔍 Step 4: Navigating to menu page...')
    debugNavLog('session-creation', 'menu', 'Navigating to menu page', { sessionId: session.id })
    const navStartTime = Date.now()
    
    try {
      router.push(`/menu?sessionId=${session.id}`)
      const navDuration = Date.now() - navStartTime
      console.log('✅ Step 4 Complete: Navigation initiated', {
        duration: `${navDuration}ms`,
        targetUrl: `/menu?sessionId=${session.id}`
      })
      debugNavLog('session-creation', 'menu', 'Navigation initiated successfully', {
        duration: `${navDuration}ms`,
        targetUrl: `/menu?sessionId=${session.id}`
      })
    } catch (routerError) {
      const navDuration = Date.now() - navStartTime
      console.error('❌ Step 4 Failed: Router navigation failed:', {
        error: routerError,
        duration: `${navDuration}ms`
      })
      debugErrorLog('NAVIGATION', 'Router navigation failed', routerError, {
        from: 'session-creation',
        to: 'menu',
        sessionId: session.id,
        duration: `${navDuration}ms`
      })
      throw new AppError({
        message: 'Failed to navigate to menu page',
        code: 'ROUTER_ERROR',
        originalError: routerError
      })
    }
    
    const totalDuration = Date.now() - startTime
    console.log('🎉 Session Creation Complete:', {
      operationId,
      totalDuration: `${totalDuration}ms`,
      sessionId: session.id,
      tableId: session.table_id
    })
    console.groupEnd()
    
    // End performance monitoring
    endPerformanceMonitoring(perfId)
    debugUtils.info('Session creation completed successfully', { 
      operationId, 
      sessionId: session.id, 
      tableId: session.table_id 
    })
    
    return session
    
  } catch (error) {
    const totalDuration = Date.now() - startTime
    console.error('❌ Session Creation Failed:', {
      operationId,
      totalDuration: `${totalDuration}ms`,
      error: error instanceof AppError ? {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      } : error,
      tableId
    })
    console.groupEnd()
    
    // End performance monitoring and track error
    endPerformanceMonitoring(perfId)
    trackError(error, { 
      operation: 'SESSION_CREATION', 
      tableId, 
      operationId 
    })
    
    const errorMessage = error instanceof AppError 
      ? error.message 
      : error instanceof Error 
        ? error.message 
        : 'Unknown session creation error'
    
    setState({ isLoading: false, error: errorMessage, session: null })
    throw error
  }
}
```

**Features:**
- ✅ **Step-by-Step Logging** - Detailed operation breakdown with specialized loggers
- ✅ **Performance Monitoring** - Timing for each operation step
- ✅ **Error Tracking** - Comprehensive error logging with context
- ✅ **Debug Integration** - Uses debug utilities for structured logging
- ✅ **Operation IDs** - Unique identifiers for tracking operations

### **3. Debug Example Component**

**File:** `src/components/DebugExample.tsx`

```typescript
'use client'

import React, { useState } from 'react'
import { 
  debugLog, 
  debugSessionLog, 
  debugApiLog, 
  debugDbLog, 
  debugAuthLog, 
  debugErrorLog,
  debugValidationLog,
  debugNavLog,
  isDebugMode,
  debugMode
} from '@/lib/debug'

export default function DebugExample() {
  const [sessionId, setSessionId] = useState('')
  const [tableId, setTableId] = useState('')
  const [userId, setUserId] = useState('')

  const handleBasicDebug = () => {
    debugLog('Basic debug message', { 
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent 
    })
  }

  const handleSessionDebug = () => {
    debugSessionLog('CREATE_SESSION', 'Session creation started', {
      tableId: tableId || 'table-123',
      userId: userId || 'user-456',
      timestamp: new Date().toISOString()
    })
  }

  const handleApiDebug = () => {
    debugApiLog('/api/sessions', 'POST', 'API request initiated', {
      body: { tableId, userId },
      headers: { 'Content-Type': 'application/json' }
    })
  }

  const handleDbDebug = () => {
    debugDbLog('INSERT', 'sessions', 'Database operation started', {
      tableId: tableId || 'table-123',
      userId: userId || 'user-456',
      data: { status: 'active', started_at: new Date().toISOString() }
    })
  }

  const handleAuthDebug = () => {
    debugAuthLog('LOGIN', 'Authentication attempt', {
      userId: userId || 'user-456',
      method: 'email',
      timestamp: new Date().toISOString()
    })
  }

  const handleErrorDebug = () => {
    const testError = new Error('Test error for debugging')
    debugErrorLog('TEST_OPERATION', 'Test error occurred', testError, {
      context: 'debug-example',
      timestamp: new Date().toISOString()
    })
  }

  const handleValidationDebug = () => {
    debugValidationLog('SESSION_VALIDATION', 'Validation started', {
      tableId: tableId || 'table-123',
      userId: userId || 'user-456',
      checks: ['table_exists', 'user_authenticated', 'permissions']
    })
  }

  const handleNavDebug = () => {
    debugNavLog('debug-example', 'menu', 'Navigation initiated', {
      sessionId: sessionId || 'session-789',
      timestamp: new Date().toISOString()
    })
  }

  const handleDebugModeStatus = () => {
    const status = debugMode.status()
    debugLog('Debug mode status', status)
  }

  return (
    <div className="debug-example p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Debug Mode Example</h2>
      
      <div className="mb-6 p-4 bg-gray-100 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">Debug Mode Status</h3>
        <p className="text-sm text-gray-600 mb-2">
          Debug mode is: <span className={`font-bold ${isDebugMode ? 'text-green-600' : 'text-red-600'}`}>
            {isDebugMode ? 'ENABLED' : 'DISABLED'}
          </span>
        </p>
        <button 
          onClick={handleDebugModeStatus}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Check Debug Status
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Input Fields */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Test Data</h3>
          
          <div>
            <label className="block text-sm font-medium mb-1">Table ID</label>
            <input
              type="text"
              value={tableId}
              onChange={(e) => setTableId(e.target.value)}
              placeholder="table-123"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">User ID</label>
            <input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="user-456"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Session ID</label>
            <input
              type="text"
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
              placeholder="session-789"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Debug Actions */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Debug Actions</h3>
          
          <div className="grid grid-cols-1 gap-3">
            <button 
              onClick={handleBasicDebug}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 text-left"
            >
              Basic Debug Log
            </button>
            
            <button 
              onClick={handleSessionDebug}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 text-left"
            >
              Session Debug Log
            </button>
            
            <button 
              onClick={handleApiDebug}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-left"
            >
              API Debug Log
            </button>
            
            <button 
              onClick={handleDbDebug}
              className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 text-left"
            >
              Database Debug Log
            </button>
            
            <button 
              onClick={handleAuthDebug}
              className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 text-left"
            >
              Auth Debug Log
            </button>
            
            <button 
              onClick={handleValidationDebug}
              className="px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600 text-left"
            >
              Validation Debug Log
            </button>
            
            <button 
              onClick={handleNavDebug}
              className="px-4 py-2 bg-pink-500 text-white rounded hover:bg-pink-600 text-left"
            >
              Navigation Debug Log
            </button>
            
            <button 
              onClick={handleErrorDebug}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 text-left"
            >
              Error Debug Log
            </button>
          </div>
        </div>
      </div>

      <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">Instructions</h3>
        <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700">
          <li>Open your browser&apos;s Developer Tools (F12)</li>
          <li>Go to the Console tab</li>
          <li>Click any of the debug buttons above</li>
          <li>Observe the detailed debug logs in the console</li>
          <li>Each log type has a different prefix: [SESSION], [API], [DATABASE], etc.</li>
        </ol>
      </div>

      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">Debug Mode Features</h3>
        <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
          <li><strong>Automatic Environment Detection:</strong> Enabled in development, configurable in production</li>
          <li><strong>Structured Logging:</strong> Consistent format with timestamps and context</li>
          <li><strong>Specialized Loggers:</strong> Different loggers for different operation types</li>
          <li><strong>Performance Monitoring:</strong> Built-in timing and performance tracking</li>
          <li><strong>Error Tracking:</strong> Comprehensive error logging with stack traces</li>
          <li><strong>Context Preservation:</strong> Maintains operation context throughout the flow</li>
        </ul>
      </div>
    </div>
  )
}
```

**Features:**
- ✅ **Interactive Testing** - Buttons to test different debug log types
- ✅ **Input Fields** - Customizable test data for debugging
- ✅ **Status Display** - Shows current debug mode status
- ✅ **Instructions** - Clear guidance on how to use the debug mode
- ✅ **Feature Overview** - Explains debug mode capabilities

### **4. Test Page for Debug Mode**

**File:** `src/app/test-debug-mode/page.tsx`

```typescript
'use client'

import React from 'react'
import DebugExample from '@/components/DebugExample'
import { 
  debugLog, 
  isDebugMode, 
  debugMode,
  configureDebugMode 
} from '@/lib/debug'

export default function TestDebugModePage() {
  // Log page load
  React.useEffect(() => {
    debugLog('Debug mode test page loaded', {
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent
    })
  }, [])

  const handleConfigureDebug = () => {
    configureDebugMode({
      enabled: true,
      level: 'debug',
      includeTimestamps: true,
      includeStackTraces: true
    })
    debugLog('Debug mode configured', { level: 'debug', enabled: true })
  }

  const handleDisableDebug = () => {
    configureDebugMode({
      enabled: false
    })
    debugLog('Debug mode disabled', { enabled: false })
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Debug Mode Testing
          </h1>
          
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Debug Mode Status</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium text-gray-700">Current Status</h3>
                <p className={`text-lg font-bold ${isDebugMode ? 'text-green-600' : 'text-red-600'}`}>
                  {isDebugMode ? 'ENABLED' : 'DISABLED'}
                </p>
              </div>
              
              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium text-gray-700">Environment</h3>
                <p className="text-lg font-bold text-blue-600">
                  {process.env.NODE_ENV || 'unknown'}
                </p>
              </div>
              
              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium text-gray-700">Debug Config</h3>
                <p className="text-sm text-gray-600">
                  {process.env.NEXT_PUBLIC_DEBUG || 'not set'}
                </p>
              </div>
            </div>
            
            <div className="mt-4 flex space-x-4">
              <button 
                onClick={handleConfigureDebug}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
              >
                Enable Debug Mode
              </button>
              <button 
                onClick={handleDisableDebug}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Disable Debug Mode
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Debug Mode Configuration</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-medium mb-2">Environment Variables</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">NODE_ENV:</span>
                    <span className="font-mono bg-gray-100 px-2 py-1 rounded">
                      {process.env.NODE_ENV || 'undefined'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">NEXT_PUBLIC_DEBUG:</span>
                    <span className="font-mono bg-gray-100 px-2 py-1 rounded">
                      {process.env.NEXT_PUBLIC_DEBUG || 'undefined'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">NEXT_PUBLIC_DEBUG_LEVEL:</span>
                    <span className="font-mono bg-gray-100 px-2 py-1 rounded">
                      {process.env.NEXT_PUBLIC_DEBUG_LEVEL || 'undefined'}
                    </span>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="font-medium mb-2">Current Configuration</h3>
                <pre className="text-xs bg-gray-100 p-3 rounded overflow-auto">
                  {JSON.stringify(debugMode.status(), null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </div>

        <DebugExample />

        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Usage Examples</h2>
          
          <div className="space-y-6">
            <div>
              <h3 className="font-medium mb-2">Basic Usage</h3>
              <pre className="text-sm bg-gray-100 p-3 rounded overflow-auto">
{`import { debugLog, isDebugMode } from '@/lib/debug'

// Simple debug logging
debugLog('Operation started', { userId: '123', tableId: 'table-1' })

// Check if debug mode is enabled
if (isDebugMode) {
  console.log('Debug mode is active')
}`}
              </pre>
            </div>
            
            <div>
              <h3 className="font-medium mb-2">Specialized Logging</h3>
              <pre className="text-sm bg-gray-100 p-3 rounded overflow-auto">
{`import { 
  debugSessionLog, 
  debugApiLog, 
  debugDbLog, 
  debugErrorLog 
} from '@/lib/debug'

// Session-specific logging
debugSessionLog('CREATE_SESSION', 'Session creation started', { tableId })

// API-specific logging
debugApiLog('/api/sessions', 'POST', 'API request', { body })

// Database-specific logging
debugDbLog('INSERT', 'sessions', 'Database operation', { data })

// Error-specific logging
debugErrorLog('CREATE_SESSION', 'Error occurred', error, { context })`}
              </pre>
            </div>
            
            <div>
              <h3 className="font-medium mb-2">Configuration</h3>
              <pre className="text-sm bg-gray-100 p-3 rounded overflow-auto">
{`import { configureDebugMode, debugMode } from '@/lib/debug'

// Configure debug mode
configureDebugMode({
  enabled: true,
  level: 'debug',
  includeTimestamps: true,
  includeStackTraces: true
})

// Check debug mode status
const status = debugMode.status()
console.log('Debug status:', status)`}
              </pre>
            </div>
          </div>
        </div>

        <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">How to Use</h2>
          <ol className="list-decimal list-inside space-y-2 text-gray-700">
            <li>Open your browser&apos;s Developer Tools (F12)</li>
            <li>Go to the Console tab</li>
            <li>Use the debug buttons above to test different log types</li>
            <li>Observe the structured debug logs in the console</li>
            <li>Each log type has a specific prefix: [SESSION], [API], [DATABASE], etc.</li>
            <li>Debug logs include timestamps, context, and structured data</li>
            <li>In production, set <code className="bg-gray-200 px-1 rounded">NEXT_PUBLIC_DEBUG=true</code> to enable</li>
          </ol>
        </div>
      </div>
    </div>
  )
}
```

**Features:**
- ✅ **Status Display** - Shows current debug mode status and configuration
- ✅ **Environment Information** - Displays environment variables and settings
- ✅ **Interactive Testing** - Buttons to test debug mode functionality
- ✅ **Usage Examples** - Code examples for different debug scenarios
- ✅ **Configuration Management** - Runtime debug mode configuration

---

## 🚀 **Usage Examples**

### **1. Basic Debug Logging**

```typescript
import { debugLog, isDebugMode } from '@/lib/debug'

// Simple debug logging
debugLog('Operation started', { userId: '123', tableId: 'table-1' })

// Check if debug mode is enabled
if (isDebugMode) {
  console.log('Debug mode is active')
}
```

### **2. Specialized Logging**

```typescript
import { 
  debugSessionLog, 
  debugApiLog, 
  debugDbLog, 
  debugErrorLog,
  debugValidationLog,
  debugNavLog,
  debugAuthLog
} from '@/lib/debug'

// Session-specific logging
debugSessionLog('CREATE_SESSION', 'Session creation started', { tableId })

// API-specific logging
debugApiLog('/api/sessions', 'POST', 'API request', { body })

// Database-specific logging
debugDbLog('INSERT', 'sessions', 'Database operation', { data })

// Error-specific logging
debugErrorLog('CREATE_SESSION', 'Error occurred', error, { context })

// Validation-specific logging
debugValidationLog('SESSION_VALIDATION', 'Validation started', { checks })

// Navigation-specific logging
debugNavLog('session-creation', 'menu', 'Navigation initiated', { sessionId })

// Authentication-specific logging
debugAuthLog('LOGIN', 'Authentication attempt', { userId, method })
```

### **3. Configuration**

```typescript
import { configureDebugMode, debugMode } from '@/lib/debug'

// Configure debug mode
configureDebugMode({
  enabled: true,
  level: 'debug',
  includeTimestamps: true,
  includeStackTraces: true
})

// Check debug mode status
const status = debugMode.status()
console.log('Debug status:', status)
```

### **4. Integration with Session Management**

```typescript
import { useSessionManagement } from '@/hooks/useSessionManagement'

function SessionComponent() {
  const { isLoading, error, session, createSession, clearError } = useSessionManagement()
  
  const handleCreateSession = async (tableId: string) => {
    try {
      // The hook automatically includes comprehensive debugging
      const newSession = await createSession(tableId)
      console.log('Session created with full debugging:', newSession)
    } catch (error) {
      // Error is automatically tracked and logged
      console.error('Session creation failed with detailed logs:', error)
    }
  }
  
  return (
    <div>
      {isLoading && <div>Creating session...</div>}
      {error && (
        <div>
          <p>Error: {error}</p>
          <button onClick={clearError}>Clear Error</button>
        </div>
      )}
      <button onClick={() => handleCreateSession('table-123')}>
        Create Session
      </button>
    </div>
  )
}
```

---

## 🔧 **Configuration Options**

### **Environment Variables**

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment (development/production/test) | `development` |
| `NEXT_PUBLIC_DEBUG` | Enable/disable debugging | `false` |
| `NEXT_PUBLIC_DEBUG_LEVEL` | Log level (error/warn/info/debug) | `debug` |
| `NEXT_PUBLIC_DEBUG_STACK_TRACES` | Include stack traces | `true` |
| `NEXT_PUBLIC_DEBUG_TIMESTAMPS` | Include timestamps | `true` |

### **Runtime Configuration**

```typescript
import { configureDebugMode } from '@/lib/debug'

// Enable debug mode
configureDebugMode({
  enabled: true,
  level: 'debug',
  includeTimestamps: true,
  includeStackTraces: true
})

// Disable debug mode
configureDebugMode({
  enabled: false
})
```

### **Debug Mode Status**

```typescript
import { debugMode, isDebugMode } from '@/lib/debug'

// Check if debug mode is enabled
if (isDebugMode) {
  console.log('Debug mode is active')
}

// Get detailed status
const status = debugMode.status()
console.log('Debug status:', status)
```

---

## 📊 **Debug Log Types**

### **1. Basic Debug Logs**

```typescript
debugLog('Operation started', { userId: '123', tableId: 'table-1' })
// Output: [DEBUG] Operation started { userId: '123', tableId: 'table-1' }
```

### **2. Session Debug Logs**

```typescript
debugSessionLog('CREATE_SESSION', 'Session creation started', { tableId })
// Output: [SESSION] Session creation started { operation: 'CREATE_SESSION', timestamp: '...', tableId: '...' }
```

### **3. API Debug Logs**

```typescript
debugApiLog('/api/sessions', 'POST', 'API request', { body })
// Output: [API] API request { endpoint: '/api/sessions', method: 'POST', timestamp: '...', body: '...' }
```

### **4. Database Debug Logs**

```typescript
debugDbLog('INSERT', 'sessions', 'Database operation', { data })
// Output: [DATABASE] Database operation { operation: 'INSERT', table: 'sessions', timestamp: '...', data: '...' }
```

### **5. Error Debug Logs**

```typescript
debugErrorLog('CREATE_SESSION', 'Error occurred', error, { context })
// Output: [ERROR] Error occurred { operation: 'CREATE_SESSION', error: { name: '...', message: '...', stack: '...' }, timestamp: '...', context: '...' }
```

### **6. Validation Debug Logs**

```typescript
debugValidationLog('SESSION_VALIDATION', 'Validation started', { checks })
// Output: [VALIDATION] Validation started { operation: 'SESSION_VALIDATION', timestamp: '...', checks: '...' }
```

### **7. Navigation Debug Logs**

```typescript
debugNavLog('session-creation', 'menu', 'Navigation initiated', { sessionId })
// Output: [NAVIGATION] Navigation initiated { from: 'session-creation', to: 'menu', timestamp: '...', sessionId: '...' }
```

### **8. Authentication Debug Logs**

```typescript
debugAuthLog('LOGIN', 'Authentication attempt', { userId, method })
// Output: [AUTH] Authentication attempt { operation: 'LOGIN', timestamp: '...', userId: '...', method: '...' }
```

---

## 🧪 **Testing and Verification**

### **1. Debug Mode Testing**

```typescript
import { debugLog, isDebugMode, debugMode } from '@/lib/debug'

// Test debug mode
console.log('Debug mode enabled:', isDebugMode)

// Test debug logging
debugLog('Test message', { test: true })

// Test debug mode status
const status = debugMode.status()
console.log('Debug status:', status)
```

### **2. Interactive Testing**

Visit `/test-debug-mode` to:
- Test different debug log types
- View debug mode status
- Configure debug mode settings
- See usage examples
- Test debug functionality

### **3. Console Output**

When debug mode is enabled, you'll see structured logs like:

```
[DEBUG] Operation started { userId: '123', tableId: 'table-1', timestamp: '2023-12-21T10:30:00.000Z' }
[SESSION] Session creation started { operation: 'CREATE_SESSION', timestamp: '2023-12-21T10:30:00.000Z', tableId: 'table-123' }
[API] API request { endpoint: '/api/sessions', method: 'POST', timestamp: '2023-12-21T10:30:00.000Z', body: { tableId: 'table-123' } }
[DATABASE] Database operation { operation: 'INSERT', table: 'sessions', timestamp: '2023-12-21T10:30:00.000Z', data: { status: 'active' } }
[ERROR] Error occurred { operation: 'CREATE_SESSION', error: { name: 'Error', message: 'Test error', stack: '...' }, timestamp: '2023-12-21T10:30:00.000Z', context: { test: true } }
```

---

## 🎉 **Final Status**

### **✅ IMPLEMENTATION COMPLETE**

The simple debug mode has been successfully implemented with:

- **Simple Interface** - Easy-to-use functions with minimal setup
- **Automatic Environment Detection** - Enabled in development, configurable in production
- **Specialized Loggers** - Different loggers for different operation types
- **Structured Logging** - Consistent format with timestamps and context
- **Performance Optimized** - No-op when debug mode is disabled
- **Interactive Testing** - Test page and component for debugging
- **Comprehensive Documentation** - Complete usage guide and examples

**Status: ✅ COMPLETE** 🎉

The debug mode is now ready for production use and provides a simple, effective way to add debugging throughout the application. It automatically detects the environment and provides structured logging with minimal setup required.

### **Key Benefits**

1. **🔍 Simple Interface** - Easy-to-use functions with minimal setup
2. **🌍 Automatic Detection** - Enabled in development, configurable in production
3. **📊 Specialized Loggers** - Different loggers for different operation types
4. **⏱️ Performance Optimized** - No-op when debug mode is disabled
5. **🧪 Interactive Testing** - Test page and component for debugging
6. **📚 Comprehensive Documentation** - Complete usage guide and examples
7. **🔧 Flexible Configuration** - Runtime configuration options
8. **📱 Production Safe** - Configurable for different environments

The debug mode provides the foundation for easy debugging throughout the application, making it simple to add detailed logging wherever needed while maintaining performance in production.
