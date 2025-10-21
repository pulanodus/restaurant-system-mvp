// src/components/ErrorBoundary.tsx
'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
// Simple debug logging
const debugErrorLog = (...args: any[]) => {
  if (process.env.NODE_ENV === 'development') {
    console.error('[DEBUG ERROR]', ...args);
  }
};

const trackError = (error: any, context?: any) => {
  if (process.env.NODE_ENV === 'development') {
    console.error('[TRACKED ERROR]', error, context);
  }
};

const isDebugMode = process.env.NODE_ENV === 'development';

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  errorId: string | null
  retryCount: number
}

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo, errorId: string) => void
  resetOnPropsChange?: boolean
  resetKeys?: Array<string | number>
  level?: 'page' | 'component' | 'session'
  context?: Record<string, unknown>
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private resetTimeoutId: number | null = null

  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: 0
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    const errorId = Math.random().toString(36).substring(2, 15)
    
    return {
      hasError: true,
      error,
      errorId,
      retryCount: 0
    }
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const { errorId } = this.state
    const { level = 'component', context = {} } = this.props

    // Log error with our debug system
    debugErrorLog('ERROR_BOUNDARY', 'React error boundary caught error', error, {
      errorId,
      level,
      context,
      componentStack: errorInfo.componentStack,
      errorBoundary: this.constructor.name,
      timestamp: new Date().toISOString(),
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'Server',
      url: typeof window !== 'undefined' ? window.location.href : 'Server'
    })

    // Track error for analysis
    trackError(error, {
      errorId,
      level,
      context,
      componentStack: errorInfo.componentStack,
      errorBoundary: this.constructor.name,
      retryCount: this.state.retryCount
    })

    // Update state with error info
    this.setState({
      errorInfo,
      retryCount: this.state.retryCount + 1
    })

    // Call custom error handler if provided
    if (this.props.onError && errorId) {
      this.props.onError(error, errorInfo, errorId)
    }

    // Log to console in development
    if (isDebugMode) {
      console.group(`🚨 Error Boundary [${errorId}]`)
      console.error('Error:', error)
      console.error('Error Info:', errorInfo)
      console.error('Component Stack:', errorInfo.componentStack)
      console.error('Error Boundary:', this.constructor.name)
      console.error('Level:', level)
      console.error('Context:', context)
      console.error('Retry Count:', this.state.retryCount)
      console.groupEnd()
    }
  }

  override componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    const { resetOnPropsChange = true, resetKeys = [] } = this.props
    const { hasError } = this.state

    // Reset error boundary if props changed and resetOnPropsChange is true
    if (hasError && resetOnPropsChange) {
      const hasResetKeyChanged = resetKeys.some((key, index) => 
        prevProps.resetKeys?.[index] !== key
      )

      if (hasResetKeyChanged) {
        this.resetErrorBoundary()
      }
    }
  }

  override componentWillUnmount(): void {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId)
    }
  }

  resetErrorBoundary = (): void => {
    const { errorId } = this.state
    
    if (isDebugMode) {
      // Resetting error boundary [${errorId}] - Debug only
    }

    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: 0
    })
  }

  retryWithDelay = (delay: number = 1000): void => {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId)
    }

    this.resetTimeoutId = window.setTimeout(() => {
      this.resetErrorBoundary()
    }, delay)
  }

  override render(): ReactNode {
    const { hasError, error, errorInfo, errorId, retryCount } = this.state
    const { children, fallback, level = 'component' } = this.props

    if (hasError) {
      // Use custom fallback if provided
      if (fallback) {
        return fallback
      }

      // Use default error display
      return (
        <ErrorDisplay
          error={error}
          errorInfo={errorInfo}
          errorId={errorId}
          level={level}
          retryCount={retryCount}
          onRetry={this.resetErrorBoundary}
          onRetryWithDelay={this.retryWithDelay}
        />
      )
    }

    return children
  }
}

// Error Display Component
interface ErrorDisplayProps {
  error: Error | null
  errorInfo: ErrorInfo | null
  errorId: string | null
  level: string
  retryCount: number
  onRetry: () => void
  onRetryWithDelay: (delay: number) => void
}

