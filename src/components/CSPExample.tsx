// src/components/CSPExample.tsx
'use client'

import { useCSPNonce, useScriptNonce, useStyleNonce } from '@/hooks/useCSPNonce'
import { useEffect, useState } from 'react'

/**
 * Example component demonstrating CSP nonce usage
 * This shows how to properly use nonces with inline styles and scripts
 */

export default function CSPExample() {
  const nonce = useCSPNonce()
  const scriptNonce = useScriptNonce()
  const styleNonce = useStyleNonce()
  const [dynamicContent, setDynamicContent] = useState('')

  useEffect(() => {
    // Example of dynamically adding a script with nonce
    if (scriptNonce && typeof window !== 'undefined') {
      const script = document.createElement('script')
      script.setAttribute('nonce', scriptNonce)
      script.textContent = `
        // This script will work with CSP because it has a nonce
        console.log('CSP-compliant script executed');
        window.cspTest = 'CSP is working correctly';
      `
      document.head.appendChild(script)
    }
  }, [scriptNonce])

  const handleAddDynamicStyle = () => {
    if (styleNonce && typeof window !== 'undefined') {
      const style = document.createElement('style')
      style.setAttribute('nonce', styleNonce)
      style.textContent = `
        .csp-dynamic-style {
          background-color: #f0f9ff;
          border: 2px solid #0ea5e9;
          padding: 1rem;
          border-radius: 0.5rem;
          margin: 1rem 0;
        }
      `
      document.head.appendChild(style)
      setDynamicContent('Dynamic style added with CSP nonce!')
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">CSP (Content Security Policy) Example</h1>
      
      {/* CSP Status */}
      <div className="bg-gray-100 p-4 rounded-lg mb-6">
        <h2 className="text-xl font-semibold mb-2">CSP Status</h2>
        <div className="space-y-2">
          <p><strong>Nonce Available:</strong> {nonce ? '✅ Yes' : '❌ No'}</p>
          <p><strong>Script Nonce:</strong> {scriptNonce ? `✅ ${scriptNonce.substring(0, 8)}...` : '❌ No'}</p>
          <p><strong>Style Nonce:</strong> {styleNonce ? `✅ ${styleNonce.substring(0, 8)}...` : '❌ No'}</p>
        </div>
      </div>

      {/* Inline Style Example */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Inline Style Example</h2>
        <p className="mb-2">This style uses a CSP nonce to be compliant:</p>
        {styleNonce && (
          <style nonce={styleNonce}>
            {`
              .csp-inline-style {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 1rem;
                border-radius: 0.5rem;
                text-align: center;
                font-weight: bold;
              }
            `}
          </style>
        )}
        <div className="csp-inline-style">
          This div uses inline styles with CSP nonce compliance
        </div>
      </div>

      {/* Dynamic Style Example */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Dynamic Style Example</h2>
        <button
          onClick={handleAddDynamicStyle}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Add Dynamic Style with Nonce
        </button>
        {dynamicContent && (
          <div className="csp-dynamic-style mt-4">
            {dynamicContent}
          </div>
        )}
      </div>

      {/* Script Example */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Script Example</h2>
        <p className="mb-2">A script with nonce was added to the page. Check the console for output.</p>
        <div className="bg-gray-100 p-4 rounded">
          <p><strong>Window CSP Test:</strong> {typeof window !== 'undefined' && (window as any).cspTest || 'Not available'}</p>
        </div>
      </div>

      {/* CSP Policy Information */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <h2 className="text-xl font-semibold mb-2">CSP Policy Information</h2>
        <div className="text-sm space-y-1">
          <p>✅ <strong>Scripts:</strong> Only allowed with nonce or from trusted sources</p>
          <p>✅ <strong>Styles:</strong> Only allowed with nonce or from trusted sources</p>
          <p>✅ <strong>Images:</strong> Allowed from self, data:, and blob: URLs</p>
          <p>✅ <strong>Connections:</strong> Only to self and configured external domains</p>
          <p>✅ <strong>Frames:</strong> Blocked in production</p>
          <p>✅ <strong>Objects:</strong> Blocked</p>
        </div>
      </div>

      {/* Security Benefits */}
      <div className="bg-green-50 p-4 rounded-lg mt-6">
        <h2 className="text-xl font-semibold mb-2">Security Benefits</h2>
        <ul className="list-disc list-inside space-y-1 text-sm">
          <li>Prevents XSS attacks by blocking unauthorized script execution</li>
          <li>Blocks inline styles and scripts unless they have a valid nonce</li>
          <li>Prevents data exfiltration through unauthorized connections</li>
          <li>Blocks malicious iframe embedding</li>
          <li>Enforces HTTPS connections</li>
          <li>Provides comprehensive security headers</li>
        </ul>
      </div>
    </div>
  )
}
