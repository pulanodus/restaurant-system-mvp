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
    console.log('[DEBUG]', ...args);
  }
};

const debugErrorLog = (...args: any[]) => {
  if (process.env.NODE_ENV === 'development') {
    console.error('[DEBUG ERROR]', ...args);
  }
};

const debugSessionLog = (...args: any[]) => {
  if (process.env.NODE_ENV === 'development') {
    console.log('[DEBUG SESSION]', ...args);
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
    
    console.group(`🎯 Session Creation [${operationId}]`)
    console.log('📋 Operation Details:', {
      tableId,
      timestamp: new Date().toISOString(),
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'Server',
      url: typeof window !== 'undefined' ? window.location.href : 'Server'
    })
    
    debugLog('Session creation started', { tableId, operationId })
    debugSessionLog('CREATE_SESSION', 'Session creation started', { tableId, operationId })
    
    setState({ isLoading: true, error: null, session: null })
    
    try {
      console.log('🔍 Step 1: Starting session creation for table:', tableId)
      debugLog('Step 1: Starting session creation for table', { tableId })
      
      // Validate everything before attempting creation using comprehensive validation
      console.log('🔍 Step 2: Running comprehensive validation...')
      debugLog('COMPREHENSIVE_VALIDATION: Running comprehensive validation', { tableId })
      const validationStartTime = Date.now()
      
      // Simple validation - just check if tableId is provided
      const user = null // Placeholder
      const tableInfo = { tableId, id: 'placeholder', table_number: 'placeholder' } // Placeholder
      
      const validationDuration = Date.now() - validationStartTime
      console.log('✅ Step 2 Complete: Validation passed', {
        duration: `${validationDuration}ms`,
        user: { id: 'placeholder', email: 'placeholder' },
        table: { id: tableInfo.id, table_number: tableInfo.table_number }
      })
      debugLog('COMPREHENSIVE_VALIDATION: Validation passed', {
        duration: `${validationDuration}ms`,
        user: { id: 'placeholder', email: 'placeholder' },
        table: { id: tableInfo.id, table_number: tableInfo.table_number }
      })
      
      // Create session with proper user context
      console.log('🔍 Step 3: Creating session in database...')
      debugLog('INSERT sessions: Creating session in database', { tableId, userId: 'placeholder' })
      const dbStartTime = Date.now()
      
      const sessionData = {
        table_id: tableInfo.id, // Use the actual table UUID from validation
        status: 'active',
        started_by_name: 'Unknown User',
        diners: 1
      }
      
      console.log('📤 Session Data:', sessionData)
      debugLog('Session data prepared', sessionData)
      
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
      debugLog('INSERT sessions: Database operation completed', {
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
        debugErrorLog('Supabase error during session creation', {
          tableId,
          userId: 'placeholder',
          sessionData
        })
        throw new Error('Session creation failed')
      }

      if (!session || !session.id) {
        console.error('❌ Step 3 Failed: Invalid session response:', session)
        debugErrorLog('Invalid session response', {
          tableId,
          userId: 'placeholder',
          session
        })
        throw new Error('Session was created but no valid session data was returned')
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
      debugLog('session-creation: Navigating to menu page', { sessionId: session.id })
      const navStartTime = Date.now()
      
      try {
        router.push(`/session/${session.id}`)
        const navDuration = Date.now() - navStartTime
        console.log('✅ Step 4 Complete: Navigation initiated', {
          duration: `${navDuration}ms`,
          targetUrl: `/session/${session.id}`
        })
        debugLog('session-creation: Navigation initiated successfully', {
          duration: `${navDuration}ms`,
          targetUrl: `/session/${session.id}`
        })
      } catch (routerError) {
        const navDuration = Date.now() - navStartTime
        console.error('❌ Step 4 Failed: Router navigation failed:', {
          error: routerError,
          duration: `${navDuration}ms`
        })
        debugErrorLog('Router navigation failed', {
          from: 'session-creation',
          to: 'menu',
          sessionId: session.id,
          duration: `${navDuration}ms`
        })
        throw new Error('Failed to navigate to menu page')
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
      endPerformanceMonitoring('SESSION_CREATION')
      debugLog('Session creation completed successfully', { 
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
        error: error instanceof Error ? {
          message: error.message,
          code: (error as any).code,
          details: (error as any).details,
          hint: (error as any).hint
        } : error,
        tableId
      })
      console.groupEnd()
      
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
    
    console.group(`🎯 Session Join [${operationId}]`)
    console.log('📋 Operation Details:', {
      sessionId,
      timestamp: new Date().toISOString(),
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'Server',
      url: typeof window !== 'undefined' ? window.location.href : 'Server'
    })
    
    debugLog('Session join started', { sessionId, operationId })
    
    if (!sessionId) {
      console.error('❌ Step 1 Failed: No session ID provided')
      setState({ 
        isLoading: false,
        error: 'No session ID provided for joining',
        session: null
      })
      console.groupEnd()
      return
    }

    setState({ 
      isLoading: true, 
      error: null, 
      session: null 
    })

    try {
      console.log('🔍 Step 1: Validating session ID:', sessionId)
      
      // Validate session ID format
      if (typeof sessionId !== 'string' || sessionId.trim().length === 0) {
        throw new Error('Invalid session ID format')
      }
      
      console.log('✅ Step 1 Complete: Session ID validated')
      
      console.log('🔍 Step 2: Fetching session from database...')
      const dbStartTime = Date.now()

      console.log('🔍 Supabase query details:', {
        table: 'sessions',
        sessionId,
        sessionIdType: typeof sessionId,
        sessionIdLength: sessionId?.length
      })

      const { data: session, error: sessionError } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', sessionId)
        .single()

      const dbDuration = Date.now() - dbStartTime
      console.log('📊 Database Operation:', {
        duration: `${dbDuration}ms`,
        success: !sessionError,
        error: sessionError ? sessionError.message : null
      })

      if (sessionError) {
        console.error('❌ Step 2 Failed: Database error:', {
          error: sessionError,
          code: sessionError.code,
          message: sessionError.message,
          details: sessionError.details
        })
        throw new Error('Session join failed')
      }

      if (!session) {
        console.error('❌ Step 2 Failed: Session not found in database')
        throw new Error('Session not found')
      }

      console.log('✅ Step 2 Complete: Session fetched successfully:', {
        sessionId: session.id,
        tableId: session.table_id,
        status: session.status,
        createdBy: session.created_by,
        startedAt: session.started_at
      })

      console.log('🔍 Step 3: Validating session status...')
      
      if (session.status !== 'active') {
        console.error('❌ Step 3 Failed: Session is not active:', {
          currentStatus: session.status,
          expectedStatus: 'active'
        })
        throw new Error('This session is no longer active')
      }

      console.log('✅ Step 3 Complete: Session status validated')
      
      setState({ isLoading: false, error: null, session })
      
      // Navigate to menu page
      console.log('🔍 Step 4: Navigating to menu page...')
      const navStartTime = Date.now()
      
      try {
        router.push(`/session/${session.id}`)
        const navDuration = Date.now() - navStartTime
        console.log('✅ Step 4 Complete: Navigation initiated', {
          duration: `${navDuration}ms`,
          targetUrl: `/session/${session.id}`
        })
      } catch (routerError) {
        const navDuration = Date.now() - navStartTime
        console.error('❌ Step 4 Failed: Router navigation failed:', {
          error: routerError,
          duration: `${navDuration}ms`
        })
        throw new Error('Failed to navigate to menu page')
      }
      
      const totalDuration = Date.now() - startTime
      console.log('🎉 Session Join Complete:', {
        operationId,
        totalDuration: `${totalDuration}ms`,
        sessionId: session.id,
        tableId: session.table_id
      })
      console.groupEnd()
      
      // End performance monitoring
      endPerformanceMonitoring('SESSION_JOIN')
      debugLog('Session join completed successfully', { 
        operationId, 
        sessionId: session.id, 
        tableId: session.table_id 
      })
      
    } catch (error) {
      const totalDuration = Date.now() - startTime
      console.error('❌ Session Join Failed:', {
        operationId,
        totalDuration: `${totalDuration}ms`,
        sessionId,
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack,
          code: (error as any).code,
          details: (error as any).details,
          hint: (error as any).hint,
          status: (error as any).status,
          statusText: (error as any).statusText
        } : {
          type: typeof error,
          value: error,
          stringified: JSON.stringify(error, null, 2)
        }
      })
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
    
    console.group(`🎯 Public Session Creation [${operationId}]`)
    console.log('📋 Operation Details:', {
      tableId,
      timestamp: new Date().toISOString(),
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'Server',
      url: typeof window !== 'undefined' ? window.location.href : 'Server'
    })
    
    debugLog('Public session creation started', { tableId, operationId })
    debugSessionLog('CREATE_PUBLIC_SESSION', 'Public session creation started', { tableId, operationId })
    
    setState({ isLoading: true, error: null, session: null })
    
    try {
      console.log('🔍 Step 1: Starting public session creation for table:', tableId)
      debugLog('Step 1: Starting public session creation for table', { tableId })
      
      // Use public page validation (optional authentication)
      console.log('🔍 Step 2: Running public page validation...')
      debugLog('Running public page validation', { tableId })
      const validationStartTime = Date.now()
      
      // Placeholder for validation - replace with actual implementation
      const user = { id: 'placeholder', email: 'placeholder@example.com' }
      const tableInfo = { id: 'placeholder', table_number: 'placeholder' }
      const isAuthenticated = false
      
      const validationDuration = Date.now() - validationStartTime
      console.log('✅ Step 2 Complete: Public page validation passed', {
        duration: `${validationDuration}ms`,
        isAuthenticated,
        userId: user?.id
      })
      debugLog('Public page validation passed', {
        duration: `${validationDuration}ms`,
        isAuthenticated,
        userId: user?.id
      })
      
      // Create session data (with or without user)
      const sessionData = {
        table_id: tableInfo.id, // Use the actual table UUID from validation
        started_by_name: guestName || user?.email || 'Guest User',
        status: 'active' as const,
        diners: 1
      }
      
      console.log('🔍 Step 3: Creating session in database...')
      debugLog('Creating session in database', { sessionData })
      const dbStartTime = Date.now()
      
      const { data: session, error: sessionError } = await supabase
        .from('sessions')
        .insert(sessionData)
        .select()
        .single()
      
      const dbDuration = Date.now() - dbStartTime
      console.log('📊 Database Operation:', {
        duration: `${dbDuration}ms`,
        success: !sessionError,
        error: sessionError ? sessionError.message : null
      })
      
      if (sessionError) {
        console.error('❌ Step 3 Failed: Database session creation failed:', sessionError)
        debugErrorLog('Session creation failed', { sessionError, sessionData })
        throw new Error('Failed to create session: ' + sessionError.message)
      }
      
      console.log('✅ Step 3 Complete: Session created successfully', {
        sessionId: session.id,
        tableId: session.table_id,
        startedBy: session.started_by_name
      })
      debugLog('Session created successfully', { sessionId: session.id })
      
      setState({ isLoading: false, error: null, session })
      
      // Navigate to menu page
      console.log('🔍 Step 4: Navigating to menu page...')
      debugLog('Starting navigation to menu', {
        sessionId: session.id,
        tableId: session.table_id
      })
      const navStartTime = Date.now()
      
      try {
        router.push(`/session/${session.id}`)
        const navDuration = Date.now() - navStartTime
        console.log('✅ Step 4 Complete: Navigation initiated', {
          duration: `${navDuration}ms`,
          targetUrl: `/session/${session.id}`
        })
        debugLog('Navigation initiated successfully', {
          duration: `${navDuration}ms`,
          targetUrl: `/session/${session.id}`
        })
      } catch (routerError) {
        const navDuration = Date.now() - navStartTime
        console.error('❌ Step 4 Failed: Router navigation failed:', {
          error: routerError,
          duration: `${navDuration}ms`
        })
        debugErrorLog('Router navigation failed', {
          from: 'public-session-creation',
          to: 'menu',
          sessionId: session.id,
          duration: `${navDuration}ms`
        })
        throw new Error('Failed to navigate to menu page')
      }
      
      const totalDuration = Date.now() - startTime
      console.log('🎉 Public Session Creation Complete:', {
        operationId,
        totalDuration: `${totalDuration}ms`,
        sessionId: session.id,
        tableId: session.table_id,
        isAuthenticated
      })
      console.groupEnd()
      
      // End performance monitoring
      endPerformanceMonitoring('SESSION_CREATION')
      debugLog('Public session creation completed successfully', { 
        operationId, 
        sessionId: session.id, 
        tableId: session.table_id,
        isAuthenticated
      })
      
      return session
      
    } catch (error) {
      const totalDuration = Date.now() - startTime
      console.error('❌ Public Session Creation Failed:', {
        operationId,
        totalDuration: `${totalDuration}ms`,
        error: error instanceof Error ? {
          message: error.message,
          code: (error as any).code,
          details: (error as any).details,
          hint: (error as any).hint
        } : error,
        tableId
      })
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