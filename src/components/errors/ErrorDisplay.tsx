// components/ui/ErrorDisplay.tsx
'use client'

// Type imports

interface ErrorDisplayProps {
  error: string | null
  errorDetails: any | null
  onDismiss: () => void
}

export function ErrorDisplay({ 
  error, 
  errorDetails, 
  onDismiss 
}: ErrorDisplayProps) {
  if (!error) return null

  return (
    <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h3 className="text-sm font-medium text-red-800">
            {error}
          </h3>
          
          {errorDetails && (
            <div className="mt-2 text-sm text-red-700">
              {errorDetails.code && (
                <p><strong>Code:</strong> {errorDetails.code}</p>
              )}
              {errorDetails.details && (
                <p><strong>Details:</strong> {errorDetails.details}</p>
              )}
              {errorDetails.hint && (
                <p><strong>Hint:</strong> {errorDetails.hint}</p>
              )}
              {errorDetails.statusCode && (
                <p><strong>Status:</strong> {errorDetails.statusCode}</p>
              )}
            </div>
          )}
        </div>
        
        <button
          type="button"
          className="ml-4 flex-shrink-0 text-red-600 hover:text-red-800"
          onClick={onDismiss}
        >
          <span className="sr-only">Dismiss</span>
          &times;
        </button>
      </div>
      
      {(errorDetails?.code === 'NETWORK_ERROR' || 
        errorDetails?.statusCode === 503) && (
        <div className="mt-4">
          <button
            type="button"
            className="px-3 py-1 bg-red-600 text-white text-sm rounded-md hover:bg-red-700"
            onClick={() => window.location.reload()}
          >
            Retry Connection
          </button>
        </div>
      )}
    </div>
  )
}
