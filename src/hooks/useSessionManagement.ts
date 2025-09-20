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
  debugDbLog
} from '@/lib/debug'

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
  createPublicSession: (tableId: string) => Promise<unknown>
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
        table: { id: tableInfo.id, table_number: tableInfo.table_number }
      })
      debugValidationLog('COMPREHENSIVE_VALIDATION', 'Validation passed', {
        duration: `${validationDuration}ms`,
        user: { id: user.id, email: user.email },
        table: { id: tableInfo.id, table_number: tableInfo.table_number }
      })
      
      // Create session with proper user context
      console.log('🔍 Step 3: Creating session in database...')
      debugDbLog('INSERT', 'sessions', 'Creating session in database', { tableId, userId: user.id })
      const dbStartTime = Date.now()
      
      const sessionData = {
        table_id: tableInfo.id, // Use the actual table UUID from validation
        status: 'active',
        started_by_name: user.email || 'Unknown User',
        diners: 1
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
        router.push(`/session/${session.id}`)
        const navDuration = Date.now() - navStartTime
        console.log('✅ Step 4 Complete: Navigation initiated', {
          duration: `${navDuration}ms`,
          targetUrl: `/session/${session.id}`
        })
        debugNavLog('session-creation', 'menu', 'Navigation initiated successfully', {
          duration: `${navDuration}ms`,
          targetUrl: `/session/${session.id}`
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

  const joinSession = async (sessionId: string) => {
    const operationId = Math.random().toString(36).substring(2, 15)
    const startTime = Date.now()
    
    // Start performance monitoring
    const perfId = startPerformanceMonitoring('SESSION_JOIN', {
      sessionId,
      operationId,
      timestamp: new Date().toISOString()
    })
    
    console.group(`🎯 Session Join [${operationId}]`)
    console.log('📋 Operation Details:', {
      sessionId,
      timestamp: new Date().toISOString(),
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'Server',
      url: typeof window !== 'undefined' ? window.location.href : 'Server'
    })
    
    debugUtils.info('Session join started', { sessionId, operationId })
    
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
        throw new AppError({
          message: 'Invalid session ID format',
          code: 'INVALID_SESSION_ID'
        })
      }
      
      console.log('✅ Step 1 Complete: Session ID validated')
      
      console.log('🔍 Step 2: Fetching session from database...')
      const dbStartTime = Date.now()

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
        throw new AppError({
          message: handleSupabaseError(sessionError, 'session join'),
          code: 'SESSION_JOIN_ERROR',
          originalError: sessionError
        })
      }

      if (!session) {
        console.error('❌ Step 2 Failed: Session not found in database')
        throw new AppError({
          message: 'Session not found',
          code: 'SESSION_NOT_FOUND'
        })
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
        throw new AppError({
          message: 'This session is no longer active',
          code: 'SESSION_INACTIVE'
        })
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
        throw new AppError({
          message: 'Failed to navigate to menu page',
          code: 'ROUTER_ERROR',
          originalError: routerError
        })
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
      endPerformanceMonitoring(perfId)
      debugUtils.info('Session join completed successfully', { 
        operationId, 
        sessionId: session.id, 
        tableId: session.table_id 
      })
      
    } catch (error) {
      const totalDuration = Date.now() - startTime
      console.error('❌ Session Join Failed:', {
        operationId,
        totalDuration: `${totalDuration}ms`,
        error: error instanceof AppError ? {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        } : error,
        sessionId
      })
      console.groupEnd()
      
      // End performance monitoring and track error
      endPerformanceMonitoring(perfId)
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
    const perfId = startPerformanceMonitoring('PUBLIC_SESSION_CREATION', {
      tableId,
      operationId,
      timestamp: new Date().toISOString()
    })
    
    console.group(`🎯 Public Session Creation [${operationId}]`)
    console.log('📋 Operation Details:', {
      tableId,
      timestamp: new Date().toISOString(),
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'Server',
      url: typeof window !== 'undefined' ? window.location.href : 'Server'
    })
    
    debugUtils.info('Public session creation started', { tableId, operationId })
    debugSessionLog('CREATE_PUBLIC_SESSION', 'Public session creation started', { tableId, operationId })
    
    setState({ isLoading: true, error: null, session: null })
    
    try {
      console.log('🔍 Step 1: Starting public session creation for table:', tableId)
      simpleDebugLog('Step 1: Starting public session creation for table', { tableId })
      
      // Use public page validation (optional authentication)
      console.log('🔍 Step 2: Running public page validation...')
      debugValidationLog('PUBLIC_PAGE_VALIDATION', 'Running public page validation', { tableId })
      const validationStartTime = Date.now()
      
      const { user, tableInfo, isAuthenticated } = await validatePublicPageAccess(tableId)
      
      const validationDuration = Date.now() - validationStartTime
      console.log('✅ Step 2 Complete: Public page validation passed', {
        duration: `${validationDuration}ms`,
        isAuthenticated,
        userId: user?.id
      })
      debugValidationLog('PUBLIC_PAGE_VALIDATION', 'Public page validation passed', {
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
      debugDbLog('CREATE_SESSION', 'Creating session in database', JSON.stringify(sessionData))
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
        debugErrorLog('DATABASE', 'Session creation failed', sessionError, { sessionData })
        throw handleSupabaseError(sessionError, 'Failed to create session')
      }
      
      console.log('✅ Step 3 Complete: Session created successfully', {
        sessionId: session.id,
        tableId: session.table_id,
        startedBy: session.started_by_name
      })
      debugDbLog('CREATE_SESSION', 'Session created successfully', session.id.toString())
      
      setState({ isLoading: false, error: null, session })
      
      // Navigate to menu page
      console.log('🔍 Step 4: Navigating to menu page...')
      debugNavLog('public-session-creation', 'menu', 'Starting navigation to menu', {
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
        debugNavLog('public-session-creation', 'menu', 'Navigation initiated successfully', {
          duration: `${navDuration}ms`,
          targetUrl: `/session/${session.id}`
        })
      } catch (routerError) {
        const navDuration = Date.now() - navStartTime
        console.error('❌ Step 4 Failed: Router navigation failed:', {
          error: routerError,
          duration: `${navDuration}ms`
        })
        debugErrorLog('NAVIGATION', 'Router navigation failed', routerError, {
          from: 'public-session-creation',
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
      console.log('🎉 Public Session Creation Complete:', {
        operationId,
        totalDuration: `${totalDuration}ms`,
        sessionId: session.id,
        tableId: session.table_id,
        isAuthenticated
      })
      console.groupEnd()
      
      // End performance monitoring
      endPerformanceMonitoring(perfId)
      debugUtils.info('Public session creation completed successfully', { 
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