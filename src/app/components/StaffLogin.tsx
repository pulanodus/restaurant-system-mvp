'use client';

import { useState } from 'react';
import { User, LogIn, Smartphone } from 'lucide-react';

interface StaffMember {
  id: string;
  staffId: string;
  name: string;
  email?: string;
  role: string;
}

interface StaffLoginProps {
  onLogin: (staff: StaffMember, sessionId: string) => void;
}

export default function StaffLogin({ onLogin }: StaffLoginProps) {
  const [staffId, setStaffId] = useState('');
  const [deviceId, setDeviceId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffId.trim()) {
      setError('Please enter your Staff ID');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/staff/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          staffId: staffId.trim(),
          deviceId: deviceId.trim() || null
        }),
      });

      const data = await response.json();

      if (!error && data) {
        // Redirect to staff dashboard
        router.push('/staff/dashboard');
      } else {
        setError(data.error || 'Login failed');
      }
    } catch (error) {
      console.error('❌ Staff login error:', error);
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <User className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Staff Login</h1>
          <p className="text-gray-600">Enter your Staff ID to access the dashboard</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label htmlFor="staffId" className="block text-sm font-medium text-gray-700 mb-2">
              Staff ID
            </label>
            <div className="relative">
              <input
                type="text"
                id="staffId"
                value={staffId}
                onChange={(e) => setStaffId(e.target.value.toUpperCase())}
                placeholder="e.g., STAFF001, THABO001"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                disabled={isLoading}
              />
              <User className="absolute right-3 top-3.5 w-5 h-5 text-gray-400" />
            </div>
          </div>

          <div>
            <label htmlFor="deviceId" className="block text-sm font-medium text-gray-700 mb-2">
              Device ID (Optional)
            </label>
            <div className="relative">
              <input
                type="text"
                id="deviceId"
                value={deviceId}
                onChange={(e) => setDeviceId(e.target.value)}
                placeholder="e.g., iPhone-123, Tablet-456"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                disabled={isLoading}
              />
              <Smartphone className="absolute right-3 top-3.5 w-5 h-5 text-gray-400" />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Helps track which device you're using
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !staffId.trim()}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Logging in...</span>
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>Login</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-8 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-sm font-medium text-gray-900 mb-2">Sample Staff IDs:</h3>
          <div className="text-xs text-gray-600 space-y-1">
            <p><strong>STAFF001</strong> - Thabo Mthembu (Waiter)</p>
            <p><strong>STAFF002</strong> - Sarah Johnson (Waiter)</p>
            <p><strong>STAFF003</strong> - Mike Chen (Waiter)</p>
            <p><strong>STAFF004</strong> - Lisa Rodriguez (Manager)</p>
            <p><strong>STAFF005</strong> - Admin User (Admin)</p>
          </div>
        </div>
      </div>
    </div>
  );
}
