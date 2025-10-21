// src/components/SessionErrorBoundary.tsx
'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { debugErrorLog, trackError, isDebugMode } from '@/lib/debug'

interface SessionErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  errorId: string | null
  retryCount: number
  sessionId: string | null
  tableId: string | null
}

interface SessionErrorBoundaryProps {
  children: ReactNode
  sessionId?: string
  tableId?: string
  onError?: (error: Error, errorInfo: ErrorInfo, errorId: string) => void
  onSessionError?: (error: Error, sessionId: string | null, tableId: string | null) => void
  fallback?: ReactNode
}

class SessionErrorBoundary extends Component<SessionErrorBoundaryProps, SessionErrorBoundaryState> {
  private resetTimeoutId: number | null = null

  constructor(props: SessionErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: 0,
      sessionId: props.sessionId || null,
      tableId: props.tableId || null
    }
  }

  static getDerivedStateFromError(error: Error): Partial<SessionErrorBoundaryState> {
    const errorId = Math.random().toString(36).substring(2, 15)
    
    return {
      hasError: true,
      error,
      errorId,
      retryCount: 0
    }
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const { errorId, sessionId, tableId } = this.state
    const { onError, onSessionError } = this.props

    // Log error with our debug system
    debugErrorLog('Session error boundary caught error', {
      errorId,
      sessionId,
      tableId,
      componentStack: errorInfo.componentStack,
      errorBoundary: 'SessionErrorBoundary',
      timestamp: new Date().toISOString(),
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'Server',
      url: typeof window !== 'undefined' ? window.location.href : 'Server'
    })

    // Track error for analysis
    trackError(error, {
      errorId,
      sessionId,
      tableId,
      componentStack: errorInfo.componentStack,
      errorBoundary: 'SessionErrorBoundary',
      retryCount: this.state.retryCount,
      context: 'session_management'
    })

    // Update state with error info
    this.setState({
      errorInfo,
      retryCount: this.state.retryCount + 1
    })

    // Call custom error handlers
    if (onError && errorId) {
      onError(error, errorInfo, errorId)
    }

    if (onSessionError) {
      onSessionError(error, sessionId, tableId)
    }

    // Log to console in development
    if (isDebugMode()) {
      console.group(`🚨 Session Error Boundary [${errorId}]`)
      console.error('Error:', error)
      console.error('Error Info:', errorInfo)
      console.error('Session ID:', sessionId)
      console.error('Table ID:', tableId)
      console.error('Component Stack:', errorInfo.componentStack)
      console.error('Retry Count:', this.state.retryCount)
      console.groupEnd()
    }
  }

  override componentDidUpdate(prevProps: SessionErrorBoundaryProps): void {
    const { hasError } = this.state
    const { sessionId, tableId } = this.props

    // Reset error boundary if session or table ID changed
    if (hasError && (prevProps.sessionId !== sessionId || prevProps.tableId !== tableId)) {
      this.resetErrorBoundary()
    }

    // Update state with new session/table IDs
    if (prevProps.sessionId !== sessionId || prevProps.tableId !== tableId) {
      this.setState({
        sessionId: sessionId || null,
        tableId: tableId || null
      })
    }
  }

  override componentWillUnmount(): void {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId)
    }
  }

  resetErrorBoundary = (): void => {
    const { errorId } = this.state
    
    if (isDebugMode()) {
      // Resetting session error boundary [${errorId}] - Debug only
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

  handleSessionRestart = (): void => {
    const { sessionId, tableId } = this.state
    
    if (isDebugMode()) {
      // Restarting session [${sessionId}] for table [${tableId}] - Debug only
    }

    // Reset error boundary
    this.resetErrorBoundary()

    // Navigate to session creation page
    if (typeof window !== 'undefined') {
      window.location.href = `/scan/${tableId}`
    }
  }

  handleTableSelection = (): void => {
    if (isDebugMode()) {
      // Navigating to table selection - Debug only
    }

    // Reset error boundary
    this.resetErrorBoundary()

    // Navigate to table selection page
    if (typeof window !== 'undefined') {
      window.location.href = '/'
    }
  }

  override render(): ReactNode {
    const { hasError, error, errorInfo, errorId, retryCount, sessionId, tableId } = this.state
    const { children, fallback } = this.props

    if (hasError) {
      // Use custom fallback if provided
      if (fallback) {
        return fallback
      }

      // Use default session error display
      return (
        <SessionErrorDisplay
          error={error}
          errorInfo={errorInfo}
          errorId={errorId}
          sessionId={sessionId}
          tableId={tableId}
          retryCount={retryCount}
          onRetry={this.resetErrorBoundary}
          onRetryWithDelay={this.retryWithDelay}
          onSessionRestart={this.handleSessionRestart}
          onTableSelection={this.handleTableSelection}
        />
      )
    }

    return children
  }
}

// Session Error Display Component
interface SessionErrorDisplayProps {
  error: Error | null
  errorInfo: ErrorInfo | null
  errorId: string | null
  sessionId: string | null
  tableId: string | null
  retryCount: number
  onRetry: () => void
  onRetryWithDelay: (delay: number) => void
  onSessionRestart: () => void
  onTableSelection: () => void
}

function SessionErrorDisplay({
  error,
  errorInfo,
  errorId,
  sessionId,
  tableId,
  retryCount,
  onRetry,
  onRetryWithDelay,
  onSessionRestart,
  onTableSelection
}: SessionErrorDisplayProps): React.ReactElement {
  const [showDetails, setShowDetails] = React.useState(false)

  const handleCopyError = (): void => {
    const errorData = {
      errorId,
      sessionId,
      tableId,
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
        // Session error data copied to clipboard - Debug only
      })
      .catch((err) => {
        console.error('Failed to copy session error data:', err)
      })
  }

  return (
    <div className="session-error-boundary-container p-6 max-w-2xl mx-auto">
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center mb-4">
          <div className="flex-shrink-0">
            <svg className="h-8 w-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-lg font-medium text-red-800">
              Session Error
            </h3>
            <p className="text-sm text-red-600">
              Something went wrong with your session. Error ID: {errorId}
            </p>
          </div>
        </div>

        <div className="mb-4">
          <p className="text-sm text-red-700">
            {error?.message || 'An unexpected error occurred in the session'}
          </p>
          {retryCount > 0 && (
            <p className="text-xs text-red-600 mt-1">
              Retry attempt: {retryCount}
            </p>
          )}
        </div>

        {/* Session Information */}
        <div className="mb-4 p-3 bg-red-100 rounded-md">
          <h4 className="text-sm font-medium text-red-800 mb-2">Session Information</h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="font-medium text-red-700">Session ID:</span>
              <span className="ml-2 font-mono text-red-600">
                {sessionId || 'Not available'}
              </span>
            </div>
            <div>
              <span className="font-medium text-red-700">Table ID:</span>
              <span className="ml-2 font-mono text-red-600">
                {tableId || 'Not available'}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={onRetry}
            className="px-4 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            Try Again
          </button>
          <button
            onClick={() => onRetryWithDelay(1000)}
            className="px-4 py-2 bg-red-500 text-white text-sm rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-400"
          >
            Retry in 1s
          </button>
          {tableId && (
            <button
              onClick={onSessionRestart}
              className="px-4 py-2 bg-orange-600 text-white text-sm rounded-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              Restart Session
            </button>
          )}
          <button
            onClick={onTableSelection}
            className="px-4 py-2 style={{ backgroundColor: '#00d9ff' }} text-white text-sm rounded-md hover:style={{ backgroundColor: '#00d9ff' }} focus:outline-none focus:ring-2 focus:ring-2 focus:ring-opacity-50"
          >
            Select Table
          </button>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="px-4 py-2 bg-gray-500 text-white text-sm rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-400"
          >
            {showDetails ? 'Hide' : 'Show'} Details
          </button>
          <button
            onClick={handleCopyError}
            className="px-4 py-2 bg-purple-500 text-white text-sm rounded-md hover:bg-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-400"
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
                <span className="font-medium text-red-700">Session ID:</span>
                <span className="ml-2 font-mono text-red-600">{sessionId || 'Not available'}</span>
              </div>
              <div>
                <span className="font-medium text-red-700">Table ID:</span>
                <span className="ml-2 font-mono text-red-600">{tableId || 'Not available'}</span>
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

export default SessionErrorBoundary
