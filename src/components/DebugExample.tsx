// src/components/DebugExample.tsx
'use client'

import React, { useState } from 'react'
import { 
  debugLog, 
  debugSessionLog, 
  debugDbLog, 
  debugErrorLog,
  debugValidationLog,
  debugNavLog,
  isDebugMode
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
    debugSessionLog('Session creation started', {
      tableId: tableId || 'table-123',
      userId: userId || 'user-456',
      timestamp: new Date().toISOString()
    })
  }

  const handleApiDebug = () => {
    debugLog('API request initiated', {
      body: { tableId, userId },
      headers: { 'Content-Type': 'application/json' }
    })
  }

  const handleDbDebug = () => {
    debugDbLog('Database operation started', {
      tableId: tableId || 'table-123',
      userId: userId || 'user-456',
      data: { status: 'active', started_at: new Date().toISOString() }
    })
  }

  const handleAuthDebug = () => {
    debugLog('Authentication attempt', {
      userId: userId || 'user-456',
      method: 'email',
      timestamp: new Date().toISOString()
    })
  }

  const handleErrorDebug = () => {
    const testError = new Error('Test error for debugging')
    debugErrorLog('Test error occurred', {
      context: 'debug-example',
      timestamp: new Date().toISOString()
    })
  }

  const handleValidationDebug = () => {
    debugValidationLog('Validation started', {
      tableId: tableId || 'table-123',
      userId: userId || 'user-456',
      checks: ['table_exists', 'user_authenticated', 'permissions']
    })
  }

  const handleNavDebug = () => {
    debugNavLog('Navigation initiated', {
      sessionId: sessionId || 'session-789',
      timestamp: new Date().toISOString()
    })
  }

  const handleDebugModeStatus = () => {
    const status = isDebugMode()
    debugLog('Debug mode status', status)
  }

  return (
    <div className="debug-example p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Debug Mode Example</h2>
      
      <div className="mb-6 p-4 bg-gray-100 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">Debug Mode Status</h3>
        <p className="text-sm text-gray-600 mb-2">
          Debug mode is: <span className={`font-bold ${isDebugMode() ? 'text-green-600' : 'text-red-600'}`}>
            {isDebugMode() ? 'ENABLED' : 'DISABLED'}
          </span>
        </p>
        <button 
          onClick={handleDebugModeStatus}
          className="px-4 py-2 style={{ backgroundColor: '#00d9ff' }} text-white rounded hover:style={{ backgroundColor: '#00d9ff' }}"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-2 focus:ring-opacity-50"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">User ID</label>
            <input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="user-456"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-2 focus:ring-opacity-50"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Session ID</label>
            <input
              type="text"
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
              placeholder="session-789"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-2 focus:ring-opacity-50"
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
              className="px-4 py-2 style={{ backgroundColor: '#00d9ff' }} text-white rounded hover:style={{ backgroundColor: '#00d9ff' }} text-left"
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

      <div className="mt-6 p-4 style={{ backgroundColor: '#f0fdff' }} border style={{ borderColor: '#ccf2ff' }} rounded-lg">
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
