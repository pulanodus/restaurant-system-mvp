// src/hooks/useProductionErrorHandler.ts
'use client'

import { useState, useCallback } from 'react'
import { 
  handleProductionError, 
  generateErrorId,
  // ErrorSeverity,
  // ErrorCategory
} from '@/lib/production-error-handling'

/**
 * Production Error Handler Hook
 * Provides client-side error handling with user-friendly messages
 */

export interface ErrorState {
  error: string | null
  errorId: string | null
  isLoading: boolean
  shouldRetry: boolean
  retryCount: number
}

export interface ErrorHandlers {
  setError: (error: string | null) => void
  setIsLoading: (loading: boolean) => void
  clearError: () => void
  handleError: (error: unknown, context: ErrorContext) => Promise<void>
  retry: () => Promise<void>
}

export interface ErrorContext {
  operation: string
  component?: string
  userId?: string
  sessionId?: string
  data?: unknown
}

export interface UseProductionErrorHandlerOptions {
  maxRetries?: number
  onError?: (error: string, errorId: string) => void
  onRetry?: (retryCount: number) => void
  showToast?: boolean
  toastDuration?: number
}

export function useProductionErrorHandler(
  options: UseProductionErrorHandlerOptions = {}
): [ErrorState, ErrorHandlers] {
  const {
    maxRetries = 3,
    onError,
    onRetry,
    showToast = true,
    toastDuration = 5000
  } = options

  const [errorState, setErrorState] = useState<ErrorState>({
    error: null,
    errorId: null,
    isLoading: false,
    shouldRetry: false,
    retryCount: 0
  })

  const setError = useCallback((error: string | null) => {
    setErrorState(prev => ({
      ...prev,
      error,
      errorId: error ? generateErrorId() : null,
      shouldRetry: false
    }))
  }, [])

  const setIsLoading = useCallback((loading: boolean) => {
    setErrorState(prev => ({
      ...prev,
      isLoading: loading
    }))
  }, [])

  const clearError = useCallback(() => {
    setErrorState({
      error: null,
      errorId: null,
      isLoading: false,
      shouldRetry: false,
      retryCount: 0
    })
  }, [])

  const handleError = useCallback(async (
    error: unknown,
    context: ErrorContext
  ) => {
    try {
      const errorContext = {
        operation: context.operation,
        userId: context.userId || '',
        sessionId: context.sessionId || '',
        requestId: generateErrorId(),
        userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : '',
        url: typeof window !== 'undefined' ? window.location.href : '',
        method: 'CLIENT_ERROR'
      }

      const { userMessage, errorId, shouldRetry } = await handleProductionError(
        error,
        errorContext
      )

      setErrorState(prev => ({
        ...prev,
        error: userMessage,
        errorId,
        shouldRetry,
        isLoading: false
      }))

      // Call custom error handler
      if (onError) {
        onError(userMessage, errorId)
      }

      // Show toast notification
      if (showToast) {
        showErrorToast(userMessage, toastDuration)
      }

    } catch (handlingError) {
      console.error('Failed to handle production error:', handlingError)
      console.error('Original error:', error)

      // Fallback error handling
      setErrorState(prev => ({
        ...prev,
        error: 'An unexpected error occurred. Please try again.',
        errorId: generateErrorId(),
        shouldRetry: false,
        isLoading: false
      }))
    }
  }, [onError, showToast, toastDuration])

  const retry = useCallback(async () => {
    if (errorState.retryCount >= maxRetries) {
      setErrorState(prev => ({
        ...prev,
        error: 'Unable to recover. Please refresh the page.',
        shouldRetry: false
      }))
      return
    }

    setErrorState(prev => ({
      ...prev,
      retryCount: prev.retryCount + 1,
      isLoading: true,
      error: null,
      errorId: null
    }))

    if (onRetry) {
      onRetry(errorState.retryCount + 1)
    }
  }, [errorState.retryCount, maxRetries, onRetry])

  const handlers: ErrorHandlers = {
    setError,
    setIsLoading,
    clearError,
    handleError,
    retry
  }

  return [errorState, handlers]
}

/**
 * Show error toast notification
 */
