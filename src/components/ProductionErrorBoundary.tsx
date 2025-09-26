// src/components/ProductionErrorBoundary.tsx
'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { 
  handleError,
  ErrorSeverity,
  ErrorContext
} from '@/lib/error-handling'

/**
 * Production Error Boundary Component
 * Catches React errors and handles them with production error handling
 */

interface ProductionErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  level?: 'page' | 'component' | 'section'
  context?: {
    component?: string
    page?: string
    section?: string
    userId?: string
    sessionId?: string
  }
}

interface ProductionErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorId: string | null
  userMessage: string
  shouldRetry: boolean
  retryCount: number
}

export class ProductionErrorBoundary extends Component<
  ProductionErrorBoundaryProps,
  ProductionErrorBoundaryState
> {
  private maxRetries = 3

  constructor(props: ProductionErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorId: null,
      userMessage: 'Something went wrong. Please try again.',
      shouldRetry: false,
      retryCount: 0
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ProductionErrorBoundaryState> {
    return {
      hasError: true,
      error,
      errorId: `error-${Date.now()}`
    }
  }

  override async componentDidCatch(error: Error, errorInfo: ErrorInfo): Promise<void> {
    const { onError, level = 'component', context = {} } = this.props
    
    // Call custom error handler if provided
    if (onError) {
      onError(error, errorInfo)
    }

    // Create production error context
    const errorContext = {
      operation: `React Error Boundary - ${level}`,
      userId: context.userId || '',
      sessionId: context.sessionId || '',
      requestId: this.state.errorId || `error-${Date.now()}`,
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : '',
      url: typeof window !== 'undefined' ? window.location.href : '',
      method: 'CLIENT_ERROR'
    }

    try {
      // Handle the error with production error handling
      const appError = await handleError(
        error,
        errorContext
      )
      const userMessage = 'An error occurred'
      const errorId = this.state.errorId || `error-${Date.now()}`
      const shouldRetry = false

      // Update state with user-friendly message
      this.setState({
        errorId,
        userMessage,
        shouldRetry
      })

      // Create additional production error for React-specific context
      const productionError = {
        ...errorContext,
        operation: `React Error Boundary - ${level} - ${context.component || 'Unknown Component'}`
      }

      // Add React-specific context
      const enhancedProductionError = {
        ...productionError,
        technical: {
          reactErrorInfo: {
            componentStack: errorInfo.componentStack
          }
        },
        context: {
          reactContext: {
            level,
            component: context.component,
            page: context.page,
            section: context.section
          }
        }
      }

      // Log the error
      // Log the error using the available error handling
      console.error('Production Error Boundary:', enhancedProductionError)

    } catch (loggingError) {
      // Fallback error handling
      console.error('Failed to handle production error:', loggingError)
      console.error('Original React error:', error)
      console.error('Error info:', errorInfo)
    }
  }

  handleRetry = async (): Promise<void> => {
    const { retryCount } = this.state
    
    if (retryCount >= this.maxRetries) {
      this.setState({
        userMessage: 'Unable to recover. Please refresh the page.',
        shouldRetry: false
      })
      return
    }

    try {
      // Reset error state
      this.setState({
        hasError: false,
        error: null,
        errorId: null,
        userMessage: 'Something went wrong. Please try again.',
        shouldRetry: false,
        retryCount: retryCount + 1
      })
    } catch (retryError) {
      console.error('Retry failed:', retryError)
      this.setState({
        userMessage: 'Retry failed. Please refresh the page.',
        shouldRetry: false
      })
    }
  }

  handleRefresh = (): void => {
    if (typeof window !== 'undefined') {
      window.location.reload()
    }
  }

  override render(): ReactNode {
    const { hasError, userMessage, shouldRetry, retryCount } = this.state
    const { children, fallback, level = 'component' } = this.props

    if (hasError) {
      // Use custom fallback if provided
      if (fallback) {
        return fallback
      }

      // Render appropriate error UI based on level
      return (
        <div className={`production-error-boundary production-error-boundary--${level}`}>
          <div className="production-error-content">
            <div className="error-icon">
              {level === 'page' ? '🚨' : level === 'section' ? '⚠️' : '❌'}
            </div>
            
            <h2 className="error-title">
              {level === 'page' ? 'Page Error' : 
               level === 'section' ? 'Section Error' : 'Component Error'}
            </h2>
            
            <p className="error-message">{userMessage}</p>
            
            <div className="error-actions">
              {shouldRetry && retryCount < this.maxRetries && (
                <button
                  onClick={this.handleRetry}
                  className="retry-button"
                  type="button"
                >
                  Try Again ({this.maxRetries - retryCount} attempts left)
                </button>
              )}
              
              <button
                onClick={this.handleRefresh}
                className="refresh-button"
                type="button"
              >
                Refresh Page
              </button>
            </div>
            
            {process.env.NODE_ENV === 'development' && (
              <details className="error-details">
                <summary>Technical Details (Development Only)</summary>
                <pre className="error-stack">
                  {this.state.error?.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      )
    }

    return children
  }
}

// Higher-order component for easy wrapping
export function withProductionErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options: {
    level?: 'page' | 'component' | 'section'
    context?: {
      component?: string
      page?: string
      section?: string
    }
    fallback?: ReactNode
  } = {}
) {
  const { level = 'component', context, fallback } = options

  return function ProductionErrorBoundaryWrapper(props: P) {
    return (
      <ProductionErrorBoundary
        level={level}
        context={context || {}}
        fallback={fallback}
      >
        <WrappedComponent {...props} />
      </ProductionErrorBoundary>
    )
  }
}

// Hook for programmatic error handling
export function useProductionErrorHandler() {
  const handleError = async (
    error: unknown,
    context: {
      operation: string
      component?: string
      userId?: string
      sessionId?: string
    }
  ): Promise<{
    userMessage: string
    errorId: string
    shouldRetry: boolean
  }> => {
    const errorContext = {
      operation: context.operation,
      userId: context.userId || '',
      sessionId: context.sessionId || '',
      requestId: `error-${Date.now()}`,
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : '',
      url: typeof window !== 'undefined' ? window.location.href : '',
      method: 'CLIENT_ERROR'
    }

    const appError = await handleError(
      error,
      errorContext
    )
    const userMessage = 'An error occurred'
    const errorId = `error-${Date.now()}`
    const shouldRetry = false

    return {
      userMessage,
      errorId,
      shouldRetry
    }
  }

  return { handleError }
}

// Default styles for the error boundary
export const productionErrorBoundaryStyles = `
  .production-error-boundary {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 200px;
    padding: 2rem;
    background-color: #fef2f2;
    border: 1px solid #fecaca;
    border-radius: 0.5rem;
    margin: 1rem 0;
  }

  .production-error-boundary--page {
    min-height: 50vh;
    background-color: #fef7f7;
    border-color: #fed7d7;
  }

  .production-error-boundary--section {
    min-height: 300px;
    background-color: #fffbeb;
    border-color: #fed7aa;
  }

  .production-error-content {
    text-align: center;
    max-width: 500px;
  }

  .error-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
  }

  .error-title {
    font-size: 1.5rem;
    font-weight: 600;
    color: #dc2626;
    margin-bottom: 0.5rem;
  }

  .error-message {
    color: #6b7280;
    margin-bottom: 1.5rem;
    line-height: 1.5;
  }

  .error-actions {
    display: flex;
    gap: 1rem;
    justify-content: center;
    flex-wrap: wrap;
  }

  .retry-button,
  .refresh-button {
    padding: 0.5rem 1rem;
    border-radius: 0.375rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .retry-button {
    background-color: #3b82f6;
    color: white;
    border: none;
  }

  .retry-button:hover {
    background-color: #2563eb;
  }

  .refresh-button {
    background-color: #6b7280;
    color: white;
    border: none;
  }

  .refresh-button:hover {
    background-color: #4b5563;
  }

  .error-details {
    margin-top: 1.5rem;
    text-align: left;
  }

  .error-details summary {
    cursor: pointer;
    font-weight: 500;
    color: #6b7280;
    margin-bottom: 0.5rem;
  }

  .error-stack {
    background-color: #f3f4f6;
    padding: 1rem;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    overflow-x: auto;
    white-space: pre-wrap;
    word-break: break-all;
  }
`
