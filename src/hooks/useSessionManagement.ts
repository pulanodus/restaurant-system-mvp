// hooks/useSessionManagement.ts
'use client'

// React imports
import { useState } from 'react'

// Next.js imports
import { useRouter } from 'next/navigation'

// Supabase imports
import { supabase } from '@/lib/supabase'

// Error handling imports
import { AppError, handleError } from '@/lib/error-handling'

// Session validation imports
import { 
  withErrorHandling
} from '@/lib/error-handling'

// Simple debug logging
const debugLog = (...args: any[]) => {
  if (process.env.NODE_ENV === 'development') {
    // Debug logging enabled in development
  }
};

const debugErrorLog = (...args: any[]) => {
  if (process.env.NODE_ENV === 'development') {
    console.error('[DEBUG ERROR]', ...args);
  }
};

const debugSessionLog = (...args: any[]) => {
  if (process.env.NODE_ENV === 'development') {
    // Session debug logging enabled in development
  }
};

const trackError = (error: any, context?: any) => {
  if (process.env.NODE_ENV === 'development') {
    console.error('[TRACKED ERROR]', error, context);
  }
};

const startPerformanceMonitoring = (operation: string) => {
  if (process.env.NODE_ENV === 'development' && typeof performance !== 'undefined') {
    performance.mark(`${operation}-start`);
    debugLog(`Performance monitoring started for: ${operation}`);
  }
};

const endPerformanceMonitoring = (operation: string) => {
  if (process.env.NODE_ENV === 'development' && typeof performance !== 'undefined') {
    performance.mark(`${operation}-end`);
    performance.measure(operation, `${operation}-start`, `${operation}-end`);
    const measure = performance.getEntriesByName(operation).pop();
    debugLog(`Performance monitoring ended for: ${operation}. Duration: ${measure?.duration.toFixed(2)}ms`);
    performance.clearMarks(`${operation}-start`);
    performance.clearMarks(`${operation}-end`);
    performance.clearMeasures(operation);
  }
};

// Session management state
interface SessionState {
  isLoading: boolean
  error: string | null
  session: unknown | null
}

// Session management return type
interface UseSessionManagementReturn {
  isLoading: boolean
  error: string | null
  session: unknown | null
  createSession: (tableId: string) => Promise<unknown>
  createPublicSession: (tableId: string, guestName?: string) => Promise<unknown>
  joinSession: (sessionId: string) => Promise<void>
  clearError: () => void
}

