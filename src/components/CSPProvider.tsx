// src/components/CSPProvider.tsx
'use client'

import { useEffect } from 'react'

/**
 * CSP Provider component that sets up the CSP nonce meta tag
 * This component runs on the client side to make the nonce available
 */

export default function CSPProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Get nonce from response headers
    const getNonceFromHeaders = async () => {
      try {
        const response = await fetch('/api/health/quick', { method: 'HEAD' })
        const nonce = response.headers.get('x-csp-nonce')
        
        if (nonce) {
          // Set nonce in meta tag for easy access
          let nonceMeta = document.querySelector('meta[name="csp-nonce"]')
          if (!nonceMeta) {
            nonceMeta = document.createElement('meta')
            nonceMeta.setAttribute('name', 'csp-nonce')
            document.head.appendChild(nonceMeta)
          }
          nonceMeta.setAttribute('content', nonce)
        }
      } catch (error) {
        console.warn('Could not retrieve CSP nonce:', error)
      }
    }

    getNonceFromHeaders()
  }, [])

  return <>{children}</>
}