function showErrorToast(message: string, duration: number): void {
  // Create toast element
  const toast = document.createElement('div')
  toast.className = 'production-error-toast'
  toast.textContent = message
  
  // Add styles
  Object.assign(toast.style, {
    position: 'fixed',
    top: '20px',
    right: '20px',
    backgroundColor: '#dc2626',
    color: 'white',
    padding: '12px 16px',
    borderRadius: '6px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    zIndex: '9999',
    maxWidth: '400px',
    wordWrap: 'break-word',
    fontSize: '14px',
    fontWeight: '500',
    opacity: '0',
    transform: 'translateX(100%)',
    transition: 'all 0.3s ease-in-out'
  })

  // Add to DOM
  document.body.appendChild(toast)

  // Animate in
  requestAnimationFrame(() => {
    toast.style.opacity = '1'
    toast.style.transform = 'translateX(0)'
  })

  // Remove after duration
  setTimeout(() => {
    toast.style.opacity = '0'
    toast.style.transform = 'translateX(100%)'
    
    setTimeout(() => {
      if (document.body.contains(toast)) {
        document.body.removeChild(toast)
      }
    }, 300)
  }, duration)
}

/**
 * Hook for handling async operations with error handling
 */
export function useAsyncOperation<T>(
  operation: () => Promise<T>,
  options: UseProductionErrorHandlerOptions = {}
) {
  const [errorState, errorHandlers] = useProductionErrorHandler(options)
  const [data, setData] = useState<T | null>(null)

  const execute = useCallback(async (context: ErrorContext) => {
    try {
      errorHandlers.setIsLoading(true)
      errorHandlers.clearError()
      
      const result = await operation()
      setData(result)
      return result
    } catch (error) {
      await errorHandlers.handleError(error, context)
      throw error
    } finally {
      errorHandlers.setIsLoading(false)
    }
  }, [operation, errorHandlers])

  const retry = useCallback(async (context: ErrorContext) => {
    await errorHandlers.retry()
    return execute(context)
  }, [execute, errorHandlers])

  return {
    data,
    error: errorState.error,
    errorId: errorState.errorId,
    isLoading: errorState.isLoading,
    shouldRetry: errorState.shouldRetry,
    retryCount: errorState.retryCount,
    execute,
    retry,
    clearError: errorHandlers.clearError
  }
}

/**
 * Hook for handling form submissions with error handling
 */
export function useFormErrorHandler(
  options: UseProductionErrorHandlerOptions = {}
) {
  const [errorState, errorHandlers] = useProductionErrorHandler(options)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = useCallback(async (
    submitFn: () => Promise<void>,
    context: ErrorContext
  ) => {
    try {
      setIsSubmitting(true)
      errorHandlers.clearError()
      
      await submitFn()
    } catch (error) {
      await errorHandlers.handleError(error, context)
    } finally {
      setIsSubmitting(false)
    }
  }, [errorHandlers])

  return {
    error: errorState.error,
    errorId: errorState.errorId,
    isSubmitting,
    shouldRetry: errorState.shouldRetry,
    retryCount: errorState.retryCount,
    handleSubmit,
    clearError: errorHandlers.clearError,
    retry: errorHandlers.retry
  }
}

/**
 * Hook for handling API calls with error handling
 */
export function useApiErrorHandler(
  options: UseProductionErrorHandlerOptions = {}
) {
  const [errorState, errorHandlers] = useProductionErrorHandler(options)

  const handleApiCall = useCallback(async <T>(
    apiCall: () => Promise<T>,
    context: ErrorContext
  ): Promise<T | null> => {
    try {
      errorHandlers.setIsLoading(true)
      errorHandlers.clearError()
      
      const result = await apiCall()
      return result
    } catch (error) {
      await errorHandlers.handleError(error, context)
      return null
    } finally {
      errorHandlers.setIsLoading(false)
    }
  }, [errorHandlers])

  return {
    error: errorState.error,
    errorId: errorState.errorId,
    isLoading: errorState.isLoading,
    shouldRetry: errorState.shouldRetry,
    retryCount: errorState.retryCount,
    handleApiCall,
    clearError: errorHandlers.clearError,
    retry: errorHandlers.retry
  }
}
