// components/TableOptions.tsx
'use client'

import { useState } from 'react'

// Custom hooks
import { useSessionManagement } from '@/hooks/useSessionManagement'

// UI components
import { ErrorDisplay } from '@/components/errors'

// Types
import { TableOptionsProps } from '@/types/database'

export default function TableOptions({
  tableId,
  sessionId,
  isNew,
  tableNumber,
  startedByName
}: TableOptionsProps) {
  const { isLoading, error, session, createPublicSession, joinSession, clearError } = useSessionManagement()
  const [showNameInput, setShowNameInput] = useState(false)
  const [guestName, setGuestName] = useState('')

  const handleStartNewSession = () => {
    // Show name input instead of directly creating session
    setShowNameInput(true)
  }

  const handleCreateSessionWithName = async () => {
    if (!guestName.trim()) {
      return
    }
    
    try {
      // Create session with the provided name
      await createPublicSession(tableId, guestName.trim())
    } catch (error) {
      console.error('Failed to create public session:', error)
    }
  }

  const handleJoinSession = async () => {
    if (sessionId) {
      try {
        await joinSession(sessionId)
      } catch (error) {
        console.error('Failed to join session:', error)
      }
    }
  }

  const handleBackToOptions = () => {
    setShowNameInput(false)
    setGuestName('')
  }

  return (
    <div className="max-w-md mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-gray-800 text-center">Welcome to Table {tableNumber || tableId}</h2>
      
      <ErrorDisplay 
        error={error}
        errorDetails={null}
        onDismiss={clearError}
      />
      
      {showNameInput ? (
        // Name input flow for new sessions
        <div className="space-y-6">
          <div>
            <label htmlFor="guestName" className="block text-lg font-semibold text-gray-800 mb-3">
              What&apos;s your name?
            </label>
            <input
              id="guestName"
              type="text"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder="Enter your name"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none text-gray-800 placeholder-gray-500"
              style={{ 
                '--focus-ring-color': '#00d9ff',
                '--focus-border-color': '#00d9ff'
              } as any}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#00d9ff';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0, 217, 255, 0.1)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#d1d5db';
                e.currentTarget.style.boxShadow = 'none';
              }}
              autoFocus
            />
          </div>
          
          <div className="flex space-x-4">
            <button
              onClick={handleBackToOptions}
              disabled={isLoading}
              className="flex-1 py-3 px-4 bg-gray-500 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
            >
              Back
            </button>
            <button
              onClick={handleCreateSessionWithName}
              disabled={isLoading || !guestName.trim()}
              className="flex-1 py-3 px-4 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
              style={{ backgroundColor: '#00d9ff', '--hover-color': '#00c4e6' } as any}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#00c4e6'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#00d9ff'}
            >
              {isLoading ? 'Creating...' : 'Continue'}
            </button>
          </div>
        </div>
      ) : (
        // Main options flow
        <div className="space-y-4">
          {isNew ? (
            // No active session - show start new session option
            <button
              onClick={handleStartNewSession}
              disabled={isLoading}
              className="w-full py-4 px-6 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-lg transition-colors shadow-md"
              style={{ backgroundColor: '#00d9ff' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#00c4e6'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#00d9ff'}
            >
              {isLoading ? 'Creating Session...' : 'Start New Session'}
            </button>
          ) : (
            // Active session exists - show join option
            <div className="space-y-4">
              <div className="p-4 bg-yellow-50 border-2 border-yellow-300 rounded-lg">
                <p className="text-base font-semibold text-yellow-800 mb-1">
                  Session in progress
                </p>
                <p className="text-sm text-yellow-700">
                  Started by: <span className="font-medium">{startedByName || 'Unknown'}</span>
                </p>
              </div>
              
              <button
                onClick={handleJoinSession}
                disabled={isLoading}
                className="w-full py-4 px-6 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-lg transition-colors shadow-md"
                style={{ backgroundColor: '#00d9ff' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#00c4e6'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#00d9ff'}
              >
                {isLoading ? 'Joining Session...' : 'Join Existing Session'}
              </button>
            </div>
          )}
        </div>
      )}
      
      {/* Debug section for development */}
      {process.env.NODE_ENV === 'development' && error && (
        <details className="mt-4 p-2 bg-gray-100 rounded-md text-xs">
          <summary className="cursor-pointer font-medium">Debug Info</summary>
          <pre className="mt-2 whitespace-pre-wrap">
            {JSON.stringify({ error, session, isNew, sessionId, startedByName }, null, 2)}
          </pre>
        </details>
      )}
    </div>
  )
}
