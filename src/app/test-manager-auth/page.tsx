'use client';

import { useState } from 'react';
import { User, Lock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface AuthResult {
  success: boolean;
  manager?: {
    id: string;
    username: string;
    email: string;
    fullName: string;
    role: string;
    restaurantId: string;
  };
  error?: string;
  timestamp?: string;
}

export default function TestManagerAuth() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AuthResult | null>(null);

  const testAuthentication = async () => {
    if (!username.trim() || !password.trim()) {
      alert('Please enter both username and password');
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      // Testing authentication

      const response = await fetch('/api/manager/authenticate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: username.trim(),
          password: password.trim()
        }),
      });

      const data = await response.json();

      // Response received: {
        status: response.status,
        success: data.success,
        hasManager: !!data.manager
      });

      setResult(data);

    } catch (error) {
      console.error('🧪 Authentication test error:', error);
      setResult({
        success: false,
        error: 'Network error: ' + (error instanceof Error ? error.message : 'Unknown error')
      });
    } finally {
      setIsLoading(false);
    }
  };

  const clearForm = () => {
    setUsername('');
    setPassword('');
    setResult(null);
  };

  const quickFillCredentials = () => {
    setUsername('admin');
    setPassword('admin123');
    setResult(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <Lock className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Manager Authentication Test
          </h1>
          <p className="text-gray-600">
            Test the new secure username/password authentication
          </p>
        </div>

        {/* Authentication Form */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Username
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter manager username"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter manager password"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  onKeyPress={(e) => e.key === 'Enter' && testAuthentication()}
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={testAuthentication}
                disabled={isLoading}
                className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
                  isLoading
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                    Testing...
                  </div>
                ) : (
                  'Test Authentication'
                )}
              </button>

              <button
                onClick={clearForm}
                disabled={isLoading}
                className="px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Clear
              </button>
            </div>

            <button
              onClick={quickFillCredentials}
              disabled={isLoading}
              className="w-full py-2 px-4 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
            >
              Quick Fill: Test Credentials (admin/admin123)
            </button>
          </div>
        </div>

        {/* Result Display */}
        {result && (
          <div className={`rounded-xl shadow-lg p-6 ${
            result.success
              ? 'bg-green-50 border border-green-200'
              : 'bg-red-50 border border-red-200'
          }`}>
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                {result.success ? (
                  <CheckCircle className="w-6 h-6 text-green-600" />
                ) : (
                  <XCircle className="w-6 h-6 text-red-600" />
                )}
              </div>

              <div className="flex-1">
                <h3 className={`text-lg font-medium ${
                  result.success ? 'text-green-900' : 'text-red-900'
                }`}>
                  {result.success ? '✅ Authentication Successful!' : '❌ Authentication Failed'}
                </h3>

                {result.success && result.manager ? (
                  <div className="mt-3 space-y-2">
                    <div className="bg-white/60 rounded-lg p-3">
                      <h4 className="font-medium text-green-900 mb-2">Manager Details:</h4>
                      <div className="text-sm space-y-1">
                        <div><strong>ID:</strong> {result.manager.id}</div>
                        <div><strong>Username:</strong> {result.manager.username}</div>
                        <div><strong>Name:</strong> {result.manager.fullName}</div>
                        <div><strong>Email:</strong> {result.manager.email || 'Not provided'}</div>
                        <div><strong>Role:</strong>
                          <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                            {result.manager.role}
                          </span>
                        </div>
                      </div>
                    </div>
                    {result.timestamp && (
                      <div className="text-xs text-green-600">
                        Authenticated at: {new Date(result.timestamp).toLocaleString()}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="mt-2">
                    <p className="text-red-800 text-sm">
                      {result.error || 'Authentication failed for unknown reason'}
                    </p>
                    {result.timestamp && (
                      <div className="text-xs text-red-600 mt-1">
                        Failed at: {new Date(result.timestamp).toLocaleString()}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900">Security Upgrade Complete</h4>
              <p className="text-sm text-blue-800 mt-1">
                The hardcoded PIN authentication has been replaced with secure database-backed
                username/password authentication using bcrypt password hashing.
              </p>
              <div className="mt-3 text-xs text-blue-700">
                <div><strong>Test Credentials:</strong></div>
                <div>• Username: admin</div>
                <div>• Password: admin123</div>
              </div>
            </div>
          </div>
        </div>

        {/* Old vs New Comparison */}
        <div className="bg-gray-100 rounded-lg p-4 mt-6">
          <h4 className="font-medium text-gray-900 mb-3">What Changed:</h4>
          <div className="space-y-2 text-sm">
            <div className="flex items-center space-x-2">
              <XCircle className="w-4 h-4 text-red-500" />
              <span className="text-red-700">OLD: Hardcoded PINs ['1234', '9999', 'admin']</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-green-700">NEW: Database-stored credentials with bcrypt hashing</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-green-700">NEW: Account lockout after 5 failed attempts</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-green-700">NEW: Comprehensive input validation</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}