function ErrorDisplay({
  error,
  errorInfo,
  errorId,
  level,
  retryCount,
  onRetry,
  onRetryWithDelay
}: ErrorDisplayProps): React.ReactElement {
  const [showDetails, setShowDetails] = React.useState(false)

  const handleRetry = (): void => {
    onRetry()
  }

  const handleRetryWithDelay = (): void => {
    onRetryWithDelay(1000)
  }

  const handleCopyError = (): void => {
    const errorData = {
      errorId,
      level,
      retryCount,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : null,
      errorInfo: errorInfo ? {
        componentStack: errorInfo.componentStack
      } : null,
      timestamp: new Date().toISOString(),
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'Server',
      url: typeof window !== 'undefined' ? window.location.href : 'Server'
    }

    navigator.clipboard.writeText(JSON.stringify(errorData, null, 2))
      .then(() => {
        // Error data copied to clipboard - Debug only
      })
      .catch((err) => {
        console.error('Failed to copy error data:', err)
      })
  }

  return (
    <div className="error-boundary-container p-6 max-w-2xl mx-auto">
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center mb-4">
          <div className="flex-shrink-0">
            <svg className="h-8 w-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-lg font-medium text-red-800">
              {level === 'page' ? 'Page Error' : 
               level === 'session' ? 'Session Error' : 
               'Component Error'}
            </h3>
            <p className="text-sm text-red-600">
              Something went wrong. Error ID: {errorId}
            </p>
          </div>
        </div>

        <div className="mb-4">
          <p className="text-sm text-red-700">
            {error?.message || 'An unexpected error occurred'}
          </p>
          {retryCount > 0 && (
            <p className="text-xs text-red-600 mt-1">
              Retry attempt: {retryCount}
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={handleRetry}
            className="px-4 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            Try Again
          </button>
          <button
            onClick={handleRetryWithDelay}
            className="px-4 py-2 bg-red-500 text-white text-sm rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-400"
          >
            Retry in 1s
          </button>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="px-4 py-2 bg-gray-500 text-white text-sm rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-400"
          >
            {showDetails ? 'Hide' : 'Show'} Details
          </button>
          <button
            onClick={handleCopyError}
            className="px-4 py-2 style={{ backgroundColor: '#00d9ff' }} text-white text-sm rounded-md hover:style={{ backgroundColor: '#00d9ff' }} focus:outline-none focus:ring-2 focus:ring-2 focus:ring-opacity-50"
          >
            Copy Error
          </button>
        </div>

        {showDetails && (
          <div className="mt-4 p-4 bg-red-100 rounded-md">
            <h4 className="text-sm font-medium text-red-800 mb-2">Error Details</h4>
            <div className="space-y-2 text-xs">
              <div>
                <span className="font-medium text-red-700">Error ID:</span>
                <span className="ml-2 font-mono text-red-600">{errorId}</span>
              </div>
              <div>
                <span className="font-medium text-red-700">Level:</span>
                <span className="ml-2 text-red-600">{level}</span>
              </div>
              <div>
                <span className="font-medium text-red-700">Retry Count:</span>
                <span className="ml-2 text-red-600">{retryCount}</span>
              </div>
              {error && (
                <div>
                  <span className="font-medium text-red-700">Error Name:</span>
                  <span className="ml-2 text-red-600">{error.name}</span>
                </div>
              )}
              {error && (
                <div>
                  <span className="font-medium text-red-700">Error Message:</span>
                  <span className="ml-2 text-red-600">{error.message}</span>
                </div>
              )}
              {error?.stack && (
                <div>
                  <span className="font-medium text-red-700">Stack Trace:</span>
                  <pre className="mt-1 text-xs text-red-600 bg-red-50 p-2 rounded overflow-auto max-h-32">
                    {error.stack}
                  </pre>
                </div>
              )}
              {errorInfo?.componentStack && (
                <div>
                  <span className="font-medium text-red-700">Component Stack:</span>
                  <pre className="mt-1 text-xs text-red-600 bg-red-50 p-2 rounded overflow-auto max-h-32">
                    {errorInfo.componentStack}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Specialized Error Boundaries
export class SessionErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override render(): React.ReactElement {
    return (
      <ErrorBoundary
        {...this.props}
        level="session"
        context={{
          ...this.props.context,
          boundaryType: 'SessionErrorBoundary'
        }}
      />
    )
  }
}

export class PageErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override render(): React.ReactElement {
    return (
      <ErrorBoundary
        {...this.props}
        level="page"
        context={{
          ...this.props.context,
          boundaryType: 'PageErrorBoundary'
        }}
      />
    )
  }
}

export class ComponentErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override render(): React.ReactElement {
    return (
      <ErrorBoundary
        {...this.props}
        level="component"
        context={{
          ...this.props.context,
          boundaryType: 'ComponentErrorBoundary'
        }}
      />
    )
  }
}

// Higher-order component for easy wrapping
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  )

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`
  
  return WrappedComponent
}

// Hook for error boundary context
export function useErrorBoundary() {
  const [error, setError] = React.useState<Error | null>(null)

  const resetError = React.useCallback(() => {
    setError(null)
  }, [])

  const captureError = React.useCallback((error: Error) => {
    setError(error)
  }, [])

  React.useEffect(() => {
    if (error) {
      throw error
    }
  }, [error])

  return { captureError, resetError }
}

export default ErrorBoundary