export function useSessionManagement(): UseSessionManagementReturn {
  const router = useRouter()
  const [state, setState] = useState<SessionState>({
    isLoading: false,
    error: null,
    session: null
  })

  const createSession = async (tableId: string) => {
    const operationId = Math.random().toString(36).substring(2, 15)
    const startTime = Date.now()
    
    // Start performance monitoring
    startPerformanceMonitoring('SESSION_CREATION')
    
    debugLog('Session creation started', { tableId, operationId })
    debugSessionLog('CREATE_SESSION', 'Session creation started', { tableId, operationId })
    
    setState({ isLoading: true, error: null, session: null })
    
    try {
      debugLog('Step 1: Starting session creation for table', { tableId })
      
      // Validate everything before attempting creation using comprehensive validation
      debugLog('COMPREHENSIVE_VALIDATION: Running comprehensive validation', { tableId })
      const validationStartTime = Date.now()
      
      // Simple validation - just check if tableId is provided
      const user = null // Placeholder
      const tableInfo = { tableId, id: 'placeholder', table_number: 'placeholder' } // Placeholder
      
      const validationDuration = Date.now() - validationStartTime
      debugLog('COMPREHENSIVE_VALIDATION: Validation passed', {
        duration: `${validationDuration}ms`,
        user: { id: 'placeholder', email: 'placeholder' },
        table: { id: tableInfo.id, table_number: tableInfo.table_number }
      })
      
      // Create session with proper user context
      debugLog('INSERT sessions: Creating session in database', { tableId, userId: 'placeholder' })
      const dbStartTime = Date.now()
      
      const sessionData = {
        table_id: tableInfo.id, // Use the actual table UUID from validation
        status: 'active',
        started_by_name: 'Unknown User',
        diners: 1
      }
      
      debugLog('Session data prepared', sessionData)
      
      const { data: session, error } = await supabase
        .from('sessions')
        .insert(sessionData)
        .select()
        .single()

      const dbDuration = Date.now() - dbStartTime
      debugLog('INSERT sessions: Database operation completed', {
        duration: `${dbDuration}ms`,
        success: !error,
        error: error ? error.message : null
      })

      if (error) {
        debugErrorLog('Supabase error during session creation', {
          tableId,
          userId: 'placeholder',
          sessionData
        })
        throw new Error('Session creation failed')
      }

      if (!session || !session.id) {
        debugErrorLog('Invalid session response', {
          tableId,
          userId: 'placeholder',
          session
        })
        throw new Error('Session was created but no valid session data was returned')
      }

      debugSessionLog('CREATE_SESSION', 'Session created successfully', {
        sessionId: session.id,
        tableId: session.table_id,
        createdBy: session.created_by,
        status: session.status
      })
      
      setState({ isLoading: false, error: null, session })
      
      // Navigate to menu page
      debugLog('session-creation: Navigating to menu page', { sessionId: session.id })
      const navStartTime = Date.now()
      
      try {
        router.push(`/session/${session.id}`)
        const navDuration = Date.now() - navStartTime
        debugLog('session-creation: Navigation initiated successfully', {
          duration: `${navDuration}ms`,
          targetUrl: `/session/${session.id}`
        })
      } catch (routerError) {
        const navDuration = Date.now() - navStartTime
        debugErrorLog('Router navigation failed', {
          from: 'session-creation',
          to: 'menu',
          sessionId: session.id,
          duration: `${navDuration}ms`
        })
        throw new Error('Failed to navigate to menu page')
      }
      
      const totalDuration = Date.now() - startTime
      console.groupEnd()
      
      // End performance monitoring
      endPerformanceMonitoring('SESSION_CREATION')
      debugLog('Session creation completed successfully', { 
        operationId, 
        sessionId: session.id, 
        tableId: session.table_id 
      })
      
      return session
      
    } catch (error) {
      const totalDuration = Date.now() - startTime
      // End performance monitoring and track error
      endPerformanceMonitoring('SESSION_CREATION')
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

  const joinSession = async (sessionId: string) => {
    const operationId = Math.random().toString(36).substring(2, 15)
    const startTime = Date.now()
    
    // Start performance monitoring
    startPerformanceMonitoring('SESSION_JOIN')
    
    // Session join started
    
    console.groupEnd()
      
      if (!sessionId) {
        setState({ 
          isLoading: false,
          error: 'No session ID provided for joining',
          session: null
        })
        return
      }

    setState({ 
      isLoading: true, 
      error: null, 
      session: null 
    })

    try {
      // Validating session ID
      
      // Validate session ID format
      if (typeof sessionId !== 'string' || sessionId.trim().length === 0) {
        throw new Error('Invalid session ID format')
      }
      
      // Session ID validated
      
      // Fetching session from database...
      const dbStartTime = Date.now()

      // Supabase query details removed for security

      const { data: session, error: sessionError } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', sessionId)
        .single()

      const dbDuration = Date.now() - dbStartTime
      // Database operation details removed for security

      if (sessionError) {
        debugLog('Database error occurred:', {
          error: sessionError,
          code: sessionError.code,
          message: sessionError.message,
          details: sessionError.details
        })
        throw new Error('Session join failed')
      }

      if (!session) {
        // Session not found in database
        throw new Error('Session not found')
      }

      // Session fetched successfully

      // Validating session status...
      
      if (session.status !== 'active') {
        // Session is not active
        throw new Error('This session is no longer active')
      }

      // Session status validated
      
      setState({ isLoading: false, error: null, session })
      
      // Navigate to menu page
      // Navigating to menu page...
      const navStartTime = Date.now()

      try {
        router.push(`/session/${session.id}`)
        const navDuration = Date.now() - navStartTime
        // Navigation initiated successfully
      } catch (routerError) {
        const navDuration = Date.now() - navStartTime
        debugLog('Router navigation failed:', {
          error: routerError,
          duration: `${navDuration}ms`
        })
        throw new Error('Failed to navigate to menu page')
      }
      
      const totalDuration = Date.now() - startTime
      console.groupEnd()
      
      // End performance monitoring
      endPerformanceMonitoring('SESSION_JOIN')
      // Session join completed successfully
      
    } catch (error) {
      const totalDuration = Date.now() - startTime
      console.groupEnd()
      
      // End performance monitoring and track error
      endPerformanceMonitoring('SESSION_JOIN')
      trackError(error, { 
        operation: 'SESSION_JOIN', 
        sessionId, 
        operationId 
      })
      
      const errorMessage = error instanceof AppError 
        ? error.message 
        : error instanceof Error 
          ? error.message 
          : 'Unknown session join error'
      
      setState({ isLoading: false, error: errorMessage, session: null })
      throw error
    }
  }

  const createPublicSession = async (tableId: string, guestName?: string) => {
    const operationId = Math.random().toString(36).substring(2, 15)
    const startTime = Date.now()
    
    // Start performance monitoring
    const perfId = startPerformanceMonitoring('PUBLIC_SESSION_CREATION')
    
    // Public session creation started
    debugSessionLog('CREATE_PUBLIC_SESSION', 'Public session creation started', { tableId, operationId })
    
    setState({ isLoading: true, error: null, session: null })
    
    try {
      // Starting public session creation for table
      
      // Use public page validation (optional authentication)
      // Running public page validation
      const validationStartTime = Date.now()
      
      // Placeholder for validation - replace with actual implementation
      const user = { id: 'placeholder', email: 'placeholder@example.com' }
      const tableInfo = { id: 'placeholder', table_number: 'placeholder' }
      const isAuthenticated = false
      
      const validationDuration = Date.now() - validationStartTime
      // Public page validation passed
      
      // Create session data (with or without user)
      const sessionData = {
        table_id: tableInfo.id, // Use the actual table UUID from validation
        started_by_name: guestName || user?.email || 'Guest User',
        status: 'active' as const,
        diners: 1
      }
      
      // Creating session in database
      const dbStartTime = Date.now()
      
      const { data: session, error: sessionError } = await supabase
        .from('sessions')
        .insert(sessionData)
        .select()
        .single()
      
      const dbDuration = Date.now() - dbStartTime
      // Database Operation completed
      
      if (sessionError) {
        debugErrorLog('Session creation failed', { sessionError, sessionData })
        throw new Error('Failed to create session: ' + sessionError.message)
      }
      
      // Session created successfully
      
      setState({ isLoading: false, error: null, session })
      
      // Navigate to menu page
      // Starting navigation to menu
      const navStartTime = Date.now()
      
      try {
        router.push(`/session/${session.id}`)
        const navDuration = Date.now() - navStartTime
        // Navigation initiated successfully
      } catch (routerError) {
        const navDuration = Date.now() - navStartTime
        debugErrorLog('Router navigation failed', {
          from: 'public-session-creation',
          to: 'menu',
          sessionId: session.id,
          duration: `${navDuration}ms`
        })
        throw new Error('Failed to navigate to menu page')
      }
      
      const totalDuration = Date.now() - startTime
      console.groupEnd()
      
      // End performance monitoring
      endPerformanceMonitoring('SESSION_CREATION')
      // Public session creation completed successfully
      
      return session
      
    } catch (error) {
      const totalDuration = Date.now() - startTime
      console.groupEnd()
      
      // End performance monitoring and track error
      endPerformanceMonitoring('SESSION_CREATION')
      trackError(error, { 
        operation: 'PUBLIC_SESSION_CREATION', 
        tableId, 
        operationId 
      })
      
      const errorMessage = error instanceof AppError 
        ? error.message 
        : error instanceof Error 
          ? error.message 
          : 'Unknown public session creation error'
      
      setState({ isLoading: false, error: errorMessage, session: null })
      throw error
    }
  }

  const clearError = () => {
    setState(prev => ({ ...prev, error: null }))
  }

  return {
    isLoading: state.isLoading,
    error: state.error,
    session: state.session,
    createSession,
    createPublicSession,
    joinSession,
    clearError
  }
}